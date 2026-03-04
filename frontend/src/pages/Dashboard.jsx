import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { VinylCard } from '../components/VinylCard';
import { AddVinylModal } from '../components/AddVinylModal';
import { VinylDetailsModal } from '../components/VinylDetailsModal';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
    const { user } = useAuth();
    const [vinis, setVinis] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedVinyl, setSelectedVinyl] = useState(null);

    const fetchVinis = async () => {
        if (!user?.id) return;
        
        try {
            const response = await axios.get(`http://localhost:3000/api/vinis/${user.id}`);
            setVinis(response.data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVinis();
    }, [user]);

    const stats = {
        total: vinis.length,
        trocas: vinis.filter(v => v.negociavel).length
    };

    return (
        <Layout>
            <div className="dashboard-header">
                <h1 className="dashboard-title">Meu Acervo</h1>
                <button 
                    onClick={() => setIsAddModalOpen(true)}
                    className="btn-edit-profile" 
                    style={{ backgroundColor: 'var(--primary-color)', color: 'var(--text-light)' }}
                >
                    + Adicionar Vinil
                </button>
            </div>
            
            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-value">{stats.total}</span>
                    <span className="stat-label">Vinis na Coleção</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{stats.trocas}</span>
                    <span className="stat-label">Disponíveis para Troca</span>
                </div>
            </div>

            {loading ? (
                <p style={{ marginTop: '40px' }}>Carregando acervo...</p>
            ) : (
                <div className="vinyl-grid" style={{ marginTop: '40px' }}>
                    {vinis.length > 0 ? (
                        vinis.map(vinil => (
                            <VinylCard 
                                key={vinil.id} 
                                vinil={vinil} 
                                onClick={() => setSelectedVinyl(vinil)} 
                            />
                        ))
                    ) : (
                        <p>Nenhum disco encontrado na sua coleção.</p>
                    )}
                </div>
            )}

            <AddVinylModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onSuccess={fetchVinis} 
            />

            <VinylDetailsModal 
                isOpen={!!selectedVinyl}
                onClose={() => setSelectedVinyl(null)}
                vinil={selectedVinyl}
            />
        </Layout>
    );
}