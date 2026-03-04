import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const Sidebar = () => {
    const { logout } = useAuth();
    const location = useLocation();

    const isActive = (path) => location.pathname === path ? 'active' : '';

    return (
        <aside className="sidebar">
            <img src="/assets/logo.png" alt="Vinyl Vault" className="sidebar-logo" />
            <nav className="nav-menu">
                <Link to="/dashboard" className={`nav-item ${isActive('/dashboard')}`}>
                    <i className="fas fa-home"></i>
                    <span>Início</span>
                </Link>
                <Link to="/community" className={`nav-item ${isActive('/community')}`}>
                    <i className="fas fa-users"></i>
                    <span>Comunidade</span>
                </Link>
                <Link to="/market" className={`nav-item ${isActive('/market')}`}>
                    <i className="fas fa-store"></i>
                    <span>Classificados</span>
                </Link>
                <Link to="/profile" className={`nav-item ${isActive('/profile')}`}>
                    <i className="fas fa-user"></i>
                    <span>Meu Perfil</span>
                </Link>
                
                <button onClick={logout} className="nav-item" style={{ marginTop: 'auto', color: 'var(--secondary-color)' }}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </button>
            </nav>
        </aside>
    );
};