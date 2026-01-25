import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { Clock, AlertCircle } from 'lucide-react';
import './HistoryDashboard.css';

const HistoryDashboard = () => {
    const { currentUser } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const typeMap = { 
        solar: 'Solar', 
        wind: 'Eólica', 
        hydro: 'Hidráulica', 
        biomass: 'Biomasa' 
    };

    useEffect(() => {
        if (currentUser?.email) {
            fetchHistory();
        }
    }, [currentUser]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const data = await apiService.getHistory(currentUser.email);
            if (Array.isArray(data)) {
                setHistory(data);
            }
        } catch (error) {
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="empty-state">
                <AlertCircle size={48} className="empty-state-icon" />
                <p className="empty-state-text">Por favor inicia sesión para ver tu historial.</p>
            </div>
        );
    }

    if (loading) return <div className="loading-state">Cargando historial...</div>;

    if (history.length === 0) {
        return (
            <div className="empty-state">
                <Clock size={48} className="empty-state-icon" />
                <p className="empty-state-text">No hay historial. ¡Ejecuta una simulación para guardarla aquí!</p>
            </div>
        );
    }

    return (
        <div className="history-container">
            <h2 className="history-title">Historial de Simulaciones</h2>
            
            <div className="history-grid">
                {history.map((sim) => {
                    const params = sim.input_params;
                    const results = sim.results?.financials;
                    return (
                        <div key={sim.id} className="simulation-card">
                            <div className="simulation-header">
                                <div>
                                    <span className="simulation-type-badge">
                                        {typeMap[sim.project_type] || sim.project_type}
                                    </span>
                                    <h3 className="simulation-title">
                                        Sistema de {params.capacity_kw} kW en {params.latitude}, {params.longitude}
                                    </h3>
                                    <p className="simulation-date">
                                        {new Date(sim.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="simulation-npv-container">
                                    <div className="simulation-npv-value">
                                        €{results?.npv_eur?.toLocaleString()}
                                    </div>
                                    <div className="simulation-npv-label">VAN</div>
                                </div>
                            </div>
                            
                            <div className="simulation-metrics">
                                <div>
                                    <span className="metric-label">TIR</span>
                                    <span className="metric-value">{results?.irr_percent?.toFixed(2)}%</span>
                                </div>
                                <div>
                                    <span className="metric-label">Retorno</span>
                                    <span className="metric-value">{results?.payback_years?.toFixed(1)} años</span>
                                </div>
                                <div>
                                    <span className="metric-label">Inversión</span>
                                    <span className="metric-value">€{sim.input_params.budget.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="metric-label">ROI</span>
                                    <span className="metric-value">{results?.roi_percent?.toFixed(1)}%</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default HistoryDashboard;
