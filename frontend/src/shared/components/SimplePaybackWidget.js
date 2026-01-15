import React, { useState } from 'react';
import { Clock, Calculator } from 'lucide-react';

const SimplePaybackWidget = () => {
    const [totalCost, setTotalCost] = useState(5000);
    const [monthlySavings, setMonthlySavings] = useState(80);
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleCalculate = async () => {
        setLoading(true);
        try {
            const response = await fetch('http://localhost:5000/api/financial/panel-payback', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ totalCost: parseFloat(totalCost), monthlySavings: parseFloat(monthlySavings) })
            });
            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error("Payback calc error", error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="calculator-container params-panel mt-6" style={{maxWidth: '100%'}}>
            <div className="panel-header" style={{borderBottom: '1px solid #333', paddingBottom: '10px', marginBottom: '15px'}}>
                <Calculator className="icon-secondary" size={20} />
                <h3 className="text-lg font-bold" style={{margin:0, color: '#4ADE80'}}>PANEL INVESTMENT RECOVERY</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4" style={{display: 'flex', gap: '20px', flexWrap: 'wrap'}}>
                <div className="form-group" style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '8px', color: '#aaa'}}>Total Investment (€)</label>
                    <input 
                        type="number" 
                        value={totalCost}
                        onChange={(e) => setTotalCost(e.target.value)}
                        className="form-input"
                        style={{width: '100%', padding: '10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: 'white'}}
                    />
                </div>
                <div className="form-group" style={{flex: 1}}>
                    <label style={{display: 'block', marginBottom: '8px', color: '#aaa'}}>Monthly Savings (€)</label>
                    <input 
                        type="number" 
                        value={monthlySavings}
                        onChange={(e) => setMonthlySavings(e.target.value)}
                        className="form-input"
                        style={{width: '100%', padding: '10px', background: '#1a1a1a', border: '1px solid #333', borderRadius: '4px', color: 'white'}}
                    />
                </div>
            </div>

            <button 
                onClick={handleCalculate}
                className="action-button secondary-button full-width"
                style={{marginTop: '20px', width: '100%', padding: '12px', background: '#4ADE80', color: 'black', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px'}}
                disabled={loading}
            >
                {loading ? "CALCULATING..." : <><Clock size={18}/> CALCULATE TIME TO RECOVER INVESTMENT POOL</>}
            </button>

            {result && (
                <div style={{marginTop: '20px', padding: '15px', background: '#111', border: '1px solid #4ADE80', borderRadius: '4px', textAlign: 'center'}}>
                    <p style={{color: '#888', fontSize: '0.9rem'}}>Estimated Recovery Time</p>
                    <p style={{fontSize: '2rem', fontWeight: 'bold', color: '#4ADE80', margin: '5px 0'}}>{result.paybackYears} Years</p>
                    <p style={{color: '#666', fontSize: '0.8rem'}}>({result.paybackMonths} months)</p>
                </div>
            )}
        </div>
    );
};

export default SimplePaybackWidget;
