const { FINANCIAL, TECHNICAL } = require('../config/constants');

class FinancialService {
    
    /**
     * Calcula el Valor Actual Neto (VAN / NPV)
     * @param {number} rate - Tasa de descuento (WACC) nominal (ej. 0.05)
     * @param {number[]} cashFlows - Array de flujos de caja por año (Año 0 es inversión negativa)
     * @returns {number} NPV
     */
    static calculateNPV(rate, cashFlows) {
        let npv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            npv += cashFlows[t] / Math.pow(1 + rate, t);
        }
        return npv;
    }

    /**
     * Calcula la Tasa Interna de Retorno (TIR / IRR)
     * Utiliza el método de Newton-Raphson
     * @param {number[]} cashFlows 
     * @param {number} guess - Estimación inicial
     * @returns {number} IRR
     */
    static calculateIRR(cashFlows, guess = 0.1) {
        // Validation: If total recovery is extremely low, IRR is effectively -100%.
        // Total Value = Net Profit (Sum of all flows).
        // If Net Profit is close to Initial Investment (meaning Returns ~ 0), return -1.
        // cashFlows[0] is negative investment.
        // If (Sum - Investment0) < (Abs(Investment0) * 0.05) -> Recovered less than 5% of money.
        const totalValue = cashFlows.reduce((a, b) => a + b, 0);
        const initialInv = cashFlows[0]; // negative
        
        // If we haven't even recovered 1% of the initial investment nominal value
        if ((totalValue - initialInv) < (Math.abs(initialInv) * 0.01)) {
             return -0.99;
        }

        const maxIter = 1000;
        const tol = 1e-7;
        let rate = guess;

        for (let i = 0; i < maxIter; i++) {
            let npv = 0;
            let dNpv = 0;
            for (let t = 0; t < cashFlows.length; t++) {
                const num = cashFlows[t];
                // Protective power calculation for very high rates
                const den = Math.pow(1 + rate, t);
                npv += num / den;
                dNpv -= (t * num) / (den * (1 + rate));
            }

            if (Math.abs(npv) < tol) return rate;
            
            // Evitar división por cero
            if (Math.abs(dNpv) < tol) return rate; 

            let newRate = rate - npv / dNpv;
            
            // CONVERGENCE GUARD:
            // If the rate explodes (e.g. > 10000 or < -0.99), clamp or abort.
            if (Math.abs(newRate) > 100) newRate = 100; // Cap at 10,000%
            
            // Allow searching in negative territory down to -99%
            if (newRate < -0.999) newRate = -0.999;
            
            if (Math.abs(newRate - rate) < tol) return newRate;
            rate = newRate;
        }
        return rate;
    }

    /**
     * Calcula el Payback Period (Retorno de la inversión)
     * @param {number[]} cashFlows 
     * @returns {number|null} Año del payback o null si no se recupera
     */
    static calculatePayback(cashFlows) {
        let cumulative = cashFlows[0];
        if (cumulative >= 0) return 0; // Inversión 0 o regalo

        for(let i = 1; i < cashFlows.length; i++) {
            cumulative += cashFlows[i];
            if (cumulative >= 0) {
                // Interpolación lineal simple para mayor precisión decimal
                // Si en el año i-1 debíamos X, y en el año i ganamos Y...
                // Payback = (i - 1) + (abs(cumulative_prev) / cashFlow_i)
                const prevCumulative = cumulative - cashFlows[i];
                const fractalYear = Math.abs(prevCumulative) / cashFlows[i];
                return (i - 1) + fractalYear;
            }
        }
        return null;
    }

    /**
     * Genera la proyección financiera completa
     */
    static generateProjection(initialInvestment, year1Revenue, capacityKw, type, financialParams, longTermGeneration = null, year1Generation = null) {
        
        // Prioritize User Parameters if available, falling back to System Constants
        
        // Duration: User inputs integer years
        const years = (financialParams?.project_lifetime) 
            ? parseInt(financialParams.project_lifetime) 
            : FINANCIAL.SIMULATION_YEARS;

        // Debt Params Extraction with explicit logging and fallback
        let debtRatio = FINANCIAL.DEFAULT_DEBT_RATIO;
        let interestRate = FINANCIAL.DEFAULT_INTEREST_RATE;
        let loanTerm = FINANCIAL.DEFAULT_LOAN_TERM;

        if (financialParams) {
            // Debt Ratio: Check camelCase first, then snake_case
            if (financialParams.debtRatio !== undefined && financialParams.debtRatio !== null) {
                debtRatio = Number(financialParams.debtRatio);
            } else if (financialParams.debt_ratio !== undefined && financialParams.debt_ratio !== null) {
                // Heuristic: If value > 1, assume it's percentage and convert to decimal. 
                const dr = Number(financialParams.debt_ratio);
                // Assume if dr > 1 it is %, otherwise it is 0.X format ??
                // FIX: If user sends 0.7 for 70%, that's fine. If 70, that's fine too.
                // The only ambiguity is 1% (1 vs 0.01). We assume < 1.0 is Ratio, >= 1.0 is Percent.
                debtRatio = (dr > 1.0) ? dr / 100.0 : dr;
            }

            // Interest Rate
            if (financialParams.interestRate !== undefined && financialParams.interestRate !== null) {
                interestRate = Number(financialParams.interestRate);
            } else if (financialParams.interest_rate !== undefined && financialParams.interest_rate !== null) {
                const ir = Number(financialParams.interest_rate);
                interestRate = (ir > 1.0) ? ir / 100.0 : ir; 
            }

            // Loan Term
            if (financialParams.loanTerm !== undefined && financialParams.loanTerm !== null) {
                loanTerm = Number(financialParams.loanTerm);
            } else if (financialParams.loan_term !== undefined && financialParams.loan_term !== null) {
                loanTerm = Number(financialParams.loan_term);
            }
        }
        
        // Ensure debt ratio logic handles potential string inputs too
        if (financialParams) {
            debtRatio = (debtRatio > 1.0) ? debtRatio / 100.0 : debtRatio;
            interestRate = (interestRate > 1.0) ? interestRate / 100.0 : interestRate;
        }
        
        // Re-validate after parsing
        if (debtRatio > 1) debtRatio = 1; 
        if (debtRatio < 0) debtRatio = 0;
        
        console.log(`[FinancialService] Params Used -> DebtRatio: ${debtRatio}, Interest: ${interestRate}, Term: ${loanTerm}`);

        const initialEquity = initialInvestment * (1 - debtRatio);
        const initialDebt = initialInvestment * debtRatio;

        // Ensure we don't have negative numbers from bad subtraction
        if (debtRatio > 1) debtRatio = 1; 
        if (debtRatio < 0) debtRatio = 0;
        
        // Inflation Rates: User inputs Percentages (e.g. 2.0), System uses Decimals (0.02)
        // Check if params exist and seem to be percentages (> 1 usually implies %, but 0-1 is ambiguous. 
        // We will assume User Params from Frontend are ALWAYS Percentages if they come from the standard form)
        
        const rawInflation = financialParams?.inflation_rate; 
        const inflation = (rawInflation !== undefined) 
            ? parseFloat(rawInflation) / 100.0 
            : FINANCIAL.INFLATION_RATE;

        const rawEnergyInflation = financialParams?.electricity_price_increase;
        const energyInflation = (rawEnergyInflation !== undefined) 
            ? parseFloat(rawEnergyInflation) / 100.0 
            : FINANCIAL.ENERGY_INFLATION_RATE;

        // Discount Rate (WACC): User inputs Percentage
        const rawDiscount = financialParams?.discount_rate;
        const discountRate = (rawDiscount !== undefined) 
            ? parseFloat(rawDiscount) / 100.0 
            : FINANCIAL.WACC;

        // --- NEW Advanced Parameters Extraction ---
        const selfConsumptionRatio = parseFloat(financialParams?.self_consumption_ratio || 0); // 0.0 - 1.0
        const priceSurplus = parseFloat(financialParams?.electricity_price_surplus || 0);
        const priceSaved = parseFloat(financialParams?.electricity_price_saved || 0);
        
        const grants = parseFloat(financialParams?.grants_amount || 0);
        const taxDeductionYear1 = parseFloat(financialParams?.tax_deduction || 0); // Treated as Year 1 Cash Inflow (or Year 0 reduction)
        // Let's treat Grant as Year 0 reduction, Tax Deduction as Year 1 Benefit? Usually ICIO is upfront, IBI is annual. 
        // User said "Deducciones... reduce payback". I'll treat 'tax_deduction' as a lump sum upfront benefit for simplicity or Year 1.
        // Let's deduct Grants from Initial Investment immediately.
        
        const inverterYear = parseInt(financialParams?.inverter_replacement_year || 12);
        const inverterCost = parseFloat(financialParams?.inverter_replacement_cost || 0);

        const annualInsurance = parseFloat(financialParams?.insurance_cost || 0);
        const annualLease = parseFloat(financialParams?.land_roof_lease || 0);
        const annualAdmin = parseFloat(financialParams?.asset_management_fee || 0);
        
        const corpTaxRate = (financialParams?.corporate_tax_rate !== undefined) 
            ? parseFloat(financialParams.corporate_tax_rate) / 100.0
            : FINANCIAL.TAX_RATE;


        // Calculamos servicio de deuda (Pago anual constante - Método Francés)
        let annualDebtService = 0;
        if (initialDebt > 0 && interestRate > 0) {
            annualDebtService = initialDebt * interestRate * Math.pow(1 + interestRate, loanTerm) / (Math.pow(1 + interestRate, loanTerm) - 1);
        } else if (initialDebt > 0 && interestRate === 0) {
            annualDebtService = initialDebt / loanTerm;
        }

        // Si tenemos proyección detallada de generación (AI Engine), la usamos.
        // Si no, usamos fallback de degradación lineal simple.
        let useDetailedGeneration = false;
        let impliedPricePerKwh = 0;

        if (longTermGeneration && Array.isArray(longTermGeneration) && year1Generation > 0) {
             useDetailedGeneration = true;
             // Calculamos el precio medio implícito del año 1 para extrapolar
             // Precio = Ingresos Año 1 / Generación Año 1
             
             // BUG FIX: If 'year1Revenue' is calculated by backend using a default low price (e.g. 0.03),
             // then 'impliedPrice' becomes this low price, perpetuating the error for 30 years.
             // We must check if user provided an override price in 'financialParams' (electricity_price_saved/surplus)
             // or enforce a reasonable market minimum if implied is absurdly low (< 0.04).
             
             let implied = year1Revenue / year1Generation;
             
             // Check for user-provided base price override (often passed as 'energy_price' or 'electricity_price')
             if (financialParams?.energy_price) {
                 implied = parseFloat(financialParams.energy_price);
             } else if (financialParams?.electricity_price) {
                 implied = parseFloat(financialParams.electricity_price);
             }
             
             // Market Reality Check: Hard floor at 0.05 EUR/kWh unless explicitly zero (self-consumption only scenarios?)
             // Only apply if user didn't set specific self-consumption params
             if (implied < 0.05 && selfConsumptionRatio === 0) {
                 console.log(`[FinancialService] Warning: Implied price ${implied} is too low. Adjusting to Market Floor 0.06€`);
                 implied = 0.06;
             }
             
             impliedPricePerKwh = implied;
        }

        // Obtener constantes específicas por tecnología (Solo usadas si fallamos al modo fallback)
        let degradation = 0;
        let omCostPerKw = 0;

        switch(type) {
            case 'solar':
                degradation = TECHNICAL.DEGRADATION_RATE_SOLAR || 0.005; 
                omCostPerKw = FINANCIAL.OM_COST_PER_KW_SOLAR;
                break;
            case 'wind':
                degradation = TECHNICAL.DEGRADATION_RATE_WIND || 0.01;
                omCostPerKw = FINANCIAL.OM_COST_PER_KW_WIND;
                break;
            case 'hydro':
                degradation = 0.00; 
                omCostPerKw = FINANCIAL.OM_COST_PER_KW_HYDRO;
                break; 
            case 'biomass':
                degradation = 0.00; 
                omCostPerKw = FINANCIAL.OM_COST_PER_KW_BIOMASS;
                break;
        }

        const taxRate = corpTaxRate;
        // El usuario invierte Equity, por lo tanto usamos Cost of Equity para descontar (Ke) o WACC.
        // Simularemos FCFF (Free Cash Flow to Firm) y FCFE (Free Cash Flow to Equity).
        // Usaremos WACC para FCFF y Cost of Equity (~8-10%) para FCFE. 
        // Para simplificar la salida principal, usamos WACC sobre el flujo total del proyecto (FCFF) para metrics de Proyecto
        // y calculamos metrics de Equity por separado.

        // Use User's Discount Rate if provided (override WACC and Ke with specific user preference)
        const wacc = (financialParams?.discount_rate !== undefined) ? discountRate : FINANCIAL.WACC;

        // ADJUSTED YEAR 0: Investment minus Grants
        // Grants reduce the cash outflow at T=0
        let effectiveInvestment = initialInvestment - grants;
        if (effectiveInvestment < 0) effectiveInvestment = 0; // Edge case
        
        // However, Depreciation usually applies to the FULL Asset Value (unless grant tax rules differ).
        // For simplicity, we depreciate the FULL initialInvestment, but cash flow starts better.
        
        let cashFlowsProject = [-Math.abs(effectiveInvestment)]; // Año 0 Proyecto
        
        // Equity needs to cover the investment part NOT covered by debt.
        // Usually Grants cover part of Equity need.
        // Let's assume Grants reduce Equity requirement first? Or Pro-rata?
        // Standard: Debt is negotiated on Asset Value. Equity puts the rest. Grants reimburse Equity.
        // So Initial Equity Outflow = (Inv * (1-Dr)) - Grants
        let effectiveEquity = initialEquity - grants;
        let cashFlowsEquity = [-Math.abs(effectiveEquity)];      // Año 0 Accionista

        let annualBreakdown = [];

        let currentRevenue = year1Revenue;
        // O&M Base + Extras
        let currentOmCost = (capacityKw * omCostPerKw) + annualInsurance + annualLease + annualAdmin;

        let remainingPrincipal = initialDebt;

        for (let y = 1; y <= years; y++) {
            // 1. Ingresos y O&M (Operativos)
            let generationYear = 0;
            
            if (useDetailedGeneration) {
                 const startIdx = (y - 1) * 12;
                 const endIdx = y * 12;
                 if (startIdx < longTermGeneration.length) {
                     const yearGenSlice = longTermGeneration.slice(startIdx, endIdx);
                     generationYear = yearGenSlice.reduce((a, b) => a + b, 0);
                 }
            } else {
                 // Fallback generation calculation if needed, but usually passed
                 generationYear = year1Generation * Math.pow(1 - degradation, y - 1);
            }

            // Calculate Revenue using Self-Consumption Split if provided
            // Use impliedPrice if no advanced prices provided, else use advanced logic
            if (selfConsumptionRatio > 0 || priceSaved > 0 || priceSurplus > 0) {
                 const consumed = generationYear * selfConsumptionRatio;
                 const surplus = generationYear * (1 - selfConsumptionRatio);
                 
                 // Inflate prices
                 const pSaved = (priceSaved > 0 ? priceSaved : impliedPricePerKwh) * Math.pow(1 + energyInflation, y - 1);
                 const pSurplus = (priceSurplus > 0 ? priceSurplus : 0.05) * Math.pow(1 + energyInflation, y - 1);
                 
                 currentRevenue = (consumed * pSaved) + (surplus * pSurplus);
                 
                 if (y === 1) {
                     console.log(`[FinancialService] Year 1 Split Revenue: Consumed ${consumed.toFixed(0)}kWh @ ${pSaved.toFixed(3)} | Surplus ${surplus.toFixed(0)}kWh @ ${pSurplus.toFixed(3)} | Total Rev: ${currentRevenue.toFixed(2)}`);
                 }
            } else {
                 // Default Path (Inflation applied to total)
                 if (useDetailedGeneration) {
                     const currentPrice = impliedPricePerKwh * Math.pow(1 + energyInflation, y - 1);
                     currentRevenue = generationYear * currentPrice;
                 } else {
                     if (y > 1) currentRevenue = currentRevenue * (1 - degradation) * (1 + energyInflation);
                 }
            }

            // Costes O&M crecen con inflación general
            if (y > 1) {
                currentOmCost = currentOmCost * (1 + inflation);
            }
            
            // Add Inverter Replacement / Major Maintenance (One-Offs)
            let extraordinaryExpense = 0;
            if (y === inverterYear) {
                extraordinaryExpense = inverterCost;
            }

            const ebitda = currentRevenue - currentOmCost - extraordinaryExpense;
            
            // 2. Amortización Fiscal (Depreciation)
            // Depreciation usually on Initial Asset Investment (regardless of funding)
            const depreciation = initialInvestment / years;
            const ebit = ebitda - depreciation; // Earnings Before Interest and Taxes
            
            // 3. Gastos Financieros (Intereses)
            let interestPayment = 0;
            let principalPayment = 0;
            
            if (y <= loanTerm && remainingPrincipal > 0) {
                interestPayment = remainingPrincipal * interestRate;
                principalPayment = annualDebtService - interestPayment;
                // Ajuste final por redondeo
                if (principalPayment > remainingPrincipal) {
                    principalPayment = remainingPrincipal;
                    annualDebtService = interestPayment + principalPayment;
                }
                remainingPrincipal -= principalPayment;
            } else {
                interestPayment = 0;
                principalPayment = 0;
            }

            // 4. Impuestos
            const ebt = ebit - interestPayment; // Earnings Before Tax
            let tax = ebt > 0 ? ebt * taxRate : 0;
            
            // Apply Tax Deductions (Credits) in Year 1 if applicable
            if (y === 1 && taxDeductionYear1 > 0) {
                tax -= taxDeductionYear1;
                if (tax < 0) tax = 0; // Assuming no refund, just 0 tax. Or carry forward? 
                // Let's assume simpler: It's a benefit added to Net Income directly if tax < 0? 
                // "Deduction" usually reduces Taxable Income. "Credit" reduces Tax.
                // User said "Deducciones IBI/ICIO". ICIO is a tax paid at start (Capex). IBI is annual expense.
                // If they input "Tax Deduction" as a lump sum value in Euros, let's treat it as a Tax Credit in Year 1.
            }
            
            const netIncome = ebt - tax;

            // 5. Flujos de Caja
            const taxOnEbit = ebit > 0 ? ebit * taxRate : 0; // Approximated for Unlevered
            // Note: If extraordinaryExpense is Capex, it shouldn't reduce EBITDA but be subtracted after.
            // But if it's "Replacement", valid to expense it or capitalize. 
            // For simplicity here, treated as Expense (reducing Taxable Income).
            
            const freeCashFlowProject = (ebit - taxOnEbit) + depreciation;
            
            // FCFE (Levered): Equity View -> Net Income + Depreciation - Principal Repayment
            const freeCashFlowEquity = netIncome + depreciation - principalPayment;

            cashFlowsProject.push(freeCashFlowProject);
            cashFlowsEquity.push(freeCashFlowEquity);

            annualBreakdown.push({
                year: y,
                revenue: currentRevenue,
                om_cost: currentOmCost,
                ebitda: ebitda,
                depreciation: depreciation,
                ebit: ebit,
                interest: interestPayment,
                principal: principalPayment,
                tax: tax,
                net_income: netIncome,
                fcf_project: freeCashFlowProject,
                fcf_equity: freeCashFlowEquity,
                debt_balance: remainingPrincipal
            });
        }

        // Métricas de Proyecto (Sin deuda)
        const npvProject = this.calculateNPV(wacc, cashFlowsProject);
        const irrProject = this.calculateIRR(cashFlowsProject);
        const paybackProject = this.calculatePayback(cashFlowsProject);

        // Métricas de Equity (Con deuda - Lo que le interesa al inversor)
        // Coste del Equity suele ser mayor al WACC, ej 8-10%. Usamos 8% estandard.
        // Si el usuario da un discount rate, lo aplicamos aquí preferentemente.
        const costOfEquity = (financialParams?.discount_rate !== undefined) ? discountRate : 0.08; 
        const npvEquity = this.calculateNPV(costOfEquity, cashFlowsEquity);
        const irrEquity = this.calculateIRR(cashFlowsEquity);
        const paybackEquity = this.calculatePayback(cashFlowsEquity);

        // Correct ROI Calculation: (Net Profit / Investment) * 100
        // cashFlowsEquity.reduce sums all flows (-Inv + Returns). This IS the Net Profit (Nominal).
        // Example: Inv 100, Returns 80. Sum = -20. ROI = -20/100 = -20%.
        const totalNetProfitNominal = cashFlowsEquity.reduce((a, b) => a + b, 0);
        const roiPercent = (totalNetProfitNominal / effectiveEquity) * 100;

        // Total Intereses Pagados
        const totalInterestPaid = annualBreakdown.reduce((acc, item) => acc + item.interest, 0);

        return {
            financials: {
                // Devolvemos Equity Metrics como principales si hay deuda, o Proyecto si no.
                // Para claridad, devolvemos ambas etiquetadas.
                npv: npvEquity, 
                irr: irrEquity,
                payback: paybackEquity,
                initial_equity: initialEquity,
                initial_debt: initialDebt,
                leverage_ratio: debtRatio,
                
                project_npv: npvProject,
                project_irr: irrProject,
                project_payback: paybackProject,

                roi_percent: roiPercent,
                total_interest_paid: totalInterestPaid,
                total_nominal_profit: totalNetProfitNominal
            },
            cashFlows: cashFlowsEquity, // Graficaremos flujos del inversor por defecto
            annualBreakdown
        };
    }
}

module.exports = FinancialService;
