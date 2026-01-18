import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sun, Wind, Droplets, Leaf, History, LogIn, LogOut, User, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar = () => {
    const { currentUser, loginWithGoogle, logout } = useAuth();

    const NavItem = ({ to, icon: Icon, label }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
                    isActive
                        ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/20'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50 hover:text-blue-600 dark:hover:text-blue-400'
                }`
            }
        >
            <Icon size={20} className="group-hover:scale-110 transition-transform duration-200" />
            <span className="font-medium">{label}</span>
        </NavLink>
    );

    return (
        <aside className="w-64 bg-white/80 dark:bg-gray-800/80 backdrop-blur-xl border-r border-gray-100 dark:border-gray-700 h-screen fixed left-0 top-0 flex flex-col z-40 transition-colors duration-300">
            {/* Logo Area */}
            <div className="h-20 flex items-center px-6 border-b border-gray-100 dark:border-gray-700">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-green-500 flex items-center justify-center mr-3 shadow-lg shadow-blue-500/20">
                    <Leaf className="text-white" size={18} />
                </div>
                <h1 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-green-600">
                    EcoInvest
                </h1>
            </div>

            {/* Navigation Links */}
            <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
                    Simuladores
                </div>
                <NavItem to="/solar" icon={Sun} label="Energía Solar (Gran Escala)" />
                <NavItem to="/residential-solar" icon={Home} label="Autoconsumo Residencial" />
                <NavItem to="/wind" icon={Wind} label="Energía Eólica" />
                <NavItem to="/hydro" icon={Droplets} label="Hidroeléctrica" />
                <NavItem to="/biomass" icon={Leaf} label="Biomasa" />

                <div className="my-6 border-t border-gray-100 dark:border-gray-700"></div>

                <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4 px-2">
                    Personal
                </div>
                <NavItem to="/history" icon={History} label="Mis Resultados" />
            </nav>

            {/* User / Auth Section */}
            <div className="p-4 border-t border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                {currentUser ? (
                    <div className="space-y-3">
                        <div className="flex items-center space-x-3 px-2">
                            {currentUser.photoURL ? (
                                <img src={currentUser.photoURL} alt="User" className="w-8 h-8 rounded-full border-2 border-white shadow-sm" />
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                                    <User size={16} />
                                </div>
                            )}
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                    {currentUser.displayName || 'Usuario'}
                                </p>
                                <p className="text-xs text-gray-500 truncate">
                                    {currentUser.email}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        >
                            <LogOut size={14} />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={loginWithGoogle}
                        className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-sm font-medium text-white bg-gray-900 hover:bg-gray-800 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-xl transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    >
                        <LogIn size={18} />
                        <span>Iniciar con Google</span>
                    </button>
                )}
            </div>
        </aside>
    );
};

export default Sidebar;
