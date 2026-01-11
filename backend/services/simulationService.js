const weatherService = require('./weatherService');
const solarService = require('./solarService');
const constants = require('../config/constants');
const marketService = require('./marketService'); // Assuming this exists or we use constants

class SimulationService {
    
    // ==========================================
    // 1. HELPERS MATEMÁTICOS
    // ==========================================

    /**
     * Función Gamma de Lanczos para aproximación
     */
    gamma(z) {
        const g = 7;
        const p = [
            0.99999999999980993, 676.5203681218851, -1259.1392167224028,
            771.32342877765313, -176.61502916214059, 12.507343278686905,
            -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7
        ];
        if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * this.gamma(1 - z));
        z -= 1;
        let x = p[0];
        for (let i = 1; i < g + 2; i++) x += p[i] / (z + i);
        let t = z + g + 0.5;
        return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
    }

    /**
     * Factor de corrección por orientación e inclinación
     */
    calculateOrientationFactor(tilt, azimuth) {
        const OPTIMAL_TILT = constants.SOLAR.OPTIMAL_ANGLE || 35;
        const OPTIMAL_AZIMUTH = constants.SOLAR.OPTIMAL_ASPECT || 0; // 0 = Sur en backend config? Confirmar
        // Asumimos 0=Sur para backend config si es la norma, o 180 si es PVGIS.
        // En frontend era 180 Sur. Ajustamos si es necesario.
        // Unificar criterio: Azimuth Input viene del usuario.
        
        // Coeficientes de pérdida simplificados
        const TILT_LOSS_FACTOR = 0.00012; 
        const AZIMUTH_LOSS_FACTOR = 0.00005;

        // Penalización simple parabólica
        const loss = 1 - (TILT_LOSS_FACTOR * Math.pow(tilt - OPTIMAL_TILT, 2)) - (AZIMUTH_LOSS_FACTOR * Math.pow(azimuth - OPTIMAL_AZIMUTH, 2));
        return Math.max(0.6, Math.min(1.0, loss));
    }

    /**
     * Perfil de viento logarítmico (Ley de Hellmann)
     */
    adjustWindSpeedForHeight(refSpeed, refHeight, targetHeight, roughness) {
        if (!targetHeight || targetHeight <= 0) return refSpeed;
        const alpha = roughness || constants.WIND.WIND_SHEAR_EXPONENT || 0.14;
        return refSpeed * Math.pow(targetHeight / refHeight, alpha);
    }

    // ==========================================
    // 2. LÓGICA DE FÍSICA EÓLICA (WEIBULL)
    // ==========================================

    /**
     * Calcula producción diaria/anual basada en distribución de Weibull
     */
    calculateWeibullProduction(avgWindSpeed, capacityKw, params) {
        const {
            cutIn = constants.WIND.CUT_IN_SPEED,
            rated = constants.WIND.RATED_SPEED,
            cutOut = constants.WIND.CUT_OUT_SPEED,
            rotorDiameter = constants.WIND.DEFAULT_ROTOR_DIAMETER
        } = params;

        // Parámetro k (Shape) - Rayleigh k=2
        const k = constants.WIND.WEIBULL_K || 2.0;
        
        // Parámetro Lambda (Scale) aprox: avgSpeed / Gamma(1 + 1/k)
        const lambda = avgWindSpeed / this.gamma(1 + 1/k);

        // PDF de Weibull
        const weibullPDF = (v) => {
            if (v < 0) return 0;
            return (k / lambda) * Math.pow(v / lambda, k - 1) * Math.exp(-Math.pow(v / lambda, k));
        };

        // Curva de potencia del aerogenerador P(v)
        const turbinePower = (v) => {
            if (v < cutIn || v >= cutOut) return 0;
            if (v >= rated) return capacityKw;

            if (rotorDiameter > 0) {
                const area = Math.PI * Math.pow(rotorDiameter / 2, 2);
                const rho = constants.WIND.AIR_DENSITY || 1.225;
                const cp = 0.35; // Coeficiente de potencia más realista (Betz limit es 0.59, pequeños aeros ~0.30-0.35)
                const powerW = 0.5 * rho * area * cp * Math.pow(v, 3);
                return Math.min(powerW / 1000, capacityKw);
            } else {
                // Modelo cúbico simple si no hay diámetro
                const factor = Math.pow((v - cutIn) / (rated - cutIn), 3);
                return capacityKw * factor;
            }
        };

        // Integración numérica (Regla del trapecio)
        let totalPower = 0;
        const step = 0.5; // m/s precísion

        for (let v = 0; v <= cutOut + 5; v += step) {
            const p = turbinePower(v);
            const prob = weibullPDF(v);
            totalPower += p * prob * step;
        }

        // totalPower es la potencia media esperada (kW)
        return totalPower * 24; // kWh diarios estimados
    }

    // ==========================================
    // 3. SERVICE METHODS
    // ==========================================

    /**
     * Simulación Eólica Completa
     */
    async simulateWind(lat, lon, capacityKw, params = {}) {
        console.log(`[SimulationService] Wind Simulation for ${lat}, ${lon}, ${capacityKw}kW`);
        
        try {
            // 1. Obtener datos históricos meteorológicos
            const history = await weatherService.getHistoricalWeather(lat, lon, 3); // Últimos 3 días/años según implementación
            
            let annualProduction = 0;
            let monthlyDistribution = [];
            const { height = constants.WIND.DEFAULT_HUB_HEIGHT || 10 } = params;
            const refHeight = 10; // Altura de datos meteorológicos estándar

            if (history && history.data && Array.isArray(history.data)) {
                // Cálculo detallado día a día
                let totalEnergySum = 0;
                
                history.data.forEach(day => {
                   let speed = day.windMean; 
                   if (!speed && day.windMax) speed = day.windMax * 0.6; // Fallback
                   if (!speed) speed = 0;

                   // Ajuste de altura (Hellmann)
                   const speedAtHub = this.adjustWindSpeedForHeight(speed, refHeight, height, constants.WIND.WIND_SHEAR_EXPONENT);
                   
                   // Producción diaria con Weibull centrado en la media del día
                   const dailyProd = this.calculateWeibullProduction(speedAtHub, capacityKw, params);
                   totalEnergySum += dailyProd;
                });

                // Extrapolar a un año
                const daysInDataset = history.data.length;
                if (daysInDataset > 0) {
                    annualProduction = (totalEnergySum / daysInDataset) * 365;
                }

            } else {
                // Fallback a media simple si no hay histórico detallado
                const fallbackSpeed = constants.WIND.DEFAULT_WIND_SPEED;
                const speedAtHub = this.adjustWindSpeedForHeight(fallbackSpeed, refHeight, height, 0.14);
                const daily = this.calculateWeibullProduction(speedAtHub, capacityKw, params);
                annualProduction = daily * 365;
            }

            // Factor de Planta
            const theoreticalMax = capacityKw * 24 * 365;
            const capacityFactor = theoreticalMax > 0 ? (annualProduction / theoreticalMax) : 0;

            // Generar distribución mensual (simulada por ahora, pendiente de mejora con datos mensuales reales)
            monthlyDistribution = Array.from({ length: 12 }, (_, i) => ({
                month: i + 1,
                production: (annualProduction / 12) * (1 + Math.sin((i - 6) * Math.PI / 6) * 0.15)
            }));

            return {
                annualProduction,
                monthlyDistribution,
                capacityFactor,
                meta: {
                    model: 'Weibull-Hellmann-Hybrid',
                    source: history ? 'Open-Meteo Archive' : 'Fallback Defaults'
                }
            };

        } catch (error) {
            console.error("Simulation Error:", error);
            throw new Error("Failed to calculate wind simulation");
        }
    }

    /**
     * Simulación Solar Completa
     */
    async simulateSolar(lat, lon, capacityKw, params = {}) {
        const { tilt, azimuth, performanceRatio } = params;

        // Intentar obtener datos precisos de PVGIS
        try {
            // PVGIS toma peakpower en kW. Nosotros pedimos para 1kW y escalamos, 
            // o pedimos directo si la API lo permite, pero mejor escalar para mantener 
            // consistencia con solarService.getSolarData que usa peakpower=1.
            
            const pvgisResult = await solarService.getSolarData(
                { lat, lon }, 
                { tilt, azimuth, loss: (1 - (performanceRatio || 0.75)) * 100 } // Approx loss conversion
            );

            if (pvgisResult && pvgisResult.annualProduction) {
                const baseProduction1kW = pvgisResult.annualProduction;
                
                // PVGIS ya aplica pérdidas del sistema (loss param). 
                // Pero si SolarService tiene defaults fijos, revisamos.
                // Asumimos que SolarService devuelve E_y para 1kWp instalado.
                
                const annualProduction = baseProduction1kW * capacityKw;
                
                // Distribución mensual
                let monthlyDistribution = [];
                if (pvgisResult.monthlyData && Array.isArray(pvgisResult.monthlyData)) {
                     monthlyDistribution = pvgisResult.monthlyData.map(m => ({
                         month: m.month,
                         production: m.E_m * capacityKw
                     }));
                } else {
                     // Fallback distribución estacional
                     monthlyDistribution = Array.from({ length: 12 }, (_, i) => ({
                        month: i + 1,
                        production: (annualProduction / 12) * (1 + Math.sin((i - 6) * Math.PI / 6) * 0.4)
                    }));
                }

                return {
                    annualProduction,
                    monthlyDistribution,
                    performanceRatio: pvgisResult.capacityFactor ? (pvgisResult.capacityFactor / 100) : 0.18, // PVGIS can return %, e.g. 18.5
                    source: 'PVGIS'
                };
            }
        } catch (e) {
            console.warn("PVGIS simulation failed, falling back to basic model", e);
        }

        // Fallback: Modelo básico
        const baseRadiation = 1600; 
        const efficiency = constants.SOLAR.EFFICIENCY || 0.75; 
        
        const orientationFactor = this.calculateOrientationFactor(tilt || 35, azimuth || 0);
        
        const annualProduction = capacityKw * baseRadiation * efficiency * orientationFactor;

        const monthlyDistribution = Array.from({ length: 12 }, (_, i) => {
            const seasonFactor = 1 - 0.4 * Math.cos(2 * Math.PI * (i + 0.5) / 12); 
            return {
                month: i + 1,
                production: (annualProduction / 12) * seasonFactor
            };
        });

        return {
            annualProduction,
            monthlyDistribution,
            performanceRatio: efficiency * orientationFactor,
            source: 'Basic Model'
        };
    }

    /**
     * Análisis Financiero (ROI, NPV, Payback)
     */
    async calculateFinancials(investment, annualProduction, selfConsumptionRate, params = {}) {
        let {
            electricityPrice,
            surplusPrice
        } = params;

        // Si no se proveen precios, intentar obtenerlos del MarketService
        if (!electricityPrice || !surplusPrice) {
            try {
                const marketStats = await marketService.getPriceStatistics();
                 // Precio consumidor medio (aprox 2.5x precio pool por peajes e impuestos si no tenemos dato mejor)
                 // O usar el constants si falla.
                 // Usaremos avgPriceEurKWh del fichero si existe.
                 
                if (!electricityPrice) {
                     electricityPrice = marketStats.avgPriceEurKWh 
                        ? marketStats.avgPriceEurKWh * 2.5 // Aprox market -> consumer
                        : constants.MARKET.CONSUMER_PRICE; // Fallback constant
                }

                if (!surplusPrice) {
                    surplusPrice = marketStats.avgPriceEurKWh 
                        ? marketStats.avgPriceEurKWh * 0.8 // Aprox precio venta excedentes
                        : constants.MARKET.SELL_BACK_PRICE;
                }

            } catch (e) {
                console.warn("Could not fetch market prices for financials, using constants", e);
                electricityPrice = electricityPrice || constants.MARKET.CONSUMER_PRICE;
                surplusPrice = surplusPrice || constants.MARKET.SELL_BACK_PRICE;
            }
        }

        const {
            inflationRate = constants.MARKET.ANNUAL_INCREASE / 100, // Convertir de 3 a 0.03
            years = 25
        } = params;

        const annualSavingsBase = annualProduction * selfConsumptionRate * electricityPrice;
        //...
        const annualIncomeBase = annualProduction * (1 - selfConsumptionRate) * surplusPrice;

        const cashFlows = [-investment];
        let cumulativeCashFlow = -investment;
        let paybackPeriod = null;

        // Costes
        const maintenanceRate = 0.005; // 0.5% anual (más realista para solar residencial)
        const discountRate = params.discountRate ? (params.discountRate / 100) : (constants.MARKET.DISCOUNT_RATE / 100);

        for (let i = 1; i <= years; i++) {
            const degradationFactor = Math.pow(1 - (params.degradationRate || 0.005), i - 1); 
            // Inflación energética suele ser mayor a IPC, pero usamos param
            const inflationFactor = Math.pow(1 + inflationRate, i - 1);

            // Ahorro real anual
            const yearSavings = annualSavingsBase * degradationFactor * inflationFactor;
            const yearIncome = annualIncomeBase * degradationFactor * inflationFactor;
            
            // Coste mantenimiento indexado
            let maintenance = investment * maintenanceRate * Math.pow(1 + 0.02, i - 1); // Inflación general 2%
            
            // Reemplazo invesor año 12 (mejores inversores) - DESHABILITADO POR CÁLCULO INCORRECTO
            // if (i === 12) maintenance += (investment / 6); // Aprox coste inversor vs sistema total

            const netFlow = (yearSavings + yearIncome) - maintenance;
            
            cashFlows.push(netFlow);
            cumulativeCashFlow += netFlow;

            if (paybackPeriod === null && cumulativeCashFlow >= 0) {
                const prevCumulative = cumulativeCashFlow - netFlow;
                paybackPeriod = (i - 1) + (Math.abs(prevCumulative) / netFlow);
            }
        }

        const totalBenefit = cashFlows.slice(1).reduce((a, b) => a + b, 0);
        const roi = ((totalBenefit - investment) / investment) * 100;
        const npv = cashFlows.reduce((acc, val, t) => acc + (val / Math.pow(1 + discountRate, t)), 0);

        return {
            roi: parseFloat(roi.toFixed(2)),
            payback: paybackPeriod ? parseFloat(paybackPeriod.toFixed(1)) : 99,
            npv: parseFloat(npv.toFixed(2)),
            annualSavings: parseFloat((annualSavingsBase + annualIncomeBase).toFixed(2)),
            cashFlows
        };
    }
}

module.exports = new SimulationService();
