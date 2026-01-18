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

const MainLayout = ({ children }) => {
    const { isDark, toggleTheme } = useTheme();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex">
            <Sidebar />
            
            <div className="flex-1 ml-64 flex flex-col min-h-screen">
                {/* Header for Theme Toggle */}
                <header className="sticky top-0 z-30 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-100 dark:border-gray-800 h-16 px-6 flex items-center justify-end">
                    <button
                        onClick={toggleTheme}
                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
                    >
                        {isDark ? <SunIcon size={20} /> : <Moon size={20} />}
                    </button>
                </header>

                <main className="flex-1 p-6 lg:p-10 max-w-7xl mx-auto w-full">
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
