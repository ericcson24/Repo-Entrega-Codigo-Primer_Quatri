import React, { useState, useEffect } from 'react';
import { apiService } from '../../services/api';
import { Settings, Check, AlertCircle } from 'lucide-react';

const EquipmentSelector = ({ type, onSelect }) => {
    const [catalog, setCatalog] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedId, setSelectedId] = useState('');

    useEffect(() => {
        const fetchCatalog = async () => {
            setLoading(true);
            const data = await apiService.getCatalog(type);
            setCatalog(data);
            setLoading(false);
        };
        fetchCatalog();
    }, [type]);

    const handleChange = (e) => {
        const id = e.target.value;
        setSelectedId(id);
        const item = catalog.find(i => i.id === id);
        onSelect(item);
    };

    if (loading) return <div className="text-sm text-gray-500 animate-pulse">Loading equipment database...</div>;

    const selectedItem = catalog.find(i => i.id === selectedId);

    return (
        <div className="bg-[#141414] border border-gray-800 rounded-lg p-4 mb-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-2">
                <Settings size={16} className="text-cyan-400" />
                Select Industry Equipment
            </label>
            
            <div className="relative">
                <select 
                    className="w-full bg-[#1a1a1a] border border-gray-700 text-gray-200 rounded p-2.5 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none appearance-none"
                    value={selectedId}
                    onChange={handleChange}
                >
                    <option value="">-- Manual Configuration --</option>
                    {catalog.map(item => (
                        <option key={item.id} value={item.id}>
                            {item.name} ({item.manufacturer})
                        </option>
                    ))}
                </select>
                <div className="absolute right-0 top-0 h-full flex items-center pr-3 pointer-events-none text-gray-500">
                    ▼
                </div>
            </div>

            {selectedItem && (
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs p-3 bg-gray-900/50 rounded border border-gray-800">
                    <div className="space-y-1">
                        <span className="block text-gray-500">Model ID</span>
                        <span className="font-mono text-cyan-300">{selectedItem.id}</span>
                    </div>
                    {type === 'solar' && (
                        <>
                            <div className="space-y-1">
                                <span className="block text-gray-500">Efficiency</span>
                                <span className="text-gray-200">{(selectedItem.efficiency * 100).toFixed(1)}%</span>
                            </div>
                            <div className="space-y-1">
                                <span className="block text-gray-500">Rated Power</span>
                                <span className="text-gray-200">{selectedItem.rated_power} W</span>
                            </div>
                        </>
                    )}
                     {type === 'wind' && (
                        <>
                            <div className="space-y-1">
                                <span className="block text-gray-500">Rotor Diameter</span>
                                <span className="text-gray-200">{selectedItem.rotor_diameter} m</span>
                            </div>
                            <div className="space-y-1">
                                <span className="block text-gray-500">Rated Power</span>
                                <span className="text-gray-200">{selectedItem.rated_power} kW</span>
                            </div>
                        </>
                    )}
                </div>
            )}
        </div>
    );
};

export default EquipmentSelector;
