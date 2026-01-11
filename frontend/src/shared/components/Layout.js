import React from 'react';
import { LayoutDashboard, Calculator, Zap, Sun, Wind } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

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
    <div className="app-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <div className="logo-container">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <h1 className="font-bold text-lg tracking-tight">ROI Calculator</h1>
            <p className="text-xs text-gray-500 font-mono">v2.0.0 PRO</p>
          </div>
        </div>

        <div className="sidebar-nav">
          <div className="sidebar-section-title">Calculadoras</div>
          <SidebarItem 
            icon={Sun} 
            label="Energía Solar" 
            active={activeView === 'solar'} 
            onClick={() => onViewChange('solar')} 
          />
          <SidebarItem 
            icon={Wind} 
            label="Energía Eólica" 
            active={activeView === 'wind'} 
            onClick={() => onViewChange('wind')} 
          />

          <div className="sidebar-section-title mt-8">Hogar</div>
          <SidebarItem 
            icon={Calculator} 
            label="Calculadora Simple" 
            active={activeView === 'simple-solar'} 
            onClick={() => onViewChange('simple-solar')} 
          />
          
          <div className="sidebar-section-title mt-8">Análisis</div>
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Resultados" 
            active={activeView === 'results'} 
            onClick={() => onViewChange('results')} 
          />
        </div>

        <div className="sidebar-footer">
          <div className="flex items-center justify-between px-2">
            <span className="text-xs text-gray-500">Modo Oscuro</span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        {/* Header */}
        <header className="main-header">
          <h2 className="text-xl font-semibold">
            {activeView === 'solar' && 'Calculadora Solar Fotovoltaica'}
            {activeView === 'simple-solar' && 'Calculadora Solar Simple'}
            {activeView === 'wind' && 'Calculadora Eólica'}
            {activeView === 'results' && 'Dashboard de Resultados'}
          </h2>
          <div className="flex items-center gap-4">
            <div className="status-badge">
              <div className="status-dot animate-pulse"></div>
              <span className="text-xs font-medium text-accent-success">Sistema Online</span>
            </div>
          </div>
        </header>

        {/* Scrollable Content Area */}
        <div className="content-scroll-area">
          <div className="content-container">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Layout;
