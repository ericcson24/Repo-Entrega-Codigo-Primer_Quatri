const { FINANCIAL, TECHNICAL } = require('../config/constants');

class FinancialService {
    
    // Calcula cuánto vale hoy el dinero que ganará el proyecto en el futuro
    // Rate: tasa de descuento (ejemplo: 0.05 = 5%)
    // CashFlows: dinero que entra/sale cada año (año 0 es negativo porque invertimos)
    static calculateNPV(rate, cashFlows) {
        let npv = 0;
        for (let t = 0; t < cashFlows.length; t++) {
            npv += cashFlows[t] / Math.pow(1 + rate, t);
        }
        return npv;
    }

    // Calcula qué rentabilidad porcentual tiene el proyecto
    // Es la tasa que hace que el VAN sea cero
    // Usa el método Newton-Raphson para encontrar la solución
    static calculateIRR(cashFlows, guess = 0.1) {
        const totalValue = cashFlows.reduce((a, b) => a + b, 0);
        const initialInv = cashFlows[0];
        
        // Si recuperamos menos del 1% de la inversión, la rentabilidad es muy mala (-99%)
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
                const den = Math.pow(1 + rate, t);
                npv += num / den;
                dNpv -= (t * num) / (den * (1 + rate));
            }

            if (Math.abs(npv) < tol) return rate;
            
            if (Math.abs(dNpv) < tol) return rate;

            let newRate = rate - npv / dNpv;
            
            if (Math.abs(newRate) > 100) newRate = 100;
            
            if (newRate < -0.999) newRate = -0.999;
            
            if (Math.abs(newRate - rate) < tol) return newRate;
            rate = newRate;
        }
        return rate;
    }

    // Calcula en cuántos años recuperamos la inversión inicial
    // Devuelve el número de años o null si nunca se recupera
    static calculatePayback(cashFlows) {
        let cumulative = cashFlows[0];
        if (cumulative >= 0) return 0;

        for(let i = 1; i < cashFlows.length; i++) {
            cumulative += cashFlows[i];
            if (cumulative >= 0) {
                const prevCumulative = cumulative - cashFlows[i];
                const fractalYear = Math.abs(prevCumulative) / cashFlows[i];
                return (i - 1) + fractalYear;
            }
        }
        return null;
    }

    // Genera toda la proyección financiera del proyecto año por año
    // Calcula ingresos, costes, impuestos, flujos de caja, etc.
    static generateProjection(initialInvestment, year1Revenue, capacityKw, type, financialParams, longTermGeneration = null, year1Generation = null) {
        
        // Cuántos años dura el proyecto
        const years = (financialParams?.project_lifetime) 
            ? parseInt(financialParams.project_lifetime) 
            : FINANCIAL.SIMULATION_YEARS;

        // Parámetros de financiación (préstamo bancario)
        let debtRatio = FINANCIAL.DEFAULT_DEBT_RATIO;
        let interestRate = FINANCIAL.DEFAULT_INTEREST_RATE;
        let loanTerm = FINANCIAL.DEFAULT_LOAN_TERM;

        if (financialParams) {
            // Buscamos el ratio de deuda (% del proyecto financiado con préstamo)
            if (financialParams.debtRatio !== undefined && financialParams.debtRatio !== null) {
                debtRatio = Number(financialParams.debtRatio);
            } else if (financialParams.debt_ratio !== undefined && financialParams.debt_ratio !== null) {
                const dr = Number(financialParams.debt_ratio);
                // Si viene mayor que 1, es porcentaje (70 = 70%), si no, es decimal (0.7 = 70%)
                debtRatio = (dr > 1.0) ? dr / 100.0 : dr;
            }

            // Buscamos el tipo de interés del préstamo
            if (financialParams.interestRate !== undefined && financialParams.interestRate !== null) {
                interestRate = Number(financialParams.interestRate);
            } else if (financialParams.interest_rate !== undefined && financialParams.interest_rate !== null) {
                const ir = Number(financialParams.interest_rate);
                interestRate = (ir > 1.0) ? ir / 100.0 : ir; 
            }

            // Buscamos el plazo del préstamo (años)
            if (financialParams.loanTerm !== undefined && financialParams.loanTerm !== null) {
                loanTerm = Number(financialParams.loanTerm);
            } else if (financialParams.loan_term !== undefined && financialParams.loan_term !== null) {
                loanTerm = Number(financialParams.loan_term);
            }
        }
        
        // Convertimos porcentajes a decimales si es necesario
        if (financialParams) {
            debtRatio = (debtRatio > 1.0) ? debtRatio / 100.0 : debtRatio;
            interestRate = (interestRate > 1.0) ? interestRate / 100.0 : interestRate;
        }
        
        // Aseguramos que el ratio de deuda está entre 0 y 1
        if (debtRatio > 1) debtRatio = 1; 
        if (debtRatio < 0) debtRatio = 0;

        // Calculamos cuánto ponemos nosotros y cuánto pide el banco
        const initialEquity = initialInvestment * (1 - debtRatio);
        const initialDebt = initialInvestment * debtRatio;

        if (debtRatio > 1) debtRatio = 1; 
        if (debtRatio < 0) debtRatio = 0;
        
        // Tasas de inflación (cómo suben los precios cada año)
        const rawInflation = financialParams?.inflation_rate; 
        const inflation = (rawInflation !== undefined) 
            ? parseFloat(rawInflation) / 100.0 
            : FINANCIAL.INFLATION_RATE;

        const rawEnergyInflation = financialParams?.electricity_price_increase;
        const energyInflation = (rawEnergyInflation !== undefined) 
            ? parseFloat(rawEnergyInflation) / 100.0 
            : FINANCIAL.ENERGY_INFLATION_RATE;

        const rawDiscount = financialParams?.discount_rate;
        const discountRate = (rawDiscount !== undefined) 
            ? parseFloat(rawDiscount) / 100.0 
            : FINANCIAL.WACC;

        // Parámetros avanzados para autoconsumo y ayudas
        const selfConsumptionRatio = parseFloat(financialParams?.self_consumption_ratio || 0);
        const priceSurplus = parseFloat(financialParams?.electricity_price_surplus || 0);
        const priceSaved = parseFloat(financialParams?.electricity_price_saved || 0);
        
        const grants = parseFloat(financialParams?.grants_amount || 0);
        const taxDeductionYear1 = parseFloat(financialParams?.tax_deduction || 0);
        
        const inverterYear = parseInt(financialParams?.inverter_replacement_year || 12);
        const inverterCost = parseFloat(financialParams?.inverter_replacement_cost || 0);

        const annualInsurance = parseFloat(financialParams?.insurance_cost || 0);
        const annualLease = parseFloat(financialParams?.land_roof_lease || 0);
        const annualAdmin = parseFloat(financialParams?.asset_management_fee || 0);
        
        const corpTaxRate = (financialParams?.corporate_tax_rate !== undefined) 
            ? parseFloat(financialParams.corporate_tax_rate) / 100.0
            : FINANCIAL.TAX_RATE;


        // Calculamos la cuota anual del préstamo (sistema francés)
        let annualDebtService = 0;
        if (initialDebt > 0 && interestRate > 0) {
            annualDebtService = initialDebt * interestRate * Math.pow(1 + interestRate, loanTerm) / (Math.pow(1 + interestRate, loanTerm) - 1);
        } else if (initialDebt > 0 && interestRate === 0) {
            annualDebtService = initialDebt / loanTerm;
        }

        // Decidimos si usar la generación detallada del motor IA o una estimación simple
        let useDetailedGeneration = false;
        let impliedPricePerKwh = 0;

        if (longTermGeneration && Array.isArray(longTermGeneration) && year1Generation > 0) {
             useDetailedGeneration = true;
             
             // Calculamos el precio medio del primer año
             let implied = year1Revenue / year1Generation;
             
             if (financialParams?.energy_price) {
                 implied = parseFloat(financialParams.energy_price);
             } else if (financialParams?.electricity_price) {
                 implied = parseFloat(financialParams.electricity_price);
             }
             
             // Ponemos un precio mínimo razonable (6 céntimos/kWh)
             if (implied < 0.05 && selfConsumptionRatio === 0) {
                 implied = 0.06;
             }
             
             impliedPricePerKwh = implied;
        }

        // Obtenemos las constantes técnicas según el tipo de proyecto
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
        const wacc = (financialParams?.discount_rate !== undefined) ? discountRate : FINANCIAL.WACC;

        // Preparamos los flujos de caja: Año 0 es la inversión (negativa)
        // Las ayudas reducen lo que tenemos que poner
        let effectiveInvestment = initialInvestment - grants;
        if (effectiveInvestment < 0) effectiveInvestment = 0;
        
        // Año 0: flujo del proyecto completo y flujo del inversor
        
        let cashFlowsProject = [-Math.abs(effectiveInvestment)];
        
        // El inversor pone menos porque las ayudas le reducen la inversión
        let effectiveEquity = initialEquity - grants;
        let cashFlowsEquity = [-Math.abs(effectiveEquity)];        let annualBreakdown = [];

        // Ingresos y costes iniciales del primer año
        let currentRevenue = year1Revenue;
        let currentOmCost = (capacityKw * omCostPerKw) + annualInsurance + annualLease + annualAdmin;

        let remainingPrincipal = initialDebt;

        // Calculamos año por año
        for (let y = 1; y <= years; y++) {
            let generationYear = 0;
            
            if (useDetailedGeneration) {
                 // Usamos los datos mes a mes del motor IA
                 const startIdx = (y - 1) * 12;
                 const endIdx = y * 12;
                 if (startIdx < longTermGeneration.length) {
                     const yearGenSlice = longTermGeneration.slice(startIdx, endIdx);
                     generationYear = yearGenSlice.reduce((a, b) => a + b, 0);
                 }
            } else {
                 // Estimación simple con degradación anual
                 generationYear = year1Generation * Math.pow(1 - degradation, y - 1);
            }

            // Calculamos los ingresos según autoconsumo o venta
            let revenueSavings = 0;
            let revenueSales = 0;

            if (selfConsumptionRatio > 0 || priceSaved > 0 || priceSurplus > 0) {
                 // Dividimos entre energía autoconsumida y vendida a la red
                 const consumed = generationYear * selfConsumptionRatio;
                 const surplus = generationYear * (1 - selfConsumptionRatio);
                 
                 // Aplicamos inflación a los precios
                 const pSaved = (priceSaved > 0 ? priceSaved : impliedPricePerKwh) * Math.pow(1 + energyInflation, y - 1);
                 const pSurplus = (priceSurplus > 0 ? priceSurplus : 0.05) * Math.pow(1 + energyInflation, y - 1);
                 
                 revenueSavings = consumed * pSaved;
                 revenueSales = surplus * pSurplus;
                 currentRevenue = revenueSavings + revenueSales;
            } else {
                 // Modo simple: toda la energía se vende
                 if (useDetailedGeneration) {
                     const currentPrice = impliedPricePerKwh * Math.pow(1 + energyInflation, y - 1);
                     currentRevenue = generationYear * currentPrice;
                 } else {
                     if (y > 1) currentRevenue = currentRevenue * (1 - degradation) * (1 + energyInflation);
                 }
                 revenueSales = currentRevenue;
            }

            // Los costes de operación suben con la inflación
            if (y > 1) {
                currentOmCost = currentOmCost * (1 + inflation);
            }
            
            // Gastos extraordinarios (ej: cambio de inversor)
            let extraordinaryExpense = 0;
            if (y === inverterYear) {
                extraordinaryExpense = inverterCost;
            }

            // EBITDA: beneficio antes de intereses, impuestos, depreciación y amortización
            const ebitda = currentRevenue - currentOmCost - extraordinaryExpense;
            
            // Depreciación fiscal (el valor del activo se reparte entre los años)
            const depreciation = initialInvestment / years;
            const ebit = ebitda - depreciation;
            
            // Calculamos intereses y amortización del préstamo
            let interestPayment = 0;
            let principalPayment = 0;
            
            if (y <= loanTerm && remainingPrincipal > 0) {
                // Mientras estemos pagando el préstamo
                interestPayment = remainingPrincipal * interestRate;
                principalPayment = annualDebtService - interestPayment;
                if (principalPayment > remainingPrincipal) {
                    principalPayment = remainingPrincipal;
                    annualDebtService = interestPayment + principalPayment;
                }
                remainingPrincipal -= principalPayment;
            } else {
                interestPayment = 0;
                principalPayment = 0;
            }

            // Calculamos impuestos sobre beneficios
            const ebt = ebit - interestPayment;
            let tax = ebt > 0 ? ebt * taxRate : 0;
            
            // Aplicamos deducciones fiscales del año 1 si existen
            if (y === 1 && taxDeductionYear1 > 0) {
                tax -= taxDeductionYear1;
                if (tax < 0) tax = 0;
            }
            
            // Beneficio neto después de impuestos
            const netIncome = ebt - tax;

            // Flujos de caja libres
            const taxOnEbit = ebit > 0 ? ebit * taxRate : 0;
            
            const freeCashFlowProject = (ebit - taxOnEbit) + depreciation;
            
            // Flujo del inversor (resta el pago del préstamo)
            const freeCashFlowEquity = netIncome + depreciation - principalPayment;

            cashFlowsProject.push(freeCashFlowProject);
            cashFlowsEquity.push(freeCashFlowEquity);

            annualBreakdown.push({
                year: y,
                generation_kwh: generationYear,
                revenue: currentRevenue,
                savings: revenueSavings,
                sales: revenueSales,
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

        // Calculamos las métricas financieras del proyecto
        const npvProject = this.calculateNPV(wacc, cashFlowsProject);
        const irrProject = this.calculateIRR(cashFlowsProject);
        const paybackProject = this.calculatePayback(cashFlowsProject);

        // Calculamos las métricas desde el punto de vista del inversor
        const costOfEquity = (financialParams?.discount_rate !== undefined) ? discountRate : 0.08; 
        const npvEquity = this.calculateNPV(costOfEquity, cashFlowsEquity);
        const irrEquity = this.calculateIRR(cashFlowsEquity);
        const paybackEquity = this.calculatePayback(cashFlowsEquity);

        // ROI: cuánto ganamos por cada euro invertido
        const totalNetProfitNominal = cashFlowsEquity.reduce((a, b) => a + b, 0);
        const roiPercent = (totalNetProfitNominal / effectiveEquity) * 100;

        // Total de intereses pagados al banco
        const totalInterestPaid = annualBreakdown.reduce((acc, item) => acc + item.interest, 0);

        return {
            financials: {
                // Devolvemos principalmente las métricas del inversor
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
