const { FINANCIAL } = require('../config/constants');

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
        const maxIter = 1000;
        const tol = 1e-7;
        let rate = guess;

        for (let i = 0; i < maxIter; i++) {
            let npv = 0;
            let dNpv = 0;
            for (let t = 0; t < cashFlows.length; t++) {
                const num = cashFlows[t];
                const den = Math.pow(1 + rate, t);
                npv += num / den;
                dNpv -= (t * num) / (den * (1 + rate));
            }

            if (Math.abs(npv) < tol) return rate;
            
            // Evitar división por cero
            if (Math.abs(dNpv) < tol) return rate; 

            const newRate = rate - npv / dNpv;
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
     * Genera la proyección financiera completa a N años (Modelo Project Finance)
     * @param {number} initialInvestment - Presupuesto (positivo)
     * @param {number} year1Revenue - Ingresos brutos calculados para el año 1
     * @param {number} capacityKw - Capacidad instalada
     * @param {string} type - Tipo de tecnología
     * @param {Object} financialParams - { debtRatio, interestRate, loanTerm }
     * @returns {Object} { financials, cashFlows, breakdown }
     */
    static generateProjection(initialInvestment, year1Revenue, capacityKw, type, financialParams = {}) {
        const years = FINANCIAL.SIMULATION_YEARS;
        const inflation = FINANCIAL.INFLATION_RATE;
        const energyInflation = FINANCIAL.ENERGY_INFLATION_RATE;
        
        // Parámetros de Financiación
        const debtRatio = financialParams.debtRatio ?? FINANCIAL.DEFAULT_DEBT_RATIO;
        const interestRate = financialParams.interestRate ?? FINANCIAL.DEFAULT_INTEREST_RATE;
        const loanTerm = financialParams.loanTerm ?? FINANCIAL.DEFAULT_LOAN_TERM;

        const initialDebt = initialInvestment * debtRatio; // Principal de la deuda
        const initialEquity = initialInvestment * (1 - debtRatio); // Capital propio

        // Cálculo de la cuota anual del préstamo (Método Francés - Cuota Constante)
        // PMT = P * r * (1 + r)^n / ((1 + r)^n - 1)
        let annualDebtService = 0;
        if (initialDebt > 0 && interestRate > 0) {
            annualDebtService = initialDebt * interestRate * Math.pow(1 + interestRate, loanTerm) / (Math.pow(1 + interestRate, loanTerm) - 1);
        } else if (initialDebt > 0 && interestRate === 0) {
            annualDebtService = initialDebt / loanTerm;
        }

        // Obtener constantes específicas por tecnología
        let degradation = 0;
        let omCostPerKw = 0;

        switch(type) {
            case 'solar':
                degradation = FINANCIAL.TECHNICAL.DEGRADATION_RATE_SOLAR || 0.005; 
                omCostPerKw = FINANCIAL.OM_COST_PER_KW_SOLAR;
                break;
            case 'wind':
                degradation = FINANCIAL.TECHNICAL.DEGRADATION_RATE_WIND || 0.01;
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

        const taxRate = FINANCIAL.TAX_RATE;
        // El usuario invierte Equity, por lo tanto usamos Cost of Equity para descontar (Ke) o WACC.
        // Simularemos FCFF (Free Cash Flow to Firm) y FCFE (Free Cash Flow to Equity).
        // Usaremos WACC para FCFF y Cost of Equity (~8-10%) para FCFE. 
        // Para simplificar la salida principal, usamos WACC sobre el flujo total del proyecto (FCFF) para metrics de Proyecto
        // y calculamos metrics de Equity por separado.

        const wacc = FINANCIAL.WACC;

        let cashFlowsProject = [-Math.abs(initialInvestment)]; // Año 0 Proyecto
        let cashFlowsEquity = [-Math.abs(initialEquity)];      // Año 0 Accionista

        let annualBreakdown = [];

        let currentRevenue = year1Revenue;
        let currentOmCost = capacityKw * omCostPerKw;
        let remainingPrincipal = initialDebt;

        for (let y = 1; y <= years; y++) {
            // 1. Ingresos y O&M (Operativos)
            if (y > 1) {
                currentRevenue = currentRevenue * (1 - degradation) * (1 + energyInflation);
                currentOmCost = currentOmCost * (1 + inflation);
            }
            const ebitda = currentRevenue - currentOmCost;
            
            // 2. Amortización Fiscal (Depreciation)
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
            const tax = ebt > 0 ? ebt * taxRate : 0;
            const netIncome = ebt - tax;

            // 5. Flujos de Caja
            // FCFF (Unlevered): Project View -> EBITDA - Tax(on EBIT) - Capex - ChangeWC
            // Simplified FCFF = EBIT * (1-t) + Depreciation
            // Nota: Usamos Tax sobre EBIT para quitar el escudo fiscal de la deuda en la vista "Proyecto Puro"
            const taxOnEbit = ebit > 0 ? ebit * taxRate : 0;
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
        const costOfEquity = 0.08; 
        const npvEquity = this.calculateNPV(costOfEquity, cashFlowsEquity);
        const irrEquity = this.calculateIRR(cashFlowsEquity);
        const paybackEquity = this.calculatePayback(cashFlowsEquity);

        return {
            financials: {
                // Devolvemos Equity Metrics como principales si hay deuda, o Proyecto si no.
                // Para claridad, devolvemos ambas etiquetadas.
                npv: npvEquity, 
                irr: irrEquity,
                payback: paybackEquity,
                
                project_npv: npvProject,
                project_irr: irrProject,
                project_payback: paybackProject,

                roi_percent: ((cashFlowsEquity.reduce((a,b)=>a+b, 0) - (-initialEquity)) / initialEquity) * 100
            },
            cashFlows: cashFlowsEquity, // Graficaremos flujos del inversor por defecto
            annualBreakdown
        };
    }
}

module.exports = FinancialService;
