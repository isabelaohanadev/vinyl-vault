import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Avatar } from './Avatar';

export const Topbar = () => {
    const { user } = useAuth();

    return (
        <header className="topbar">
            <div></div>

            <Link to="/profile" className="user-profile-mini" aria-label="Meu perfil">
                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>{user?.username || 'Colecionador'}</span>
                <Avatar src={user?.foto_perfil} name={user?.username} className="avatar-mini" />
            </Link>
        </header>
    );
};
