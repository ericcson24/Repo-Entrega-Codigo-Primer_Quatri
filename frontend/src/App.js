import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SolarCalculator from './features/calculators/SolarCalculator';
import ResidentialSolarCalculator from './features/calculators/ResidentialSolarCalculator';
import AdvancedWindCalculator from './features/calculators/AdvancedWindCalculator';
import HydroCalculator from './features/calculators/HydroCalculator';
import BiomassCalculator from './features/calculators/BiomassCalculator';
import HistoryDashboard from './features/history/HistoryDashboard';
import Sidebar from './components/layout/Sidebar';
import { useTheme } from './contexts/ThemeContext';
import { AuthProvider } from './contexts/AuthContext';
import { Moon, Sun as SunIcon } from 'lucide-react';
import './App.css';

const MainLayout = ({ children }) => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div className="app-container">
            <Sidebar />
            
            <div className="app-main-content">
                <header className="app-header">
                    <button
                        onClick={toggleTheme}
                        className="theme-toggle-btn"
                    >
                        {isDark ? <SunIcon size={20} /> : <Moon size={20} />}
                    </button>
                </header>

                <main className="app-main">
                    {children}
                </main>
            </div>
        </div>
    );
};


const App = () => {
  return (
    <AuthProvider>
        <BrowserRouter>
            <MainLayout>
                <Routes>
                    <Route path="/" element={<Navigate to="/solar" replace />} />
                    <Route path="/solar" element={<SolarCalculator />} />
                    <Route path="/residential-solar" element={<ResidentialSolarCalculator />} />
                    <Route path="/wind" element={<AdvancedWindCalculator />} />
                    <Route path="/hydro" element={<HydroCalculator />} />
                    <Route path="/biomass" element={<BiomassCalculator />} />
                    <Route path="/history" element={<HistoryDashboard />} />
                </Routes>
            </MainLayout>
        </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
