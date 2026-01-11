import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { Sun, Moon } from 'lucide-react';
import '../../styles/dark-technical.css';

const ThemeToggle = () => {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="theme-toggle-btn glass-button"
      aria-label="Toggle Theme"
    >
      <div className={`toggle-icon-container ${theme === 'light' ? 'light' : 'dark'}`}>
        {theme === 'light' ? <Sun size={24} className="text-warning" /> : <Moon size={24} className="text-primary" />}
      </div>
    </button>
  );
};

export default ThemeToggle;
