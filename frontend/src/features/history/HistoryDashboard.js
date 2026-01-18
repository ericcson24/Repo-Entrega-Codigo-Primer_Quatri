import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Clock, Download, AlertCircle } from 'lucide-react';

const HistoryDashboard = () => {
    const { currentUser } = useAuth();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

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
            console.error("Failed to load history", error);
        } finally {
            setLoading(false);
        }
    };

    if (!currentUser) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <AlertCircle size={48} className="mb-4" />
                <p className="text-lg">Please sign in to view your simulation history.</p>
            </div>
        );
    }

    if (loading) return <div className="p-8 text-center text-gray-500">Loading history...</div>;

    if (history.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                <Clock size={48} className="mb-4" />
                <p className="text-lg">No history found. Run a simulation to save it here!</p>
            </div>
        );
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-6">Simulation History</h2>
            
            <div className="grid grid-cols-1 gap-6">
                {history.map((sim) => {
                    const params = sim.input_params;
                    const results = sim.results?.financials;
                    return (
                        <div key={sim.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border border-gray-100 dark:border-gray-700">
                            <div className="flex justify-between items-start mb-4">
                                <div>
                                    <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 capitalize mb-2">
                                        {sim.project_type}
                                    </span>
                                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                                        {params.capacity_kw} kW System in {params.latitude}, {params.longitude}
                                    </h3>
                                    <p className="text-sm text-gray-500">
                                        {new Date(sim.created_at).toLocaleString()}
                                    </p>
                                </div>
                                <div className="text-right">
                                    <div className="text-2xl font-bold text-green-600">
                                        €{results?.npv_eur?.toLocaleString()}
                                    </div>
                                    <div className="text-sm text-gray-500">NPV</div>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                                <div>
                                    <span className="block text-xs text-gray-500">IRR</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{results?.irr_percent?.toFixed(2)}%</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500">Payback</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{results?.payback_years?.toFixed(1)} years</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500">Investment</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">€{sim.input_params.budget.toLocaleString()}</span>
                                </div>
                                <div>
                                    <span className="block text-xs text-gray-500">ROI</span>
                                    <span className="font-semibold text-gray-800 dark:text-gray-200">{results?.roi_percent?.toFixed(1)}%</span>
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
