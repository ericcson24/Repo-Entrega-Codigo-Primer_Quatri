import React from 'react';
import { NavLink } from 'react-router-dom';
import { Sun, Wind, Droplets, Leaf, History, LogIn, LogOut, User, Home } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import './Sidebar.css';

const Sidebar = () => {
    const { currentUser, loginWithGoogle, logout } = useAuth();

    const NavItem = ({ to, icon: Icon, label }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
        >
            <Icon size={20} className="sidebar-nav-item-icon" />
            <span>{label}</span>
        </NavLink>
    );

    return (
        <aside className="sidebar-container">
            <div className="sidebar-logo">
                <div className="sidebar-logo-icon">
                    <Leaf className="text-white" size={18} />
                </div>
                <h1 className="sidebar-logo-text">
                    EcoInvest
                </h1>
            </div>

            <nav className="sidebar-nav">
                <div className="sidebar-section-title">
                    Simuladores
                </div>
                <NavItem to="/solar" icon={Sun} label="Energía Solar (Gran Escala)" />
                <NavItem to="/residential-solar" icon={Home} label="Autoconsumo Residencial" />
                <NavItem to="/wind" icon={Wind} label="Energía Eólica" />
                <NavItem to="/hydro" icon={Droplets} label="Hidroeléctrica" />
                <NavItem to="/biomass" icon={Leaf} label="Biomasa" />

                <div className="sidebar-divider"></div>

                <div className="sidebar-section-title">
                    Personal
                </div>
                <NavItem to="/history" icon={History} label="Mis Resultados" />
            </nav>

            <div className="sidebar-user-section">
                {currentUser ? (
                    <div className="sidebar-user-info">
                        <div className="sidebar-user-profile">
                            {currentUser.photoURL ? (
                                <img src={currentUser.photoURL} alt="User" className="sidebar-user-avatar" />
                            ) : (
                                <div className="sidebar-user-avatar-placeholder">
                                    <User size={16} />
                                </div>
                            )}
                            <div className="sidebar-user-details">
                                <p className="sidebar-user-name">
                                    {currentUser.displayName || 'Usuario'}
                                </p>
                                <p className="sidebar-user-email">
                                    {currentUser.email}
                                </p>
                            </div>
                        </div>
                        <button
                            onClick={logout}
                            className="sidebar-logout-btn"
                        >
                            <LogOut size={14} />
                            <span>Cerrar Sesión</span>
                        </button>
                    </div>
                ) : (
                    <button
                        onClick={loginWithGoogle}
                        className="sidebar-login-btn"
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
