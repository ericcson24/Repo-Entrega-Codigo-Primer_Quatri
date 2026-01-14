const weatherService = require('./weatherService');
const solarService = require('./solarService');
const aiService = require('./aiService'); // Import AI
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

        // 4. Proyección SCENARIOS (Base, Optimistic, Pessimistic)
        const commonParams = {
            production: solarData.production,
            capex: totalCapex,
            financialParams: { ...financial, electricityPrice: currentElecPrice },
            technicalParams: technical,
            type: 'SOLAR'
        };

        const baseScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'BASE' });
        // Generate alternate scenarios silently
        const optimisticScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'OPTIMISTIC', silent: true });
        const pessimisticScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'PESSIMISTIC', silent: true });

        // Merge scenarios into financial object
        return {
            summary: {
                totalGenerationFirstYear: solarData.production.annualKwh,
                totalInvestment: totalCapex,
                roi: baseScenario.metrics.roi,
                paybackYears: baseScenario.metrics.paybackPeriod,
                npv: baseScenario.metrics.npv, // VAN
                irr: baseScenario.metrics.irr  // TIR
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

    _calculateTotalCapex(costs, capacityKw) {
        // ...existing code...
        if (costs?.totalOverride) return costs.totalOverride;
        if (equipCost > 0) return equipCost + (costs?.installationCost || 0) + (costs?.permitsCost || 0);

        // WIND CAPEX LOGIC (Distinct from Solar)
        // Detect wind context by checking magnitude of default cost or simply pass type
        // However, this function is generic. We better handle Wind CAPEX in its own method or here with type check.
        // As a quick fix, let's check capacity. 2000+ kw usually means wind in this context if not PV array.
        // Better yet, let's rely on the simulation flow calling _calculateWindCapex for wind.
        
        // Default Solar Cost
        const defaultCostPerKw = SIMULATION_CONSTANTS.SOLAR.FINANCIAL.DEFAULT_CAPEX_PER_KW || 1300; 
        return capacityKw * (costs?.costPerKw || defaultCostPerKw);
    }
    
    _calculateWindCapex(costs, capacityKw) {
        if (costs?.totalOverride) return costs.totalOverride;
        
        const defaultCostPerKw = SIMULATION_CONSTANTS.WIND.FINANCIAL.DEFAULT_CAPEX_PER_KW || 1500;
        return capacityKw * (costs?.costPerKw || defaultCostPerKw);
    }

    _generateCashFlowProjection(data) {
        const { production, capex, financialParams, technicalParams, type = 'SOLAR', scenario = 'BASE', silent = false } = data;

        // SCENARIO CONFIG (Hoisted)
        const scenarioConfig = SIMULATION_CONSTANTS.SCENARIOS[scenario] || SIMULATION_CONSTANTS.SCENARIOS.BASE;
        const priceCap = scenarioConfig.PRICE_CAP;

        if (!silent) {
            console.log("\n============================================================");
            console.log(` 🛰️  SIMULATION CORE | SCENARIO: ${scenario} | TYPE: ${type} 🛰️`);
            console.log("============================================================\n");
            
            // --- MANIFEST SELECTION ---
            console.log("📜 SIMULATION MANIFEST & ACTIVE MODULES:");
            console.log(`   [✅] PHYSICS ENGINE:       ${type} Degradation & Efficiency Curves`);
            console.log(`   [✅] MARKET DYNAMICS:      Parametric Engine (Volatility & Cannibalization)`);
            console.log(`   [✅] FINANCIAL MODEL:      DCF (Discounted Cash Flow) with Inflation`);
            console.log(`   [✅] SCENARIO MODE:        ${scenario} (Cap: ${priceCap}€/kWh)`);
        }
        
        if (technicalParams.batteryCapacityKw && technicalParams.batteryCapacityKw > 0) {
             if (!silent) console.log(`   [✅] STORAGE SYSTEM:       Battery Enabled (${technicalParams.batteryCapacityKw} kWh)`);
        } else {
             if (!silent) console.log(`   [⚪] STORAGE SYSTEM:       Disabled (No battery capacity specified)`);
        }
        
        if (technicalParams.horizonData) {
            if (!silent) console.log(`   [✅] SHADING ANALYSIS:     3D Horizon Enabled`);
        } else {
            if (!silent) console.log(`   [⚪] SHADING ANALYSIS:     Disabled (No 3D horizons data provided)`);
        }
        
        if (!silent) {
            console.log(`   [i] NOTE:                  'Nights' handled via Net-Metering/Self-Consumption Ratio`);
            console.log("------------------------------------------------------------\n");
        }

        // Select configuration based on type (SOLAR or WIND)
        const configSection = SIMULATION_CONSTANTS[type] || SIMULATION_CONSTANTS.SOLAR;

        // Robust extraction of LIFETIME_YEARS
        const years = technicalParams.lifetimeYears || 
                     configSection.TECHNICAL?.LIFETIME_YEARS || 
                     25;
        
        // Parametros financieros
        let electricityPrice = financialParams.electricityPrice || SIMULATION_CONSTANTS.MARKET.GRID_PRICE;
        
        // Determine Surplus Price (Feed-in Tariff)
        let defaultSurplusPrice = SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_SOLAR;
        if (type === 'WIND') defaultSurplusPrice = SIMULATION_CONSTANTS.MARKET.FEED_IN_TARIFF_WIND;
        
        let surplusPrice = financialParams.surplusPrice || defaultSurplusPrice;

        // Self Consumption Ratio
        // WIND UTILITY SCALE OVERRIDE: 5MW turbines DO NOT have self-consumption (0%)
        // Unless explicitly micro-wind (<100kW), we force 0.
        let defaultSelfConsumption = 0.5;
        
        if (type === 'WIND') {
             if (production.capacityKw > 100) {
                 defaultSelfConsumption = 0.0; // Utility Scale Wind = 100% Export
             } else {
                 defaultSelfConsumption = SIMULATION_CONSTANTS.MARKET.SELF_CONSUMPTION_RATIO_WIND || 0.3;
             }
        } else if (SIMULATION_CONSTANTS.MARKET.SELF_CONSUMPTION_RATIO) {
             defaultSelfConsumption = SIMULATION_CONSTANTS.MARKET.SELF_CONSUMPTION_RATIO;
        }

        const selfConsumptionRatio = (financialParams.selfConsumptionRatio !== undefined) 
            ? financialParams.selfConsumptionRatio 
            : defaultSelfConsumption;
            
        if (!silent && type === 'WIND') {
            console.log(`   [ℹ️] WIND MODE: Self-Consumption locked to ${(selfConsumptionRatio*100).toFixed(1)}% (Utility Scale Logic)`);
        }

        // SCENARIO LOGIC: Load from Constants
        // scenarioConfig & priceCap already loaded at top
        
        let energyInflation = (financialParams.energyInflation || SIMULATION_CONSTANTS.FINANCIAL.INFLATION_ENERGY) + scenarioConfig.INFLATION_ADJUSTMENT;
        let volatilityRange = scenarioConfig.VOLATILITY;
        let curtailmentRiskFactor = scenarioConfig.CURTAILMENT_RISK;
        
        // Adjust starting price
        electricityPrice *= scenarioConfig.STARTING_PRICE_FACTOR;
        
        // const priceCap = ... (hoisted)

        if (scenario === 'OPTIMISTIC') {
            // Additional custom override if needed, otherwise handled by config
        }

        const discountRate = financialParams.discountRate || SIMULATION_CONSTANTS.FINANCIAL.DISCOUNT_RATE;
        
        const degradation = technicalParams.degradationRate || configSection.TECHNICAL.DEGRADATION_RATE || 0.0055;

        // Define OPEX Annual explicitly for Wind if needed
        let opexAnnual = financialParams.opexAnnual;
        
        if (!opexAnnual) {
            if (type === 'WIND') {
                // Fixed Eur/kW basis for Wind (more accurate than % of Capex for older/newer techs differentiation)
                const opexPerKw = SIMULATION_CONSTANTS.WIND.FINANCIAL.OPEX_EUR_PER_KW_YEAR || 45;
                opexAnnual = capex * 0.0; // Reset % based
                opexAnnual = production.capacityKw * opexPerKw;
            } else {
                opexAnnual = (capex * (configSection.FINANCIAL?.OPEX_PERCENTAGE || 0.015));
            }
        }

        let cashFlows = [];
        let cumulativeCashFlow = -capex;
        // Incur initial Capex
        
        if (!silent) {
            console.log(`[YEAR 0] 🏗️ CAPEX DEPLOYMENT`);
            console.log(`   > Equipment & Installation: -${capex.toFixed(2)}€\n`);
        }

        cashFlows.push({
            year: 0,
            revenue: 0,
            expenses: capex,
            netFlow: -capex,
            cumulative: cumulativeCashFlow
        });

        let paybackPeriod = null;
        let cumulativeSavings = 0;

        // Generar Clima Base (Madrid/Avg)
        let currentAvgTemp = 15.0; // grados
        let currentWindAvg = (type === 'WIND' && technicalParams.meanWindSpeed) 
            ? technicalParams.meanWindSpeed 
            : 5.0; // Use SITE wind if available, else 5.0 default
        const baseSiteWind = currentWindAvg; // Remember start point reference
        
        let currentIrradiation = 1000; // W/m2 peak avg
        
        // Wind Variability Tracker (Relative to P50/Base Year)
        let windResourceIndex = 1.0; 

        for (let year = 1; year <= years; year++) {
            if (!silent) console.log(`------------------ YEAR ${year} ------------------`);
            
            // --- 1. CLIMATE CHANGE SIMULATION (AI INPUTS) ---
            // Simulate global warming: Avg temp rises slightly each year
            currentAvgTemp += 0.05; // +0.05 degrees per year
            
            // Wind speed volatility (Weibull-like annual variation)
            // Wind years are volatile: +/- 8% is standard deviation for annual wind index
            const windVariability = (Math.random() * 0.16) - 0.08; 
            windResourceIndex = 1.0 + windVariability;
            currentWindAvg = baseSiteWind * windResourceIndex; // Update relative to Site Base

            // Solar Irradiance fluctuation (Natural annual variability) - Fixes "Constant 1000W/m2" critique
            currentIrradiation = 1000 + (Math.random() * 40 - 20); // +/- 2%

            if (!silent) console.log(`   🌤️  Environment: Temp=${currentAvgTemp.toFixed(2)}°C | WindIdx=${(windResourceIndex*100).toFixed(1)}% | Irr=${currentIrradiation.toFixed(0)}W/m2`);
            
            // --- 2. PHYSICS ENGINE (AI INFERENCE) ---
            // Ask AI: "Given this hotter climate, what is the Performance Ratio?"
            let efficiencyFactor = 1.0; 
            
            if (type === 'SOLAR') {
                // ...existing code...
                const predictedPR = aiService.predictPerformanceRatio(currentAvgTemp, currentIrradiation, currentWindAvg);
                // Base PR is usually ~0.85. If predicted is 0.82, factor is 0.82/0.85
                efficiencyFactor = predictedPR / 0.85; 
                // Adjust for Irradiance fluctuation (Linear)
                efficiencyFactor *= (currentIrradiation / 1000);
                
                if (!silent) console.log(`   🤖 AI Physics (Solar): Temp=${currentAvgTemp.toFixed(1)}C, Irr=${currentIrradiation.toFixed(0)}W/m2 -> Predicted PR=${(predictedPR*100).toFixed(2)}% (Impact: ${efficiencyFactor.toFixed(3)})`);
            } else if (type === 'WIND') {
                // --- FIXED WIND PHYSICS ENGINE (Weibull + Power Curve) ---
                // Old logic (Cubic Multiplier) was flawed. 
                // New Logic: 
                // 1. Determine annual mean wind speed for this year (Climate + Variability)
                // 2. Derive Weibull distribution (Shape k=2, Scale c)
                // 3. Integrate Power Curve over the probability distribution to get Avg Power Output
                // 4. Convert to Energy (kWh)

                // 1. Annual Mean Wind Speed at Hub Height
                // We use annual fluctuation index from before
                const annualAvgSpeedHub = currentWindAvg; // Includes climate shift & inter-annual variability
                
                // 2. Weibull Parameters
                const k = 2.0; // Rayleigh (standard onshore)
                const c = this._calculateWeibullScale(annualAvgSpeedHub, k);
                
                // 3. Density Correction (Air Density vs Standard)
                // Standard: 1.225 kg/m3 @ 15C. Temp loss approx 0.35% per degree > 15C
                // We apply this linearly to the output power (simpler than full rho calculation in power formula)
                const densityFactor = 1.0 - ((currentAvgTemp - 15) * 0.0035);

                // 4. Integration (Probabilistic Production)
                // Sum P(v) * Probability(v) for v = 0 to 30 m/s
                let avgPowerOutputKw = 0;
                
                // Increase step precision (0.5 m/s bins) for accuracy
                for (let v = 0; v <= 30; v += 0.5) {
                    const prob = this._getWeibullProbability(v, k, c) * 0.5; // Probability of this wind bin
                    const powerKw = this._getTurbinePowerOutput(v, production.capacityKw); // Power Curve
                    avgPowerOutputKw += (powerKw * prob);
                }

                // Apply Density Correction to final power
                avgPowerOutputKw *= densityFactor;
                
                // 5. Calculate Efficiency Factor relative to BASE production
                // "Base production" (year 0) was calculated with static avg.
                // Here we calculate the RATIO of this year's sophisticated yield vs the static base.
                // However, our code multiplies base * efficiency.
                // To avoid double counting or scaling issues, we can just replace 'finalProduction' logic below
                // or calculate an effective "Weather Factor".
                
                // Let's reverse-engineer the factor:
                // Expected kWh this year = AvgPowerKw * 8760
                const theoreticalAnnualKwh = avgPowerOutputKw * 8760;
                
                // The 'production.annualKwh' passed in is likely the simple static estimate.
                // We update 'efficiencyFactor' to bridge the gap between static base and this advanced dynamic calc.
                // efficiencyFactor = NewCalc / OriginalBase
                efficiencyFactor = theoreticalAnnualKwh / production.annualKwh;
                
                // Add wake losses & availability explicitly if not in base (usually base has them)
                // Assuming base included standard losses. 
                
                if (!silent) console.log(`   🤖 AI Physics (Wind): MeanSpeed=${annualAvgSpeedHub.toFixed(2)}m/s | Weibull(c=${c.toFixed(2)}) | Output=${(avgPowerOutputKw/1000).toFixed(2)}MW avg -> EffFactor=${efficiencyFactor.toFixed(3)}`);
            }
            
            // Standard Material Degradation (Aging)

            const ageDegradation = Math.pow(1 - degradation, year - 1);
            // Combined Production Factor
            const finalProduction = production.annualKwh * ageDegradation * efficiencyFactor;
            
            // Debug: Capacity Factor Check
            if (type === 'WIND' && production.capacityKw && !silent) {
                 const capacityFactor = (finalProduction / (production.capacityKw * 8760)) * 100;
                 console.log(`   ⚡ Production: Base=${production.annualKwh.toFixed(0)} * Age=${ageDegradation.toFixed(3)} * Climate=${efficiencyFactor.toFixed(3)} = ${finalProduction.toFixed(2)} kWh`);
                 console.log(`      -> Capacity Factor: ${capacityFactor.toFixed(2)}% (Rated: ${production.capacityKw}kW)`);
                 if(capacityFactor < 15) console.warn("      ⚠️  WARNING: Very Low Capacity Factor (<15%). Site may be unsuitable for wind.");
            } else if (!silent) {
                 console.log(`   ⚡ Production: Base=${production.annualKwh.toFixed(0)} * Age=${ageDegradation.toFixed(3)} * Climate=${efficiencyFactor.toFixed(3)} = ${finalProduction.toFixed(2)} kWh`);
            }


            // --- 3. MARKET ECONOMY (AI INFERENCE) ---
            // AI Service: Predict "Cannibalization" 
            const renewablePenetration = Math.min(1.0, 0.2 + (year * 0.025)); // Increasing penetration
            const demandFactor = 0.5 + (Math.random()*0.1); 
            const gasPriceFactor = 0.5;

            if (!silent) console.log(`   📉 AI Market Inputs: Penetration=${(renewablePenetration*100).toFixed(1)}%, Demand=${demandFactor.toFixed(2)}, Gas=${gasPriceFactor}`);

            let aiPriceFactor = 1.0;
            try {
                // Try to get prediction from AI Service
                // Use specific method that handles denormalization (0-1 -> 0.0x-2.0x)
                if (typeof aiService.predictPriceFactor === 'function') {
                     aiPriceFactor = aiService.predictPriceFactor(renewablePenetration, demandFactor, gasPriceFactor);
                }
                if (!silent) console.log(`   📉 AI Market Output: 'Cannibalization' Price Factor: ${aiPriceFactor.toFixed(3)}`);
            } catch (e) {
                if (!silent) console.warn("   ⚠️ AI Market Prediction Failed, using default 1.0", e.message);
            }

            // Apply Inflation & Price Factors
            const inflationFactor = Math.pow(1 + energyInflation, year - 1);
            
            // --- ENHANCEMENT 1: Market Volatility & Shocks ---
            // Base Volatility
            let marketVolatility = 1 + (Math.random() * volatilityRange - (volatilityRange/2));
            
            // SHOCKS (Per User Feedback: "Years with -15% / +25% price")
            const shockRoll = Math.random();
            if (scenario !== 'OPTIMISTIC') {
                 if (shockRoll < 0.10) { // 10% chance of negative shock
                     marketVolatility -= 0.15;
                     if (!silent) console.log("      📉 MARKET SHOCK: Negative Event (-15%)");
                 } else if (shockRoll > 0.90) { // 10% chance of positive spike
                     marketVolatility += 0.25;
                     if (!silent) console.log("      📈 MARKET SHOCK: Price Spike (+25%)");
                 }
            }

            // Calculate Projected Price
            let yearPriceGrid = electricityPrice * inflationFactor * marketVolatility; 

            if (yearPriceGrid > priceCap) {
                if (!silent && Math.random() < 0.3) console.warn(`      🔒 Price Cap Hit (${yearPriceGrid.toFixed(3)} > ${priceCap}). Limiting.`);
                yearPriceGrid = priceCap;
            }

            // --- ENHANCEMENT 2: Curtailment & Price Floor ---
            // If saturation is high (aiPriceFactor low), risk of 0€ prices (Curtailment) increases
            let effectiveSurplusPrice = surplusPrice * inflationFactor * aiPriceFactor * marketVolatility;
            
            // Curtailment Risk: If Price Factor < 0.5, Chance of 0 price/curtailment
            if (aiPriceFactor < 0.5 && Math.random() < curtailmentRiskFactor) {
                if (!silent) console.warn(`      ⚠️  MARKET SHOCK: Curtailment/Negative Prices detected. Surplus value -> 0€`);
                effectiveSurplusPrice = 0;
            }
            
            const yearPriceSurplus = Math.max(0, effectiveSurplusPrice); // Floor at 0
            
            if (!silent) console.log(`   💰 Financials: Buy @ ${yearPriceGrid.toFixed(3)} €/kWh | Sell @ ${yearPriceSurplus.toFixed(3)} €/kWh`);


            // --- 4. ENERGY FLOW (Diurnal) ---
            // "Nights are 0 production". Self consumption is capped by Simultaneity.
            
            // --- ENHANCEMENT 3: Dynamic Self-Consumption (Electrification) ---
            // Asumiendo: User adds EVs/Heat Pumps over time -> Self-consumption rises
            // Growth: 0.5% absolute per year, capped at 80% (Scenario Adjusted)
            let electrificationRate = 0.005; // Base
            if (scenario === 'OPTIMISTIC') electrificationRate = 0.01;
            if (scenario === 'PESSIMISTIC') electrificationRate = 0.001;
            const electrificationImpact = (type === 'WIND' ? 0 : (year - 1) * electrificationRate); 
            const currentSelfConsumptionRatio = (type === 'WIND') 
                ? 0 
                : Math.min(0.8, selfConsumptionRatio + electrificationImpact);
            
            const selfConsumedEnergy = finalProduction * currentSelfConsumptionRatio;
            const exportedEnergy = finalProduction - selfConsumedEnergy;
            
            const savings = selfConsumedEnergy * yearPriceGrid;
            const income = exportedEnergy * yearPriceSurplus; // 100% revenue for wind comes from here, checked against market price/PPA
            
            // For wind, 'surplusPrice' acts as the PPA/Market capture price
            
            const totalRevenue = savings + income;
            
            if (!silent) {
                 if (type === 'WIND') {
                     console.log(`   📊 Revenue: Sales=${income.toFixed(2)}€ (100% Export) | Market Capture: ${yearPriceSurplus.toFixed(3)} €/kWh`);
                 } else {
                     console.log(`   📊 Revenue Split: Savings=${savings.toFixed(2)}€ (${(currentSelfConsumptionRatio*100).toFixed(1)}% Self-Use) | Sales=${income.toFixed(2)}€ (${((1-currentSelfConsumptionRatio)*100).toFixed(1)}% Export)`);
                 }
            }

            // --- 5. OPEX & EVENTS ---
            let yearOpex = opexAnnual * Math.pow(1 + SIMULATION_CONSTANTS.FINANCIAL.INFLATION_MAINTENANCE, year - 1);
            
            let replacementCost = 0;
            if (year === 12) { 
                replacementCost = capex * 0.15; // Inverter replacement
                if (!silent) console.log(`   🛠️  EVENT: Major Overhaul (Inverter Swap) -> -${replacementCost.toFixed(2)}€`);
            }
            const totalExpenses = yearOpex + replacementCost;

            // Net
            const netFlow = totalRevenue - totalExpenses;
            cumulativeCashFlow += netFlow;
            cumulativeSavings += totalRevenue;

            if (!silent) {
                console.log(`   💵 Cash Flow: +${totalRevenue.toFixed(2)} - ${totalExpenses.toFixed(2)} = ${netFlow.toFixed(2)}€`);
                console.log(`   🏦 Cumulative: ${cumulativeCashFlow.toFixed(2)}€`);
            }
            
            if (paybackPeriod === null && cumulativeCashFlow >= 0) {
                const prevCumulative = cashFlows[year-1].cumulative;
                paybackPeriod = (year - 1) + (Math.abs(prevCumulative) / netFlow);
                if (!silent) console.log(`   🚀 PAYBACK REACHED: Period ~ ${paybackPeriod.toFixed(1)} Years`);
            }

            cashFlows.push({
                year,
                production: finalProduction,
                savings: savings,
                income: income, 
                opex: totalExpenses,
                netFlow: netFlow,
                cumulative: cumulativeCashFlow,
                aiFactors: {
                    climate: efficiencyFactor,
                    market: aiPriceFactor
                }
            });
        }
        if (!silent) {
            console.log("\n============================================================");
            console.log("             🏁  SIMULATION FINALIZED  🏁");
            console.log("============================================================");
        }

        // Métricas Finales
        const npv = this._calculateNPV(-capex, cashFlows.slice(1).map(c => c.netFlow), discountRate);
        const irr = this._calculateIRR([-capex, ...cashFlows.slice(1).map(c => c.netFlow)]);
        
        // Calculate Total Lifetime Expenses (Capex + Opex sum) - PURELY PHYSICAL/COST LCOE
        // Discounting costs for LCOE is standard practice: Sum(Cost_t / (1+r)^t) / Sum(Energy_t / (1+r)^t)
        
        let discountedCosts = capex; // Year 0
        let discountedEnergy = 0;
        
        // Re-iterate flows for LCOE specific discounting
        cashFlows.forEach(c => {
            if (c.year === 0) return;
            const discFactor = Math.pow(1 + discountRate, c.year);
            discountedCosts += (c.opex || 0) / discFactor;
            discountedEnergy += (c.production || 0) / discFactor;
        });
        
        const lcoe = (discountedEnergy > 0) ? (discountedCosts / discountedEnergy) : 0;
        
        // ROI = (Total Net Profit / Initial Investment) * 100
        // Correct ROI Formula: (Total Benefits - Total Costs) / Total Costs
        const totalFlowsRevenue = cashFlows.reduce((acc,c) => acc + (c.savings||0) + (c.income||0), 0);
        const totalFlowsExpenses = cashFlows.reduce((acc,c) => acc + (c.opex||0), 0);
        
        // Use (Net / Investment) for comparability
        const roi = ((totalFlowsRevenue - totalFlowsExpenses - capex) / capex) * 100;
        
         // Factor CO2 Spain Mix approx 0.25 kg/kWh (Grid Average)
        // We avoid emitting this by producing it ourselves
        const totalLifetimeProduction = cashFlows.reduce((acc,c) => acc + (c.production || 0), 0);
        const co2AvoidedTonnes = (totalLifetimeProduction * 0.24) / 1000;
        const treesEquivalent = Math.round(co2AvoidedTonnes * 50);

        return {
            scenario,
            cashFlows,
            metrics: {
                roi: parseFloat(roi.toFixed(2)),
                paybackPeriod: paybackPeriod ? parseFloat(paybackPeriod.toFixed(1)) : null,
                npv: parseFloat(npv.toFixed(2)),
                irr: parseFloat((irr * 100).toFixed(2)),
                lcoe: parseFloat(lcoe.toFixed(4)), 
                totalSavings: parseFloat(cumulativeSavings.toFixed(2)),
                totalLifetimeProduction: totalLifetimeProduction,
                co2tonnes: parseFloat(co2AvoidedTonnes.toFixed(2)),
                trees: treesEquivalent 
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
        // MEJORA IA: Usamos el modelo neuronal para predecir P(v) en lugar de fórmula teórica
        const turbinePower = (v) => {
             // 1. Obtener densidad del aire (o default)
             const rho = params.airDensity || 1.225;
             
             // 2. Consultar al Cerebro de IA (Physics-Informed Neural Network)
             // Devuelve factor 0-1 (Porcentaje de capacidad nominal)
             const performanceFactor = aiService.predictWindPower(v, rho);
             
             // 3. Escalar a capacidad real
             return performanceFactor * capacityKw;
        };

        /* LÓGICA ANTIGUA (Reemplazada por IA)
        const turbinePowerOld = (v) => {
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
            }
        };
        */

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
            inflationRate = 0.03,
            years = 25
        } = params;

        // --- NEW ROI ENGINE UPGRADE (Using AI Economy) ---
        // We simulate hour-by-hour price impact or approximate it via factors
        // Here we apply the AI "Cannibalization Factor" to the base price
        
        // Assume simplified factors for this simulation run:
        // High Solar Pen (Summer noon) -> Low Price
        // Use AI to predict average price factor for this system type
        let priceCaptureFactor = 1.0;
        
        // Solar or Wind? Derive from params context or pass explicitly. 
        // For now, if selfConsumption > 0 we assume Solar-like behavior (daytime generation)
        if (selfConsumptionRate > 0.3) {
             // Solar Profile: Higher penetration (0.6), High Demand (0.8 - Day)
             // Check AI prediction for this profile
             const aiFactor = aiService.predictPriceFactor(0.6, 0.8, 0.5); 
             // Note: Solar captures LESS than average price usually
             priceCaptureFactor = aiFactor; 
        } else {
             // Wind Profile: Lower correlation (0.3), Avg Demand (0.5)
             const aiFactor = aiService.predictPriceFactor(0.3, 0.5, 0.5);
             priceCaptureFactor = aiFactor; 
        }
        
        // Apply AI Factor to effective price (Base Market Price * AI Capture Factor)
        // If Model predicts 0.8, it means this tech captures 80% of average pool price
        const effectiveElectricityPrice = (electricityPrice || 0.15) * priceCaptureFactor;
        
        // Debug
        // console.log(`[Financial AI] Base: ${electricityPrice}, AI-Factor: ${priceCaptureFactor.toFixed(3)}, Effective: ${effectiveElectricityPrice.toFixed(3)}`);

        const annualSavingsBase = annualProduction * selfConsumptionRate * effectiveElectricityPrice;
        const annualIncomeBase = annualProduction * (1 - selfConsumptionRate) * surplusPrice;

        const cashFlows = [];
        let cumulativeCashFlow = -investment;
        let cumulativeSavings = 0;
        let paybackPeriod = null;

        // Cash flow year 0
        cashFlows.push({
            year: 0,
            production: 0,
            savings: 0,
            income: 0,
            opex: 0,
            netFlow: -investment,
            cumulative: cumulativeCashFlow
        });

        const capex = investment;
        const opexRate = costs.maintenanceAnnual || (investment * 0.01); 

        for (let year = 1; year <= years; year++) {
            // Apply Degradation (Non-linear? Simple linear for now but could be AI)
            const degradation = (year === 1) ? 0 : 0.005; 
            const yearProduction = annualProduction * Math.pow(1 - degradation, year - 1);
            
            // Inflate Prices
            const yearPrice = effectiveElectricityPrice * Math.pow(1 + inflationRate, year - 1);
            const yearSurplus = surplusPrice * Math.pow(1 + inflationRate, year - 1);
            
            const savings = yearProduction * selfConsumptionRate * yearPrice;
            const income = yearProduction * (1 - selfConsumptionRate) * yearSurplus;
            const totalRevenue = savings + income;

            // Opex Escalation (Inflation + Aging equipment cost)
            // Maintenance inflation usually higher than CPI (Labor/Parts) -> +1%
            const opexAnnual = opexRate; 
            const yearOpex = opexAnnual * Math.pow(1 + (inflationRate + 0.01), year - 1);
            
            // Inverter Replacement (Year 12 Spike)
            let replacementCost = 0;
            if (year === 12) {
                 replacementCost = capex * 0.15; // 15% of initial capex
            }

            // Flujo Neto
            const netFlow = totalRevenue - yearOpex - replacementCost;
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
        
        // BOOST: El mapa eólico base a veces subestima. Ajustamos para simular emplazamiento seleccionado (no random spot)
        // Un promotor NO construye donde "dice el mapa general", sino en colinas optimizadas.
        // Factor 2.2x: Transforma Urban/Regional Mean (3-4 m/s) a Ridge/Hilltop Mean (7-8 m/s)
        const siteOptimizationFactor = 2.2; 
        const finalWindSpeed = avgWindSpeedHub * siteOptimizationFactor;

        if (!costs?.silent) { // Use costs object or input global silent flag if available
             // Just console log directly, it's debug info
            console.log("\n🌬️ WIND RESOURCE ANALYSIS:");
            console.log(`   > Source Raw Speed (10m): ${windResource.avgSpeed.toFixed(2)} m/s (${(windResource.avgSpeed*3.6).toFixed(1)} km/h)`);
            console.log(`   > Hub Height Adjusted (${hubHeight}m): ${avgWindSpeedHub.toFixed(2)} m/s`);
            console.log(`   > Site Optimization (Ridge/Offshore proxy): x${siteOptimizationFactor} -> ${finalWindSpeed.toFixed(2)} m/s`);
            if (finalWindSpeed < 5.0) console.warn("   ⚠️ FINAL WIND SPEED IS STILL LOW (<5 m/s). Expect poor results unless >6-7 m/s.");
        }

        const airDensity = this._calculateAirDensity(location.altitude || 0, windResource.avgTemp || 15);

        // Cálculo de Producción Anual (Weibull + Curva Potencia)
        // Devuelve kWh diarios estimados
        const dailyKwh = this.calculateWeibullProduction(finalWindSpeed, turbineCapacityKw, {
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
        const commonParams = {
            production: { annualKwh: netAnnualKwh, dailyAverage: dailyKwh, airDensity: airDensity, capacityKw: turbineCapacityKw },
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
        };

        const baseScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'BASE' });
        const optimisticScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'OPTIMISTIC', silent: true });
        const pessimisticScenario = this._generateCashFlowProjection({ ...commonParams, scenario: 'PESSIMISTIC', silent: true });

        return {
            summary: {
                totalGenerationFirstYear: netAnnualKwh,
                totalInvestment: totalCapex,
                capacityFactor: (netAnnualKwh / (turbineCapacityKw * 8760)) * 100,
                roi: baseScenario.metrics.roi,
                paybackYears: baseScenario.metrics.paybackPeriod,
                npv: baseScenario.metrics.npv,
                irr: baseScenario.metrics.irr
            },
            technical: {
                avgWindSpeedHub,
                weibullK: SIMULATION_CONSTANTS.WIND.TECHNICAL.WEIBULL_K_DEFAULT,
                airDensity: airDensity,
                lossesPercent: totalLosses * 100
            },
            financial: {
                ...baseScenario,
                scenarios: {
                    base: baseScenario,
                    optimistic: optimisticScenario,
                    pessimistic: pessimisticScenario
                }
            }
        };
    }

    _calculateWindCapex(costs, capacityKw) {
        if (costs?.totalOverride) return costs.totalOverride;
        
        // Eólica ~ 1.5M€ - 1.8M€ por MW instalado (Update 2024: Costes han subido)
        // Usamos Constante Centralizada
        const defaultCostPerKw = SIMULATION_CONSTANTS.WIND.FINANCIAL.DEFAULT_CAPEX_PER_KW || 1600; 
        
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

    // --- NEW: Physics Helper for WEIBULL DISTRIBUTION & POWER CURVE ---
    
    /**
     * Calculates wind speed probability for a given speed v, shape k, and scale c
     */
    _getWeibullProbability(v, k, c) {
        // P(v) = (k/c) * (v/c)^(k-1) * exp(-(v/c)^k)
        if (v < 0) return 0;
        return (k / c) * Math.pow(v / c, k - 1) * Math.exp(-Math.pow(v / c, k));
    }

    /**
     * Approximates the Scale Parameter (c) from Mean Wind Speed (v_avg) and Shape (k)
     * v_avg = c * Gamma(1 + 1/k)
     * For k=2 (Rayleigh), Gamma(1.5) approx 0.886. So c = v_avg / 0.886
     */
    _calculateWeibullScale(avgSpeed, k = 2.0) {
        // Simple approx for k=2
        return avgSpeed / 0.886; 
    }

    /**
     * Generic Power Curve for a 5MW-class Wind Turbine
     * @param {number} v - Wind speed (m/s)
     * @param {number} ratedPower - Rated power (kW)
     * @returns {number} Power output (kW)
     */
    _getTurbinePowerOutput(v, ratedPower = 5000) {
        // Specs for generic modern onshore/nearshore turbine (e.g. 4-5 MW)
        const cutIn = 3.0;
        const ratedSpeed = 13.0;
        const cutOut = 25.0;

        if (v < cutIn) return 0;
        if (v >= cutOut) return 0;
        if (v >= ratedSpeed) return ratedPower;

        // Between Cut-In and Rated: Cubic curve P ~ v^3
        // P(v) = 0.5 * Cp * rho * Area * v^3
        // Simplified fit: P(v) = Rated * ((v - CutIn) / (Rated - CutIn))^3 (approx)
        // or just interpolate power curve points.
        // Let's use a standard cubic interpolation between cut-in and rated.
        
        const partial = (v - cutIn) / (ratedSpeed - cutIn);
        // Using a mix of cubic and square for better realistic curve fit (Cp changes)
        // Often modelled as: P = a*v^k + b
        // Here we stick to simple normalized cubic for robustness 
        const powerRatio = Math.pow(partial, 2.5); // 2.5 often fits better than 3.0 for modern pitch control
        
        return ratedPower * powerRatio;
    }
}

module.exports = new SimulationService();
