import React, { useState } from 'react';
import { LayoutDashboard, Sun, Wind, Activity } from 'lucide-react';

const SidebarItem = ({ icon: Icon, label, active, onClick }) => (
  <button
    onClick={onClick}
    className={`sidebar-item ${active ? 'active' : ''}`}
  >
    <Icon size={20} />
    <span className="font-medium">{label}</span>
  </button>
);

const Layout = ({ children, activeView, onViewChange }) => {
  return (
    <div className="flex min-h-screen bg-gray-900 text-gray-100">
      {/* Sidebar */}
      <aside className="w-64 border-r border-gray-800 bg-gray-950 flex flex-col">
        <div className="p-6 border-b border-gray-800">
          <div className="flex items-center gap-2 text-cyan-400 mb-1">
             <Activity size={24} />
             <span className="font-bold text-lg tracking-wider">RENEWABLE AI</span>
          </div>
          <p className="text-xs text-gray-500 font-mono">Industrial Simulator v2.0</p>
        </div>

        <div className="flex-1 py-6 px-3 space-y-2">
            <SidebarItem 
                icon={Sun} 
                label="Solar Simulator" 
                active={activeView === 'solar'} 
                onClick={() => onViewChange('solar')}
            />
            <SidebarItem 
                icon={Wind} 
                label="Wind Simulator" 
                active={activeView === 'wind'} 
                onClick={() => onViewChange('wind')}
            />
            {/* Future items could go here */}
        </div>

        <div className="p-4 border-t border-gray-800 text-xs text-gray-600 text-center">
            &copy; 2026 EcoTech Systems
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-[#0a0a0a]">
        <div className="container mx-auto p-8 max-w-6xl">
            {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
