import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export default function Profile() {
    const { user } = useAuth();
    const [stats, setStats] = useState({ total: 0, badges: [] });
    const [activeTab, setActiveTab] = useState('acervo');

    useEffect(() => {
        const fetchProfileData = async () => {
            try {
                // Buscamos os vinis para atualizar o contador real
                const response = await axios.get(`http://localhost:3000/api/vinis/${user.id}`);
                
                // Simulação de badges baseada na quantidade de discos
                const myBadges = [
                    { id: 1, icon: '💿', name: 'Primeiro Disco' }
                ];
                
                if (response.data.length >= 5) {
                    myBadges.push({ id: 2, icon: '🔥', name: 'Colecionador Ativo' });
                }

                setStats({
                    total: response.data.length,
                    badges: myBadges
                });
            } catch (error) {
                console.error("Erro ao carregar dados do perfil:", error);
            }
        };

        fetchProfileData();
    }, [user.id]);

    return (
        <Layout>
            <div className="profile-container">
                <header className="profile-header">
                    <div className="profile-avatar-large">
                        {user?.foto_perfil ? (
                            <img src={user.foto_perfil} alt={user.username} className="profile-avatar-large" />
                        ) : (
                            user?.username?.charAt(0).toUpperCase()
                        )}
                    </div>

                    <div className="profile-info">
                        <div className="profile-name-row">
                            <h1 className="profile-name">{user?.nome || user?.username}</h1>
                            <div className="profile-actions">
                                <button className="btn-edit-profile">Editar Perfil</button>
                            </div>
                        </div>

                        <div className="profile-stats">
                            <span>{stats.total} <b>discos</b></span>
                            <span>0 <b>seguidores</b></span>
                            <span>0 <b>seguindo</b></span>
                        </div>

                        <p className="profile-bio">
                            {user?.bio || "Nenhuma biografia definida ainda. Clique em editar para contar sua história com o vinil."}
                        </p>

                        <div className="badges-container">
                            {stats.badges.map(badge => (
                                <div className="badge-item" key={badge.id} title={badge.name}>
                                    <span className="badge-icon">{badge.icon}</span>
                                    <span className="badge-name">{badge.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </header>

                <nav className="profile-tabs">
                    <button 
                        className={`profile-tab ${activeTab === 'acervo' ? 'active' : ''}`}
                        onClick={() => setActiveTab('acervo')}
                    >
                        Acervo
                    </button>
                    <button 
                        className={`profile-tab ${activeTab === 'posts' ? 'active' : ''}`}
                        onClick={() => setActiveTab('posts')}
                    >
                        Publicações
                    </button>
                </nav>

                <div style={{ textAlign: 'center', marginTop: '40px', color: 'var(--tertiary-color)' }}>
                    {activeTab === 'acervo' 
                        ? "Visualize seus discos no Dashboard principal." 
                        : "Você ainda não fez nenhuma publicação na timeline."}
                </div>
            </div>
        </Layout>
    );
}