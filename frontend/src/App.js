import React, { useState } from 'react';
import { Sun, Wind, Droplets, Leaf, Moon, Sun as SunIcon, BarChart2 } from 'lucide-react';
import SolarCalculator from './features/calculators/SolarCalculator';
import AdvancedWindCalculator from './features/calculators/AdvancedWindCalculator';
import HydroCalculator from './features/calculators/HydroCalculator';
import BiomassCalculator from './features/calculators/BiomassCalculator';
import { useTheme } from './contexts/ThemeContext';

const App = () => {
  const [activeTab, setActiveTab] = useState('solar');
  const { isDark, toggleTheme } = useTheme();

  const renderCalculator = () => {
    switch (activeTab) {
      case 'solar': return <SolarCalculator />;
      case 'wind': return <AdvancedWindCalculator />;
      case 'hydro': return <HydroCalculator />;
      case 'biomass': return <BiomassCalculator />;
      default: return <SolarCalculator />;
    }
  };

  const NavButton = ({ id, icon: Icon, label }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`flex items-center space-x-2 px-4 py-3 rounded-lg transition-colors ${
        activeTab === id
          ? 'bg-blue-600 text-white shadow-lg'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-800">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart2 className="text-blue-600 dark:text-blue-500" size={28} />
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-green-500">
              EcoInvest Simulator
            </h1>
          </div>
          
          <button
            onClick={toggleTheme}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-600 dark:text-gray-400"
          >
            {isDark ? <SunIcon size={20} /> : <Moon size={20} />}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 pt-24 pb-12">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Navigation Sidebar */}
          <nav className="lg:w-64 flex-shrink-0">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-2 sticky top-24">
              <NavButton id="solar" icon={Sun} label="Solar Energy" />
              <NavButton id="wind" icon={Wind} label="Wind Energy" />
              <NavButton id="hydro" icon={Droplets} label="Hydroelectric" />
              <NavButton id="biomass" icon={Leaf} label="Biomass" />
            </div>
          </nav>

          {/* Calculator Area */}
          <div className="flex-1">
            {renderCalculator()}
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;
