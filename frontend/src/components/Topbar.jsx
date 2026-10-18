import { useAuth } from '../hooks/useAuth';

export const Topbar = () => {
    const { user } = useAuth();

    return (
        <header className="topbar">
            <div></div>
            
            <div className="user-profile-mini">
                <span style={{ fontWeight: 600, color: 'var(--primary-color)' }}>
                    {user?.username || 'Colecionador'}
                </span>
                {user?.foto_perfil ? (
                    <img src={user?.foto_perfil} alt="Avatar" className="avatar-mini" />
                ) : (
                    <div className="avatar-mini">
                        {user?.username?.charAt(0).toUpperCase() || 'V'}
                    </div>
                )}
            </div>
        </header>
    );
};