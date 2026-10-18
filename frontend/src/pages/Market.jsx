import { useState, useEffect } from 'react';
import axios from 'axios';
import { Layout } from '../components/Layout';
import { useAuth } from '../hooks/useAuth';

export default function Market() {
    const { user } = useAuth();
    const [marketItems, setMarketItems] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMarket = async () => {
            try {
                // Aqui batemos na rota do backend que traz todos os vinis marcados para troca
                const response = await axios.get('http://localhost:3000/api/mercado');
                
                // Filtramos para não mostrar os próprios discos do usuário logado na vitrine de trocas
                const filteredItems = response.data.filter(item => item.usuario_id !== user.id);
                setMarketItems(filteredItems);
            } catch (error) {
                console.error("Erro ao buscar classificados:", error);
                // Caso a rota /api/mercado ainda não exista no seu backend, deixamos um mock de fallback para você ver a tela:
                setMarketItems([
                    { id: 991, nome: 'Dark Side of the Moon', artista: 'Pink Floyd', foto: '', dono_nome: 'Carlos' },
                    { id: 992, nome: 'Abbey Road', artista: 'The Beatles', foto: '', dono_nome: 'Ana' }
                ]);
            } finally {
                setLoading(false);
            }
        };

        fetchMarket();
    }, [user.id]);

    return (
        <Layout>
            <div className="market-header">
                <h1 className="market-title">Classificados</h1>
                <p className="market-subtitle">Encontre raridades e proponha trocas com outros colecionadores.</p>
            </div>

            {loading ? (
                <p>Carregando vitrine...</p>
            ) : (
                <div className="market-grid">
                    {marketItems.length > 0 ? (
                        marketItems.map(item => (
                            <div className="market-card" key={item.id} onClick={() => console.log('Propor troca', item.id)}>
                                <div className="market-badge">Troca</div>
                                <img 
                                    src={item.foto || '/assets/default-cover.svg'} 
                                    alt={item.nome} 
                                    className="market-cover" 
                                />
                                <div className="market-info">
                                    <h3 className="market-album">{item.nome}</h3>
                                    <p className="market-artist">{item.artista}</p>
                                    
                                    <div className="market-owner">
                                        <div className="market-owner-avatar">
                                            {item.dono_nome?.charAt(0).toUpperCase() || 'U'}
                                        </div>
                                        <span className="market-owner-name">{item.dono_nome || 'Usuário Oculto'}</span>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>Nenhum disco disponível para troca no momento.</p>
                    )}
                </div>
            )}
        </Layout>
    );
}