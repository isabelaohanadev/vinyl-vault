import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

const NAV_ITEMS = [
    { to: '/dashboard', icon: 'fa-home', label: 'Início' },
    { to: '/feed', icon: 'fa-stream', label: 'Feed' },
    { to: '/community', icon: 'fa-users', label: 'Comunidade' },
    { to: '/market', icon: 'fa-store', label: 'Classificados' },
    { to: '/profile', icon: 'fa-user', label: 'Meu Perfil' }
];

export const Sidebar = () => {
    const { logout } = useAuth();
    const { pathname } = useLocation();

    return (
        <aside className="sidebar">
            <img src="/assets/logo.svg" alt="Vinyl Vault" className="sidebar-logo" />
            <nav className="nav-menu" aria-label="Navegação principal">
                {NAV_ITEMS.map(({ to, icon, label }) => (
                    <Link key={to} to={to} className={`nav-item ${pathname === to ? 'active' : ''}`} aria-current={pathname === to ? 'page' : undefined} aria-label={label}>
                        <i className={`fas ${icon}`} aria-hidden="true"></i>
                        <span>{label}</span>
                    </Link>
                ))}

                <button type="button" onClick={logout} className="nav-item nav-logout" aria-label="Sair">
                    <i className="fas fa-sign-out-alt" aria-hidden="true"></i>
                    <span>Sair</span>
                </button>
            </nav>
        </aside>
    );
};
