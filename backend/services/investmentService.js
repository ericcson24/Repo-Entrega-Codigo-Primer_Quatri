const SIMULATION_CONSTANTS = require('../config/simulationParams');
const marketService = require('./marketService');
const aiService = require('./aiService');

class InvestmentService {

    /**
     * Calcula ROI, VPN, TIR y Payback para una inversión dada
     * @param {number} investment Inversión inicial
     * @param {number} annualProduction Producción anual en kWh
     * @param {number} selfConsumptionRate Ratio de autoconsumo (0-1)
     * @param {object} params Parámetros adicionales (precios, inflación, etc.)
     */
    async calculateSolarInvestment(investment, annualProduction, selfConsumptionRate, params = {}) {
        console.log(`[InvestmentService] Calculating Investment: Inv=${investment}, Prod=${annualProduction}`);
        
        let {
            electricityPrice,
            surplusPrice,
            inflationRate = 0.03,
            years = 25,
            discountRate = 0.05,
            maintenanceAnnual = (investment * 0.01)
        } = params;

        // Obtener precios de mercado si no se proveen
        if (!electricityPrice || !surplusPrice) {
            try {
                const marketStats = await marketService.getPriceStatistics();
                
                if (!electricityPrice) {
                     electricityPrice = marketStats.avgPriceEurKWh 
                        ? marketStats.avgPriceEurKWh * 2.5 
                        : SIMULATION_CONSTANTS.MARKET.GRID_PRICE; 
                }

                if (!surplusPrice) {
                    surplusPrice = marketStats.avgPriceEurKWh 
                        ? marketStats.avgPriceEurKWh * 0.8 
                        : SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_SOLAR;
                }
            } catch (e) {
                console.warn("Could not fetch market prices, using constants", e);
                electricityPrice = electricityPrice || SIMULATION_CONSTANTS.MARKET.GRID_PRICE;
                surplusPrice = surplusPrice || SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_SOLAR;
            }
        }

        // Estimación de factor de captura de precio usando AI Service (simplificado)
        // Similar a simulationService pero aislado aquí
        let priceCaptureFactor = 1.0;
        if (selfConsumptionRate > 0.3) {
             const aiFactor = aiService.predictPriceFactor(0.6, 0.8, 0.5); 
             priceCaptureFactor = aiFactor; 
        } else {
             const aiFactor = aiService.predictPriceFactor(0.3, 0.5, 0.5);
             priceCaptureFactor = aiFactor; 
        }
        
        const effectiveElectricityPrice = (electricityPrice || 0.15) * priceCaptureFactor;

        const cashFlows = [];
        let cumulativeCashFlow = -investment;
        let cumulativeSavings = 0;
        let paybackPeriod = null;

        // Año 0
        cashFlows.push({
            year: 0,
            production: 0,
            savings: 0,
            income: 0,
            opex: 0,
            netFlow: -investment,
            cumulative: cumulativeCashFlow
        });

        for (let year = 1; year <= years; year++) {
            // Factor degradación
            const degradation = (year === 1) ? 0 : 0.005; 
            const yearProduction = annualProduction * Math.pow(1 - degradation, year - 1);
            
            // Inflación precios
            const yearPrice = effectiveElectricityPrice * Math.pow(1 + inflationRate, year - 1);
            const yearSurplus = surplusPrice * Math.pow(1 + inflationRate, year - 1);
            
            const savings = yearProduction * selfConsumptionRate * yearPrice;
            const income = yearProduction * (1 - selfConsumptionRate) * yearSurplus;
            const totalRevenue = savings + income;

            // OPEX y Reemplazos
            const opexAnnual = maintenanceAnnual; 
            const yearOpex = opexAnnual * Math.pow(1 + (inflationRate + 0.01), year - 1);
            
            let replacementCost = 0;
            if (year === 12) {
                 replacementCost = investment * 0.15; 
            }

            const netFlow = totalRevenue - yearOpex - replacementCost;
            cumulativeCashFlow += netFlow;
            cumulativeSavings += totalRevenue;

            // Payback Exacto
            if (paybackPeriod === null && cumulativeCashFlow >= 0) {
                const prevCumulative = cashFlows[year-1].cumulative;
                // Cuánto faltaba / Cuánto gané este año
                paybackPeriod = (year - 1) + (Math.abs(prevCumulative) / netFlow);
            }

            cashFlows.push({
                year,
                production: yearProduction,
                savings,
                income,
                opex: yearOpex,
                netFlow,
                cumulative: cumulativeCashFlow
            });
        }

        const totalBenefit = cashFlows.slice(1).reduce((a, b) => a + b.netFlow, 0);
        // ROI Realista = (Beneficio Neto / Inversión) 
        const roi = (totalBenefit / investment) * 100;
        const npv = this._calculateNPV(-investment, cashFlows.slice(1).map(c => c.netFlow), discountRate);
        const irr = this._calculateIRR([-investment, ...cashFlows.slice(1).map(c => c.netFlow)]);

        // Comparativa Inversión Tradicional (ej. Bolsa 7%)
        const marketReturnRate = 0.07;
        const traditionalInvestmentValue = investment * Math.pow(1 + marketReturnRate, years);
        const renewableFinalValue = investment + totalBenefit; 

        return {
            metrics: {
                roi: parseFloat(roi.toFixed(2)),
                payback: paybackPeriod ? parseFloat(paybackPeriod.toFixed(1)) : 99,
                npv: parseFloat(npv.toFixed(2)),
                irr: parseFloat((irr * 100).toFixed(2)),
                annualSavings: parseFloat((cumulativeSavings / years).toFixed(2)),
                comparative: {
                    renewableValue: parseFloat(renewableFinalValue.toFixed(2)),
                    traditionalValue: parseFloat(traditionalInvestmentValue.toFixed(2)),
                    difference: parseFloat((renewableFinalValue - traditionalInvestmentValue).toFixed(2))
                }
            },
            cashFlows
        };
    }

    /**
     * Cálculo simple de recuperación de inversión (Payback Period simple)
     * Para uso rápido "calculadora de paneles"
     */
    calculatePaybackSimple(totalCost, monthlySavings) {
        if (monthlySavings <= 0) return { months: 999, years: 99 };
        const months = totalCost / monthlySavings;
        return {
            months: Math.ceil(months),
            years: parseFloat((months / 12).toFixed(1))
        };
    }

    _calculateNPV(initialInvestment, flows, rate) {
        return initialInvestment + flows.reduce((acc, val, i) => acc + val / Math.pow(1 + rate, i + 1), 0);
    }

    _calculateIRR(values, guess = 0.1) {
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
            if (Math.abs(d_npv) < 1e-10) return rate; 
            const newRate = rate - npv / d_npv;
            if (Math.abs(newRate - rate) < precision) return newRate;
            rate = newRate;
        }
        return rate;
    }
}

module.exports = new InvestmentService();