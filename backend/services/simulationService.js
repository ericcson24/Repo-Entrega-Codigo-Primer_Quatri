const weatherService = require('./weatherService');
const solarService = require('./solarService');
const marketService = require('./marketService');
const SIMULATION_CONSTANTS = require('../config/simulationParams');


class SimulationService {
    
    /**
     * Orquestador Principal de Simulación Solar
     * Integra:
     * 1. Datos Solares (API PVGIS)
     * 2. Precios Mercado (API REE/OMIE via MarketService)
     * 3. Modelo Financiero (VAN, TIR, PAYBACK)
     * 4. Modelo Técnico Detallado (Pérdidas, Degradación)
     */
    async runFullSolarSimulation(input) {
        const { location, technical, financial, costs } = input;
        
        // 1. Obtener Datos de Producción (Física)
        // Delegamos al SolarService que ahora llama a PVGIS con todos los parámetros
        // tilt, azimuth, tech, mounting, etc.
        const solarData = await solarService.getAdvancedSolarData(location, {
            ...technical,
            peakPowerKw: technical.capacityKw
        });

        // 2. Obtener Datos de Mercado (Económica)
        // Intentamos obtener precio real actual, si falla usa defaults
        // const marketStats = await marketService.getPriceStatistics();
        const currentElecPrice = financial?.electricityPrice || SIMULATION_CONSTANTS.MARKET.GRID_PRICE;

        // 3. Calcular CAPEX (Inversión Inicial Total)
        // Sumamos: Paneles, Inversores, Estructura, Mano de Obra, Licencias, Terreno...
        const totalCapex = this._calculateTotalCapex(costs, technical.capacityKw);

        // 4. Proyección a 25-30 años (Financial Model)
        const projection = this._generateCashFlowProjection({
            production: solarData.production,
            capex: totalCapex,
            financialParams: { ...financial, electricityPrice: currentElecPrice },
            technicalParams: technical,
            type: 'SOLAR'
        });

        return {
            summary: {
                totalGenerationFirstYear: solarData.production.annualKwh,
                totalInvestment: totalCapex,
                roi: projection.metrics.roi,
                paybackYears: projection.metrics.paybackPeriod,
                npv: projection.metrics.npv, // VAN
                irr: projection.metrics.irr  // TIR
            },
            technical: solarData,
            financial: projection,
            market: {
                referencePrice: currentElecPrice,
                priceSource: 'User Input or Default'
            }
        };
    }

    _calculateTotalCapex(costs, capacityKw) {
        // Si el usuario provee un coste total manual, usarlo
        if (costs?.totalOverride) return costs.totalOverride;

        // Sumar componentes unitarios si existen, o usar coste por vatio estándar
        const equipCost = (costs?.panelsCost || 0) + (costs?.invertersCost || 0) + (costs?.structureCost || 0);
        
        if (equipCost > 0) {
            // Modelo detallado suma componentes + instalación + legal
            return equipCost + (costs?.installationCost || 0) + (costs?.permitsCost || 0);
        }

        // Modelo simplificado por defecto: ~1000€/kWp standard residencial/industrial pequeño
        const defaultCostPerKw = 1000; 
        return capacityKw * (costs?.costPerKw || defaultCostPerKw);
    }

    _generateCashFlowProjection(data) {
        const { production, capex, financialParams, technicalParams, type = 'SOLAR' } = data;
        
        // Select configuration based on type (SOLAR or WIND)
        const configSection = SIMULATION_CONSTANTS[type] || SIMULATION_CONSTANTS.SOLAR;

        // Robust extraction of LIFETIME_YEARS
        const years = technicalParams.lifetimeYears || 
                     configSection.TECHNICAL?.LIFETIME_YEARS || 
                     25;
        
        // Parametros financieros
        const electricityPrice = financialParams.electricityPrice || SIMULATION_CONSTANTS.MARKET.GRID_PRICE;
        
        // Determine Surplus Price (Feed-in Tariff)
        let defaultSurplusPrice = SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_SOLAR;
        if (type === 'WIND') defaultSurplusPrice = SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_WIND;
        
        const surplusPrice = financialParams.surplusPrice || defaultSurplusPrice;

        // Self Consumption Ratio
        let defaultSelfConsumption = 0.5; // generic default
        if (type === 'WIND' && SIMULATION_CONSTANTS.MARKET.SELF_CONSUMPTION_RATIO_WIND) {
             defaultSelfConsumption = SIMULATION_CONSTANTS.MARKET.SELF_CONSUMPTION_RATIO_WIND;
        } else if (SIMULATION_CONSTANTS.MARKET.SELF_CONSUMPTION_RATIO) {
             defaultSelfConsumption = SIMULATION_CONSTANTS.MARKET.SELF_CONSUMPTION_RATIO;
        }

        const selfConsumptionRatio = (financialParams.selfConsumptionRatio !== undefined) 
            ? financialParams.selfConsumptionRatio 
            : defaultSelfConsumption;

        const energyInflation = financialParams.energyInflation || SIMULATION_CONSTANTS.FINANCIAL.INFLATION_ENERGY;
        const discountRate = financialParams.discountRate || SIMULATION_CONSTANTS.FINANCIAL.DISCOUNT_RATE;
        
        const degradation = technicalParams.degradationRate || configSection.TECHNICAL.DEGRADATION_RATE || 0.0055;
        const opexAnnual = financialParams.opexAnnual || (capex * (configSection.FINANCIAL?.OPEX_PERCENTAGE || 0.015));

        let cashFlows = [];
        let cumulativeCashFlow = -capex;
        let cumulativeSavings = 0;
        let paybackPeriod = null;

        // Año 0: Inversión
        cashFlows.push({
            year: 0,
            revenue: 0,
            expenses: capex,
            netFlow: -capex,
            cumulative: cumulativeCashFlow
        });

        for (let year = 1; year <= years; year++) {
            // Producción degradada
            const yearProduction = production.annualKwh * Math.pow(1 - degradation, year - 1);
            
            // Precios inflados
            const yearPriceGrid = electricityPrice * Math.pow(1 + energyInflation, year - 1);
            const yearPriceSurplus = surplusPrice * Math.pow(1 + energyInflation, year - 1); // Asumimos sube igual

            // Ingresos / Ahorros
            const selfConsumedEnergy = yearProduction * selfConsumptionRatio;
            const exportedEnergy = yearProduction * (1 - selfConsumptionRatio);

            const savings = selfConsumedEnergy * yearPriceGrid;
            const income = exportedEnergy * yearPriceSurplus;
            const totalRevenue = savings + income;

            // Gastos (OPEX con inflación IPC)
            const yearOpex = opexAnnual * Math.pow(1 + SIMULATION_CONSTANTS.FINANCIAL.INFLATION_MAINTENANCE, year - 1);

            // Flujo Neto
            const netFlow = totalRevenue - yearOpex;
            cumulativeCashFlow += netFlow;
            cumulativeSavings += totalRevenue;

            if (paybackPeriod === null && cumulativeCashFlow >= 0) {
                // Interpolación lineal simple para fracción de año
                const prevCumulative = cashFlows[year-1].cumulative;
                paybackPeriod = (year - 1) + (Math.abs(prevCumulative) / netFlow);
            }

            cashFlows.push({
                year,
                production: yearProduction,
                savings: savings,
                income: income,
                opex: yearOpex,
                netFlow: netFlow,
                cumulative: cumulativeCashFlow
            });
        }

        // Métricas Finales
        const npv = this._calculateNPV(-capex, cashFlows.slice(1).map(c => c.netFlow), discountRate);
        const irr = this._calculateIRR([-capex, ...cashFlows.slice(1).map(c => c.netFlow)]);
        const roi = ((cumulativeSavings - (opexAnnual * years) - capex) / capex) * 100;

        return {
            cashFlows,
            metrics: {
                roi: parseFloat(roi.toFixed(2)),
                paybackPeriod: paybackPeriod ? parseFloat(paybackPeriod.toFixed(1)) : '25+',
                npv: parseFloat(npv.toFixed(2)),
                irr: parseFloat((irr * 100).toFixed(2)),
                totalSavings: parseFloat(cumulativeSavings.toFixed(2))
            }
        };
    }

    _calculateNPV(initialInvestment, flows, rate) {
        return initialInvestment + flows.reduce((acc, val, i) => acc + val / Math.pow(1 + rate, i + 1), 0);
    }

    _calculateIRR(values, guess = 0.1) {
        // Aproximación de Newton-Raphson para TIR
        const maxIter = 1000;
        const precision = 1e-5;
        let rate = guess;

        for (let i = 0; i < maxIter; i++) {
            let npv = 0;
            let d_npv = 0;
            for (let j = 0; j < values.length; j++) {
                npv += values[j] / Math.pow(1 + rate, j);
                d_npv -= j * values[j] / Math.pow(1 + rate, j + 1);
            }
            const newRate = rate - npv / d_npv;
            if (Math.abs(newRate - rate) < precision) return newRate;
            rate = newRate;
        }
        return rate;
    }

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
        const OPTIMAL_TILT = SIMULATION_CONSTANTS.SOLAR.TECHNICAL.OPTIMAL_ANGLE || 35;
        const OPTIMAL_AZIMUTH = SIMULATION_CONSTANTS.SOLAR.TECHNICAL.OPTIMAL_ASPECT || 0; // 0 = Sur
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
        const alpha = roughness || SIMULATION_CONSTANTS.WIND.TECHNICAL.SHEAR_EXPONENT || 0.143;
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
            cutIn = SIMULATION_CONSTANTS.WIND.TECHNICAL.CUT_IN_SPEED,
            rated = SIMULATION_CONSTANTS.WIND.TECHNICAL.RATED_SPEED,
            cutOut = SIMULATION_CONSTANTS.WIND.TECHNICAL.CUT_OUT_SPEED,
            rotorDiameter = 100 // Default typical

        } = params;

        // Parámetro k (Shape) - Rayleigh k=2
        const k = SIMULATION_CONSTANTS.WIND.TECHNICAL.WEIBULL_K_DEFAULT || 2.0;
        
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
                const rho = params.airDensity || SIMULATION_CONSTANTS.WIND.TECHNICAL.AIR_DENSITY_SEA_LEVEL || 1.225;
                const cp = 0.35; // Coeficiente de potencia más realista
                const powerW = 0.5 * rho * area * cp * Math.pow(v, 3);
                // La fórmula física pura puede exceder la capacidad nominal antes del rated speed
                // si el modelo no está perfectamente alineado. Capped.
                return Math.min(powerW / 1000, capacityKw);
            } else {
                // Modelo cúbico simple interpolado si no hay diámetro
                const factor = Math.pow((v - cutIn) / (rated - cutIn), 3);
                return capacityKw * factor;
            }
        };

        // Integración numérica (Regla del trapecio)
        let totalWeightedPower = 0; // kW Weighted Average
        const step = 0.5; // m/s precísion

        for (let v = 0; v <= cutOut + 5; v += step) {
            const p = turbinePower(v);
            const prob = weibullPDF(v);
            totalWeightedPower += p * prob * step;
        }

        // totalWeightedPower es la Potencia Instantánea Promedio (kW) esperada para este día
        // Energía Diaria = Potencia Media * 24 horas
        
        return totalWeightedPower * 24; 
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
            const { height = 80 } = params;
            const refHeight = 10; // Altura de datos meteorológicos estándar

            // Validación estricta: NO Fallbacks si no hay datos.
            if (!history || !history.data || !Array.isArray(history.data) || history.data.length === 0) {
                 throw new Error("Insufficient Wind Data: Historical weather data unavailable for this location.");
            }

            // Cálculo detallado día a día usando datos reales
            let totalEnergySum = 0;
            
            // Arrays para sumar producción por mes (0-11)
            const monthlySum = new Array(12).fill(0);
            const monthlyCount = new Array(12).fill(0);

            history.data.forEach(day => {
               let speed = day.windMean; 
               // Descartar días sin datos validos, nada de 0.6 * Max.
               if (typeof speed !== 'number') return;

               // Ajuste de altura (Hellmann)
               const speedAtHub = this.adjustWindSpeedForHeight(speed, refHeight, height, SIMULATION_CONSTANTS.WIND.TECHNICAL.SHEAR_EXPONENT);
               
               // Producción diaria con Weibull centrado en la media del día
               const dailyProd = this.calculateWeibullProduction(speedAtHub, capacityKw, params);
               
               totalEnergySum += dailyProd;

               // Acumular mensual
               if (day.date) {
                   const d = new Date(day.date);
                   const m = d.getMonth();
                   monthlySum[m] += dailyProd;
                   monthlyCount[m]++;
               }
            });

            // Extrapolar a un año promedio
            const daysInDataset = history.data.length;
            if (daysInDataset > 0) {
                annualProduction = (totalEnergySum / daysInDataset) * 365;
            }

            // Generar distribución mensual real promediada
            monthlyDistribution = monthlySum.map((sum, idx) => {
                const count = monthlyCount[idx];
                // Si tenemos datos para el mes, normalizamos a 30.4 días estándar
                const monthProd = count > 0 ? (sum / count) * 30.416 : 0;
                return {
                    month: idx + 1,
                    production: monthProd
                };
            });

            // Factor de Planta
            const theoreticalMax = capacityKw * 24 * 365;
            const capacityFactor = theoreticalMax > 0 ? (annualProduction / theoreticalMax) : 0;

            return {
                annualProduction,
                monthlyDistribution,
                capacityFactor,
                meta: {
                    model: 'Weibull-Hellmann-Hybrid (Real Data)',
                    source: 'Open-Meteo Archive',
                    dataPoints: daysInDataset
                }
            };

        } catch (error) {
            console.error("Simulation Error:", error);
            throw new Error(`Simulation Failed: ${error.message}`);
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
        const efficiency = SIMULATION_CONSTANTS.SOLAR.TECHNICAL.SYSTEM_PERFORMANCE_RATIO || 0.75; 
        
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
                        : SIMULATION_CONSTANTS.MARKET.GRID_PRICE; // Fallback constant
                }

                if (!surplusPrice) {
                    surplusPrice = marketStats.avgPriceEurKWh 
                        ? marketStats.avgPriceEurKWh * 0.8 // Aprox precio venta excedentes
                        : SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_SOLAR;
                }

            } catch (e) {
                console.warn("Could not fetch market prices for financials, using constants", e);
                electricityPrice = electricityPrice || SIMULATION_CONSTANTS.MARKET.GRID_PRICE;
                surplusPrice = surplusPrice || SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_SOLAR;
            }
        }

        const {
            inflationRate = SIMULATION_CONSTANTS.FINANCIAL.INFLATION_ENERGY, // Convertir de 3 a 0.03
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
        const discountRate = params.discountRate ? (params.discountRate / 100) : (SIMULATION_CONSTANTS.FINANCIAL.DISCOUNT_RATE);

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

    /**
     * Orquestador Principal de Simulación Eólica
     * Integra física de fluidos, curva de potencia, Weibull y modelo financiero complejo.
     */
    async runFullWindSimulation(input) {
        const { location, technical, financial, costs } = input;
        
        // 1. Obtener Datos Climáticos (Viento)
        // Usamos Open-Meteo para datos históricos de viento a 100m, 80m, etc.
        // Si no tenemos datos, usaremos fallbacks inteligentes basados en coordenadas (mapa eólico)
        const windResource = await weatherService.getWindResourceData(location);
        
        // 2. Modelo Físico Eólico (Producción)
        const {
            hubHeight = SIMULATION_CONSTANTS.WIND.TECHNICAL.DEFAULT_HUB_HEIGHT,
            rotorDiameter = SIMULATION_CONSTANTS.WIND.TECHNICAL.DEFAULT_ROTOR_DIAMETER,
            turbineCapacityKw = 2000
        } = technical;

        // Ajuste vertical de viento (Ley Logarítmica)
        const avgWindSpeedHub = this.adjustWindSpeedForHeight(
            windResource.avgSpeed, 
            windResource.refHeight, 
            hubHeight, 
            technical.roughness || SIMULATION_CONSTANTS.WIND.TECHNICAL.SHEAR_EXPONENT
        );

        const airDensity = this._calculateAirDensity(location.altitude || 0, windResource.avgTemp || 15);

        // Cálculo de Producción Anual (Weibull + Curva Potencia)
        // Devuelve kWh diarios estimados
        const dailyKwh = this.calculateWeibullProduction(avgWindSpeedHub, turbineCapacityKw, {
            cutIn: technical.cutIn || SIMULATION_CONSTANTS.WIND.TECHNICAL.CUT_IN_SPEED,
            rated: technical.rated || SIMULATION_CONSTANTS.WIND.TECHNICAL.RATED_SPEED,
            cutOut: technical.cutOut || SIMULATION_CONSTANTS.WIND.TECHNICAL.CUT_OUT_SPEED,
            rotorDiameter: rotorDiameter,
            airDensity: airDensity
        });

        const annualGrossKwh = dailyKwh * 365;

        // Aplicamos pérdidas técnicas (Estelas, disponibilidad, eléctricas)
        const totalLosses = (technical.wakeLosses || SIMULATION_CONSTANTS.WIND.TECHNICAL.WAKE_LOSSES) + 
                            (1 - (technical.availability || SIMULATION_CONSTANTS.WIND.TECHNICAL.AVAILABILITY_FACTOR));
        
        const netAnnualKwh = annualGrossKwh * (1 - totalLosses);

        // 3. CAPEX Eólico
        const totalCapex = this._calculateWindCapex(costs, turbineCapacityKw);

        // 4. Modelo Financiero (Mayor OPEX y Riesgo)
        const projection = this._generateCashFlowProjection({
            production: { annualKwh: netAnnualKwh, dailyAverage: dailyKwh, airDensity: airDensity },
            capex: totalCapex,
            financialParams: {
                ...financial, 
                // Capture Price: Eólica suele vender a 90% del precio base
                surplusPrice: (financial.surplusPrice || SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_WIND) * SIMULATION_CONSTANTS.WIND.FINANCIAL.CAPTURE_PRICE_FACTOR,
                opexAnnual: totalCapex * SIMULATION_CONSTANTS.WIND.FINANCIAL.OPEX_PERCENTAGE // 3-4% anual
            },
            technicalParams: {
                ...technical,
                degradationRate: SIMULATION_CONSTANTS.WIND.TECHNICAL.DEGRADATION_RATE,
                lifetimeYears: SIMULATION_CONSTANTS.WIND.TECHNICAL.LIFETIME_YEARS
            },
            type: 'WIND',
            finalProvision: totalCapex * SIMULATION_CONSTANTS.WIND.FINANCIAL.DISMANTLING_PROVISION // Coste desmantelamiento
        });

        return {
            summary: {
                totalGenerationFirstYear: netAnnualKwh,
                totalInvestment: totalCapex,
                capacityFactor: (netAnnualKwh / (turbineCapacityKw * 8760)) * 100,
                roi: projection.metrics.roi,
                paybackYears: projection.metrics.paybackPeriod,
                npv: projection.metrics.npv,
                irr: projection.metrics.irr
            },
            technical: {
                avgWindSpeedHub,
                weibullK: SIMULATION_CONSTANTS.WIND.TECHNICAL.WEIBULL_K_DEFAULT,
                airDensity: airDensity,
                lossesPercent: totalLosses * 100
            },
            financial: projection
        };
    }

    _calculateWindCapex(costs, capacityKw) {
        if (costs?.totalOverride) return costs.totalOverride;
        
        // Eólica ~ 1.2M€ - 1.5M€ por MW instalado
        const defaultCostPerKw = 1300; 
        
        // Desglose típico si no se especifica:
        // Turbina 70%, Civil 15%, Grid 10%, Legal 5%
        return capacityKw * (costs?.costPerKw || defaultCostPerKw);
    }
    
    _calculateAirDensity(altitude, tempCelsius) {
        // Fórmula barométrica simplificada
        // Rho0 = 1.225 kg/m3 a 15ºC nivel del mar
        const T0 = 288.15; // 15C en Kelvin
        const P0 = 101325; // Pa
        const R = 287.05; // Constante gas
        const g = 9.80665;
        const L = 0.0065; // Gradiente térmico

        const T = T0 - L * altitude;
        if (T <= 0) return 1.225; // Fallback
        
        const P = P0 * Math.pow(1 - (L * altitude / T0), (g / (R * L)));
        const density = P / (R * (tempCelsius + 273.15));
        
        return density;
    }
}

module.exports = new SimulationService();
