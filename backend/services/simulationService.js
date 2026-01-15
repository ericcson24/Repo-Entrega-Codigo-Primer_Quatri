const weatherService = require('./weatherService');
const solarService = require('./solarService');
const aiService = require('./aiService'); 
const marketService = require('./marketService');
const SIMULATION_CONSTANTS = require('../config/simulationParams');

// ==========================================
// PHYSIC ENGINE (HELPER CLASS)
// ==========================================
class PhysicsEngine {
    
    /**
     * Calculates Hydro Power (P = rho * g * h * q * efficiency)
     * @param {number} head Net Head (m)
     * @param {number} flow Design Flow (m3/s)
     * @param {number} efficiency Global Efficiency
     */
    static calculateHydroPower(head, flow, efficiency = 0.85) {
        const RHO = 1000; // Density of water kg/m3
        const G = 9.81;   // Gravity m/s2
        
        // P (W) = 1000 * 9.81 * h * q * eff
        const powerWatts = RHO * G * head * flow * efficiency;
        return powerWatts / 1000; // kW
    }

    /**
     * Estimates Annual Hydro Energy
     */
    static calculateHydroEnergyAnnual(ratedPowerKw, flow) {
        // Run-of-River Capacity Factor typical: 40-60%
        const capacityFactor = 0.55; 
        return ratedPowerKw * 8760 * capacityFactor;
    }

    /**
     * Calculates Biomass Fuel Needs (Rankine Cycle reverse calc)
     * @param {number} electricalOutputKw Target Electrical Power
     * @param {number} heatRate Inverse Thermal Efficiency (kwh_th / kwh_el) (e.g., 3.5 means 28% eff)
     * @param {number} lhv Lower Heating Value (kWh/kg)
     */
    static calculateBiomassFuelNeeds(electricalOutputKw, heatRate, lhv) {
        const thermalInputKw = electricalOutputKw * heatRate;
        const kgPerHour = thermalInputKw / lhv;
        
        return {
            thermalInputKw,
            kgPerHour,
            tonsPerYear: (kgPerHour * 8760 * 0.85) / 1000 // Assumes 85% availability for fuel calc
        };
    }

    /**
     * Weibull Probability Density Function
     */
    static getWeibullProbability(v, k, c) {
        if (v < 0) return 0;
        return (k / c) * Math.pow(v / c, k - 1) * Math.exp(-Math.pow(v / c, k));
    }

    /**
     * Generic Wind Turbine Power Curve
     */
    static getTurbinePowerOutput(v, ratedPower) {
        const cutIn = SIMULATION_CONSTANTS.WIND.TECHNICAL.CUT_IN_SPEED || 3.0;
        const ratedSpeed = SIMULATION_CONSTANTS.WIND.TECHNICAL.RATED_SPEED || 13.0;
        const cutOut = SIMULATION_CONSTANTS.WIND.TECHNICAL.CUT_OUT_SPEED || 25.0;

        if (v < cutIn || v >= cutOut) return 0;
        if (v >= ratedSpeed) return ratedPower;

        // Cubic region
        const partial = (v - cutIn) / (ratedSpeed - cutIn);
        const powerRatio = Math.pow(partial, 2.5); 
        return ratedPower * powerRatio;
    }

    /**
     * Calculates Air Density based on Altitude and Temp
     */
    static calculateAirDensity(altitude, tempCelsius) {
        const T0 = 288.15, P0 = 101325, L = 0.0065, R = 287.05, g = 9.80665;
        const T = T0 - L * altitude;
        if (T <= 0) return 1.225;
        const P = P0 * Math.pow(1 - (L * altitude / T0), (g / (R * L)));
        return P / (R * (tempCelsius + 273.15));
    }
}

class SimulationService {
    
    // ==========================================
    // 1. SOLAR SIMULATION
    // ==========================================
    async runFullSolarSimulation(input) {
        const { location, technical, financial, costs } = input;
        
        // DEBUG: Verify Input to Solar Service
        console.log(`[SimulationService] Calling SolarService with Capacity: ${technical.capacityKw} kW at ${location.lat},${location.lon}`);

        const solarData = await solarService.getAdvancedSolarData(location, {
            ...technical,
            peakPowerKw: technical.capacityKw
        });

        const currentElecPrice = financial?.electricityPrice || SIMULATION_CONSTANTS.MARKET.GRID_PRICE;
        const totalCapex = this._calculateSolarCapex(costs, technical.capacityKw);

        const commonParams = {
            production: solarData.production,
            capex: totalCapex,
            financialParams: { ...financial, electricityPrice: currentElecPrice },
            technicalParams: technical,
            type: 'SOLAR'
        };

        const baseScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'BASE' });
        const optimisticScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'OPTIMISTIC', silent: true });
        const pessimisticScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'PESSIMISTIC', silent: true });

        return {
            summary: {
                totalGenerationFirstYear: solarData.production.annualKwh,
                totalInvestment: totalCapex,
                roi: baseScenario.metrics.roi,
                paybackYears: baseScenario.metrics.paybackPeriod,
                npv: baseScenario.metrics.npv, 
                irr: baseScenario.metrics.irr,  
                lcoe: baseScenario.metrics.lcoe 
            },
            technical: solarData,
            financial: {
                ...baseScenario,
                scenarios: {
                    base: baseScenario,
                    optimistic: optimisticScenario,
                    pessimistic: pessimisticScenario
                }
            },
            market: {
                referencePrice: currentElecPrice,
                priceSource: 'User Input or Default'
            }
        };
    }

    // ==========================================
    // 2. WIND SIMULATION
    // ==========================================
    async runFullWindSimulation(input) {
        const { location, technical, financial, costs } = input;
        
        const windResource = await weatherService.getWindResourceData(location);
        
        const {
            hubHeight = SIMULATION_CONSTANTS.WIND.TECHNICAL.DEFAULT_HUB_HEIGHT,
            rotorDiameter = SIMULATION_CONSTANTS.WIND.TECHNICAL.DEFAULT_ROTOR_DIAMETER,
            turbineCapacityKw = 2000
        } = technical;

        const totalCapex = this._calculateWindCapex(costs, turbineCapacityKw);

        const avgWindSpeedHub = this._adjustWindSpeedForHeight(
            windResource.avgSpeed, 
            windResource.refHeight, 
            hubHeight, 
            technical.roughness || SIMULATION_CONSTANTS.WIND.TECHNICAL.SHEAR_EXPONENT
        );
        
        // Site Optimization logic
        const siteOptimizationFactor = 1.25; 
        let finalWindSpeed = avgWindSpeedHub * siteOptimizationFactor;

        // Virtual Micrositing for poor data
        if (finalWindSpeed < 5.0 && turbineCapacityKw > 1000) {
            finalWindSpeed *= Math.min(6.0/finalWindSpeed, 1.8);
        }

        const airDensity = PhysicsEngine.calculateAirDensity(location.altitude || 0, windResource.avgTemp || 15);

        // Calculate Production via Weibull & Power Curve
        const dailyKwh = this._calculateWeibullProduction(finalWindSpeed, turbineCapacityKw, airDensity);
        const annualGrossKwh = dailyKwh * 365;
        
        const totalLosses = (technical.wakeLosses || SIMULATION_CONSTANTS.WIND.TECHNICAL.WAKE_LOSSES) + 
                            (1 - (technical.availability || SIMULATION_CONSTANTS.WIND.TECHNICAL.AVAILABILITY_FACTOR));
        
        const netAnnualKwh = annualGrossKwh * (1 - totalLosses);

        const commonParams = {
            production: { annualKwh: netAnnualKwh, capacityKw: turbineCapacityKw },
            capex: totalCapex,
            financialParams: {
                ...financial, 
                surplusPrice: (financial.surplusPrice || SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_WIND) * SIMULATION_CONSTANTS.WIND.FINANCIAL.CAPTURE_PRICE_FACTOR,
                opexAnnual: turbineCapacityKw * SIMULATION_CONSTANTS.WIND.FINANCIAL.OPEX_EUR_PER_KW_YEAR
            },
            technicalParams: {
                ...technical,
                degradationRate: SIMULATION_CONSTANTS.WIND.TECHNICAL.DEGRADATION_RATE,
                lifetimeYears: SIMULATION_CONSTANTS.WIND.TECHNICAL.LIFETIME_YEARS,
                meanWindSpeed: finalWindSpeed 
            },
            type: 'WIND'
        };

        const baseScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'BASE' });

        return {
            summary: {
                totalGenerationFirstYear: netAnnualKwh,
                totalInvestment: totalCapex,
                capacityFactor: (netAnnualKwh / (turbineCapacityKw * 8760)) * 100,
                roi: baseScenario.metrics.roi,
                paybackYears: baseScenario.metrics.paybackPeriod,
                npv: baseScenario.metrics.npv,
                irr: baseScenario.metrics.irr,
                lcoe: baseScenario.metrics.lcoe
            },
            technical: {
                avgWindSpeedHub,
                airDensity,
                lossesPercent: totalLosses * 100
            },
            financial: { ...baseScenario }
        };
    }

    // ==========================================
    // 3. HYDRO SIMULATION
    // ==========================================
    async runFullHydroSimulation(input) {
        const { location, technical, financial, costs } = input;
        
        const flowRate = technical.flowRate || SIMULATION_CONSTANTS.HYDRO.TECHNICAL.DEFAULT_FLOW_RATE;
        const headHeight = technical.headHeight || SIMULATION_CONSTANTS.HYDRO.TECHNICAL.DEFAULT_HEAD_HEIGHT;
        const efficiency = technical.efficiency || SIMULATION_CONSTANTS.HYDRO.TECHNICAL.EFFICIENCY;
        
        // 1. Nominal Power
        const capacityKw = PhysicsEngine.calculateHydroPower(headHeight, flowRate, efficiency);
        
        // 2. Annual Energy
        const annualKwh = PhysicsEngine.calculateHydroEnergyAnnual(capacityKw, flowRate);

        // 3. CAPEX
        let totalCapex = 0;
        if (costs?.totalOverride) {
            totalCapex = costs.totalOverride;
        } else {
             const costPerKw = costs?.costPerKw || SIMULATION_CONSTANTS.HYDRO.FINANCIAL.DEFAULT_CAPEX_PER_KW;
             totalCapex = capacityKw * costPerKw;
        }

        // 4. Financial Projection
        const commonParams = {
            production: { annualKwh: annualKwh, capacityKw: capacityKw },
            capex: totalCapex,
            financialParams: {
                ...financial,
                opexAnnual: totalCapex * (SIMULATION_CONSTANTS.HYDRO.FINANCIAL.OPEX_PERCENTAGE)
            },
            technicalParams: {
                ...technical,
                lifetimeYears: SIMULATION_CONSTANTS.HYDRO.TECHNICAL.LIFETIME_YEARS,
                degradationRate: SIMULATION_CONSTANTS.HYDRO.TECHNICAL.DEGRADATION_RATE
            },
            type: 'HYDRO'
        };

        const baseScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'BASE' });
        
        return {
            summary: {
                totalGenerationFirstYear: annualKwh,
                totalInvestment: totalCapex,
                installedPowerKw: capacityKw.toFixed(2),
                roi: baseScenario.metrics.roi,
                paybackYears: baseScenario.metrics.paybackPeriod,
                npv: baseScenario.metrics.npv,
                irr: baseScenario.metrics.irr,
            },
            technical: {
                flowRate,
                headHeight,
                efficiency,
                capacityFactor: (annualKwh / (capacityKw * 8760)) * 100
            },
            financial: { ...baseScenario }
        };
    }

    // ==========================================
    // 4. BIOMASS SIMULATION
    // ==========================================
    async runFullBiomassSimulation(input) {
        const { location, technical, financial, costs } = input;
        
        const capacityKw = technical.capacityKw || 500;
        const capacityFactor = technical.capacityFactor || SIMULATION_CONSTANTS.BIOMASS.TECHNICAL.CAPACITY_FACTOR;
        
        const annualKwh = capacityKw * 8760 * capacityFactor;

        // Fuel Needs
        const heatRate = SIMULATION_CONSTANTS.BIOMASS.TECHNICAL.HEAT_RATE;
        const lhv = SIMULATION_CONSTANTS.BIOMASS.TECHNICAL.CALORIFIC_VALUE_WOOD_CHIPS;
        
        const fuelAnalysis = PhysicsEngine.calculateBiomassFuelNeeds(capacityKw, heatRate, lhv);
        const realFuelTons = (fuelAnalysis.kgPerHour * 8760 * capacityFactor) / 1000;
        
        const fuelCostPerTon = costs?.fuelCostPerTon || SIMULATION_CONSTANTS.BIOMASS.FINANCIAL.FUEL_COST_PER_TON;
        const annualFuelCost = realFuelTons * fuelCostPerTon;

        // CAPEX
        let totalCapex = 0;
        if (costs?.totalOverride) {
            totalCapex = costs.totalOverride;
        } else {
             const costPerKw = costs?.costPerKw || SIMULATION_CONSTANTS.BIOMASS.FINANCIAL.DEFAULT_CAPEX_PER_KW;
             totalCapex = capacityKw * costPerKw;
        }

        const baseOpex = totalCapex * SIMULATION_CONSTANTS.BIOMASS.FINANCIAL.OPEX_PERCENTAGE;
        const totalAnnualOpex = baseOpex + annualFuelCost;

        const commonParams = {
            production: { annualKwh: annualKwh, capacityKw: capacityKw },
            capex: totalCapex,
            financialParams: {
                ...financial,
                opexAnnual: totalAnnualOpex
            },
            technicalParams: {
                ...technical,
                lifetimeYears: SIMULATION_CONSTANTS.BIOMASS.TECHNICAL.LIFETIME_YEARS,
                degradationRate: SIMULATION_CONSTANTS.BIOMASS.TECHNICAL.DEGRADATION_RATE
            },
            type: 'BIOMASS'
        };

        const baseScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'BASE' });

        return {
             summary: {
                totalGenerationFirstYear: annualKwh,
                totalInvestment: totalCapex,
                roi: baseScenario.metrics.roi,
                paybackYears: baseScenario.metrics.paybackPeriod,
                npv: baseScenario.metrics.npv,
                fuelTonsPerYear: realFuelTons.toFixed(1)
            },
            technical: {
                capacityKw,
                capacityFactor,
                fuelType: 'Wood Chips (Generic)'
            },
            financial: { ...baseScenario }
        };
    }

    // ==========================================
    // CORE: CASH FLOW GENERATOR
    // ==========================================
    _generateCashFlowProjection(data) {
        const { production, capex, financialParams, technicalParams, type = 'SOLAR', scenario = 'BASE', silent = false } = data;

        const scenarioConfig = SIMULATION_CONSTANTS.SCENARIOS[scenario] || SIMULATION_CONSTANTS.SCENARIOS.BASE;
        const priceCap = scenarioConfig.PRICE_CAP;
        const configSection = SIMULATION_CONSTANTS[type] || SIMULATION_CONSTANTS.SOLAR;
        const years = technicalParams.lifetimeYears || 25;
        
        let energyInflation = (financialParams.energyInflation || SIMULATION_CONSTANTS.FINANCIAL.INFLATION_ENERGY) + scenarioConfig.INFLATION_ADJUSTMENT;

        // FINANCIAL CONSISTENCY FIX:
        // We are projecting NOMINAL Cash Flows (Inflation applied to Revenue and Opex).
        // Therefore, we must use a NOMINAL Discount Rate (WACC).
        // If the user provides a "Real" rate (e.g. 4-5%), we assume it is Real and add inflation.
        // Formula: (1 + r_nom) = (1 + r_real) * (1 + i)
        
        const realDiscountRate = financialParams.discountRate || SIMULATION_CONSTANTS.FINANCIAL.DISCOUNT_RATE;
        const nominalDiscountRate = ((1 + realDiscountRate) * (1 + energyInflation)) - 1;

        // VISUAL DEBUG HEADER
        if (!silent) {
             const _curr = (val) => val.toLocaleString('es-ES', { maximumFractionDigits: 0 });
             const _capacity = production.capacityKw || technicalParams.installedCapacityKw || technicalParams.peakPowerKw || technicalParams.capacityKw || 0;
             console.log(`\n╔══════════════════════════════════════════════════════════════════════════════════╗`);
             console.log(`║ 🚀 DETAILED SIMULATION TRACE: [${type.padEnd(8)}] SCENARIO: [${scenario.padEnd(10)}]`.padEnd(82) + `║`);
             console.log(`╠══════════════════════════════════════════════════════════════════════════════════╣`);
             console.log(`║ ⚙️  INPUT PARAMETERS:`.padEnd(82) + `║`);
             console.log(`║    • CAPEX:          ${_curr(capex)} €`.padEnd(82) + `║`);
             console.log(`║    • Capacity:       ${_capacity} kW`.padEnd(82) + `║`);
             console.log(`║    • Base Annual:    ${_curr(production.annualKwh)} kWh`.padEnd(82) + `║`);
             console.log(`║    • Elec. Price:    ${financialParams.electricityPrice} €/kWh`.padEnd(82) + `║`);
             console.log(`║    • Self Consump:   ${(financialParams.selfConsumptionRatio !== undefined ? financialParams.selfConsumptionRatio * 100 : 50).toFixed(1)} %`.padEnd(82) + `║`);
             console.log(`║    • Inflation:      ${((financialParams.energyInflation || 0.04) * 100).toFixed(1)} %`.padEnd(82) + `║`);
             console.log(`║    • Real Disc Rate: ${(realDiscountRate * 100).toFixed(1)} %`.padEnd(82) + `║`);
             console.log(`║    • Nom Disc Rate:  ${(nominalDiscountRate * 100).toFixed(1)} % (Used for NPV/LCOE)`.padEnd(82) + `║`);
             console.log(`║    • Lifetime:       ${years} Years`.padEnd(82) + `║`);
             console.log(`╠══════════════════════════════════════════════════════════════════════════════════╣`);
             console.log(`║ 📅 YEARLY CASH FLOW ANALYSIS:                                                    ║`);
             console.log(`╠══════╦══════════╦════════╦════════════╦══════════╦════════════╦════════════╦══════════╦════════════╦════════════╣`);
             console.log(`║ Year ║ Prod(kWh)║ Eff(%) ║ Price(€)   ║ Infl(%)  ║ Sav(€)     ║ Inc(€)     ║ Opx(€)   ║ Net(€)     ║ Cum(€)     ║`);
             console.log(`╠══════╬══════════╬════════╬════════════╬══════════╬════════════╬════════════╬══════════╬════════════╬════════════╣`);
        }
        let electricityPrice = financialParams.electricityPrice || SIMULATION_CONSTANTS.MARKET.GRID_PRICE;
        
        let defaultSurplusPrice = SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_SOLAR;
        if (type === 'WIND') defaultSurplusPrice = SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_WIND;
        let surplusPrice = financialParams.surplusPrice || defaultSurplusPrice;

        // Self Consumption Logic
        let defaultSelfConsumption = 0.5;
        if (type === 'WIND') {
             if (production.capacityKw > 100) defaultSelfConsumption = 0.0;
             else defaultSelfConsumption = SIMULATION_CONSTANTS.MARKET.SELF_CONSUMPTION_RATIO_WIND || 0.3;
        }
        const selfConsumptionRatio = (financialParams.selfConsumptionRatio !== undefined) ? financialParams.selfConsumptionRatio : defaultSelfConsumption;

        electricityPrice *= scenarioConfig.STARTING_PRICE_FACTOR;
        
        const degradation = technicalParams.degradationRate || 0.0055;

        // Opex
        let opexAnnual = financialParams.opexAnnual;
        if (!opexAnnual) {
             opexAnnual = capex * (configSection.FINANCIAL?.OPEX_PERCENTAGE || 0.015);
        }

        let cashFlows = [];
        let cumulativeCashFlow = -capex;
        
        cashFlows.push({
            year: 0,
            revenue: 0,
            expenses: capex,
            netFlow: -capex,
            cumulative: cumulativeCashFlow
        });

        let paybackPeriod = null;
        let cumulativeSavings = 0;

        // Climate state (start points)
        let currentAvgTemp = 15.0; 
        let currentWindAvg = (type === 'WIND' && technicalParams.meanWindSpeed) ? technicalParams.meanWindSpeed : 5.0;
        let currentIrradiation = 1000;

        for (let year = 1; year <= years; year++) {
            // 1. Climate Drill
            currentAvgTemp += 0.05; 
            const windVariability = (Math.random() * 0.16) - 0.08; 
            currentWindAvg *= (1.0 + windVariability);
            currentIrradiation = 1000 + (Math.random() * 40 - 20);

            // 2. Efficiency Factors
            let efficiencyFactor = 1.0; 
            if (type === 'SOLAR') {
                const predictedPR = aiService.predictPerformanceRatio(currentAvgTemp, currentIrradiation, currentWindAvg);
                efficiencyFactor = (predictedPR / 0.85) * (currentIrradiation / 1000);
            } else if (type === 'WIND') {
                // If it's wind, 'production.annualKwh' is based on avg speed.
                // We adjust year-by-year based on density and wind fluctuation.
                // Simple approach: Power ~ v^3. 
                // Ratio = (CurrentSpeed / BaseSpeed)^3
                // But we must be careful with huge variations.
                const speedRatio = currentWindAvg / technicalParams.meanWindSpeed;
                efficiencyFactor = Math.pow(speedRatio, 2.5); // Use 2.5 exponent
            }
            
            const ageDegradation = Math.pow(1 - degradation, year - 1);
            const finalProduction = production.annualKwh * ageDegradation * efficiencyFactor;
            
            // 3. Economy
            const inflationFactor = Math.pow(1 + energyInflation, year - 1);
            const marketVolatility = 1 + (Math.random() * 0.1 - 0.05); // +/- 5%
            
            // INFLATION FIX: Price Cap should also inflate, otherwise real revenue crashes over 20 years
            const inflatedPriceCap = priceCap * Math.pow(1 + SIMULATION_CONSTANTS.FINANCIAL.INFLATION_ENERGY, year - 1);
            
            let yearPriceGrid = electricityPrice * inflationFactor * marketVolatility; 
            if (yearPriceGrid > inflatedPriceCap) yearPriceGrid = inflatedPriceCap;
            
            const yearPriceSurplus = surplusPrice * inflationFactor * marketVolatility;

            // 4. Flows
            // FIX: Using full production for financial calculations
            // Previously: There was a suspicion of double-counting self-consumption ratio
            
            const selfConsumedEnergy = finalProduction * selfConsumptionRatio;
            const exportedEnergy = finalProduction - selfConsumedEnergy;
            
            const savings = selfConsumedEnergy * yearPriceGrid;
            const income = exportedEnergy * yearPriceSurplus; 
            const totalRevenue = savings + income;

            // 5. Costs
            let yearOpex = opexAnnual * Math.pow(1 + SIMULATION_CONSTANTS.FINANCIAL.INFLATION_MAINTENANCE, year - 1);
            let replacementCost = 0;
            if (year === 12 && type === 'SOLAR') replacementCost = capex * 0.15; 
            const totalExpenses = yearOpex + replacementCost;

            const netFlow = totalRevenue - totalExpenses;
            cumulativeCashFlow += netFlow;
            cumulativeSavings += totalRevenue;

            // DEBUG: Year Calculation Log (Visual Table Row)
            if (!silent) {
                const _pad = (val, len) => val.toString().padStart(len);
                // Ensure we log the ACTUAL production used for calculation
                const row = `║ ${_pad(year,4)} ║ ${_pad(finalProduction.toFixed(0),8)} ║ ${_pad((efficiencyFactor*100).toFixed(1),6)} ║ ${_pad(yearPriceGrid.toFixed(3),10)} ║ ${_pad(((inflationFactor-1)*100).toFixed(1),8)} ║ ${_pad(savings.toFixed(0),10)} ║ ${_pad(income.toFixed(0),10)} ║ ${_pad(totalExpenses.toFixed(0),8)} ║ ${_pad(netFlow.toFixed(0),10)} ║ ${_pad(cumulativeCashFlow.toFixed(0),10)} ║`;
                console.log(row);
            }

            if (paybackPeriod === null && cumulativeCashFlow >= 0) {
                const prevCumulative = cashFlows[year-1].cumulative;
                paybackPeriod = (year - 1) + (Math.abs(prevCumulative) / netFlow);
            }

            cashFlows.push({
                year,
                production: finalProduction,
                savings: savings,
                income: income, 
                opex: totalExpenses,
                netFlow: netFlow,
                cumulative: cumulativeCashFlow
            });
        }

        if (!silent) {
            console.log(`╚══════╩══════════╩════════╩════════════╩════════════╩════════════╩════════════╩════════════╝`);
        }

        const npv = this._calculateNPV(-capex, cashFlows.slice(1).map(c => c.netFlow), nominalDiscountRate);
        const irr = this._calculateIRR([-capex, ...cashFlows.slice(1).map(c => c.netFlow)]);
        
        let discountedCosts = capex; 
        let discountedEnergy = 0;
        let totalLifetimeCost = capex;
        let totalLifetimeProduction = 0;

        cashFlows.forEach(c => {
            if (c.year === 0) return;
            
            // Financial LCOE (Nominal Discounting)
            const discFactor = Math.pow(1 + nominalDiscountRate, c.year);
            discountedCosts += (c.opex || 0) / discFactor;
            discountedEnergy += (c.production || 0) / discFactor;

            // Technical LCOE (Undiscounted - Real Cost per kWh generated)
            totalLifetimeCost += (c.opex || 0);
            totalLifetimeProduction += (c.production || 0);
        });
        
        const dlcoe = (discountedEnergy > 0) ? (discountedCosts / discountedEnergy) : 0; // Discounted LCOE
        const lcoe = (totalLifetimeProduction > 0) ? (totalLifetimeCost / totalLifetimeProduction) : 0; // Technical LCOE
        
        const totalFlowsRevenue = cashFlows.reduce((acc,c) => acc + (c.savings||0) + (c.income||0), 0);
        const totalFlowsExpenses = cashFlows.reduce((acc,c) => acc + (c.opex||0), 0);
        const roi = ((totalFlowsRevenue - totalFlowsExpenses - capex) / capex) * 100;

        // DEBUG TABLE FOOTER
        if (!silent) {
            console.log(`╚══════╩══════════╩════════╩════════════╩══════════╩════════════╩════════════╩══════════╩════════════╩════════════╝`);
            console.log(`║ 🏁 FINAL METRICS:                                                                                ║`);
            console.log(`║    • NPV: ${(npv).toLocaleString('es-ES',{style:'currency', currency:'EUR'}).padEnd(16)} | • IRR: ${(irr*100).toFixed(2)}%`.padEnd(30) + ` | • ROI: ${roi.toFixed(1)}%`.padEnd(46) + `║`);
            console.log(`║    • LCOE (Tech): ${lcoe.toFixed(4)} €/kWh | • DLCOE (Fin): ${dlcoe.toFixed(4)} €/kWh`.padEnd(82) + `║`);
            console.log(`║    • Payback: ${paybackPeriod ? paybackPeriod.toFixed(1) + ' Years' : 'Never'} `.padEnd(82) + `║`);
            console.log(`╚══════════════════════════════════════════════════════════════════════════════════════════════════╝`);
        }

        return {
            scenario,
            cashFlows,
            metrics: {
                roi: parseFloat(roi.toFixed(2)),
                paybackPeriod: paybackPeriod ? parseFloat(paybackPeriod.toFixed(1)) : null,
                npv: parseFloat(npv.toFixed(2)),
                irr: parseFloat((irr * 100).toFixed(2)),
                lcoe: parseFloat(lcoe.toFixed(4)),      // Technical
                dlcoe: parseFloat(dlcoe.toFixed(4)),    // Financial
                totalSavings: parseFloat(cumulativeSavings.toFixed(2))
            }
        };
    }

    // ==========================================
    // HELPERS
    // ==========================================
    _calculateSolarCapex(costs, capacityKw) {
        if (costs?.totalOverride) return costs.totalOverride;
        const defaultCostPerKw = SIMULATION_CONSTANTS.SOLAR.FINANCIAL.DEFAULT_CAPEX_PER_KW || 1300; 
        return capacityKw * (costs?.costPerKw || defaultCostPerKw);
    }
    
    _calculateWindCapex(costs, capacityKw) {
        if (costs?.totalOverride) return costs.totalOverride;
        const defaultCostPerKw = SIMULATION_CONSTANTS.WIND.FINANCIAL.DEFAULT_CAPEX_PER_KW || 1500;
        return capacityKw * (costs?.costPerKw || defaultCostPerKw);
    }

    _calculateNPV(initialInvestment, flows, rate) {
        return initialInvestment + flows.reduce((acc, val, i) => acc + val / Math.pow(1 + rate, i + 1), 0);
    }

    _calculateIRR(values, guess = 0.1) {
        const maxIter = 1000;
        const precision = 1e-5;
        let rate = guess;
        for (let i = 0; i < maxIter; i++) {
            let npv = 0, d_npv = 0;
            for (let j = 0; j < values.length; j++) {
                npv += values[j] / Math.pow(1 + rate, j);
                d_npv -= j * values[j] / Math.pow(1 + rate, j + 1);
            }
            if (d_npv === 0) return rate; 
            const newRate = rate - npv / d_npv;
            if (Math.abs(newRate - rate) < precision) return newRate;
            rate = newRate;
        }
        return rate;
    }

    _adjustWindSpeedForHeight(refSpeed, refHeight, targetHeight, roughness) {
        if (!targetHeight || targetHeight <= 0) return refSpeed;
        const alpha = roughness || 0.143;
        return refSpeed * Math.pow(targetHeight / refHeight, alpha);
    }

    _calculateWeibullProduction(avgWindSpeed, capacityKw, airDensity) {
        const k = 2.0; 
        const c = avgWindSpeed / 0.886; // Approx for k=2
        
        let totalWeightedPower = 0;
        for (let v = 0; v <= 30; v += 0.5) {
            const prob = PhysicsEngine.getWeibullProbability(v, k, c) * 0.5;
            let power = PhysicsEngine.getTurbinePowerOutput(v, capacityKw);
            
            // Density correction (linear approx)
            power *= (airDensity / 1.225);
            
            totalWeightedPower += power * prob;
        }
        return totalWeightedPower * 24; 
    }
}

module.exports = new SimulationService();
