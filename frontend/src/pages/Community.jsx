import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { useAuth } from '../contexts/AuthContext';

export default function Community() {
    const { user } = useAuth();
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchUsers = async () => {
            try {
                const response = await axios.get('http://localhost:3000/api/usuarios');
                const otherUsers = response.data.filter(u => u.id !== user.id);
                setUsers(otherUsers);
            } catch (error) {
                console.error(error);
                setUsers([
                    { id: 2, username: 'carlos_vinyl', nome: 'Carlos Silva', bio: 'Colecionador de Rock Clássico e Blues. Buscando edições originais dos anos 70.', foto_perfil: '' },
                    { id: 3, username: 'ana.grooves', nome: 'Ana Souza', bio: 'Amante de MPB e Jazz. Vinil é terapia.', foto_perfil: '' },
                    { id: 4, username: 'dj_marcos', nome: 'Marcos Paulo', bio: 'Focado em música eletrônica e synth-pop dos anos 80.', foto_perfil: '' }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchUsers();
    }, [user.id]);

    const filteredUsers = users.filter(u => 
        u.nome?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        u.username?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <Layout>
            <div className="community-container">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Comunidade</h1>
                </div>

                <input 
                    type="text" 
                    className="search-bar" 
                    placeholder="Buscar colecionadores por nome ou @username..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />

                {loading ? (
                    <p>Carregando colecionadores...</p>
                ) : (
                    <div className="users-grid">
                        {filteredUsers.length > 0 ? (
                            filteredUsers.map(u => (
                                <div className="user-card" key={u.id}>
                                    <div className="user-avatar-large" style={{ backgroundImage: `url(${u.foto_perfil})` }}>
                                        {!u.foto_perfil && (u.nome?.charAt(0).toUpperCase() || 'U')}
                                    </div>
                                    <h3 className="user-name">{u.nome}</h3>
                                    <p className="user-username">@{u.username}</p>
                                    <p className="user-bio">{u.bio || 'Colecionador misterioso...'}</p>
                                    <button className="btn-follow">Seguir</button>
                                </div>
                            ))
                        ) : (
                            <p>Nenhum colecionador encontrado com essa busca.</p>
                        )}
                    </div>
                )}
            </div>
        </Layout>
    );
}