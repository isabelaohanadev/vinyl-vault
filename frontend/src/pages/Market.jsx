import { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { Avatar } from '../components/Avatar';
import { CoverImage } from '../components/CoverImage';
import { VinylDetailsModal } from '../components/VinylDetailsModal';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useFetch } from '../hooks/useFetch';
import { keyboardActivate } from '../lib/a11y';

export default function Market() {
    const [search, setSearch] = useState('');
    const busca = useDebouncedValue(search.trim(), 300);
    const [selected, setSelected] = useState(null);

    const { data, status, error, retry } = useFetch('/classificados', {
        params: { busca: busca || undefined },
        fallbackError: 'Não foi possível carregar os classificados.'
    });
    const items = useMemo(() => data ?? [], [data]);
    const playlist = useMemo(() => items.filter((item) => item.preview_url), [items]);

    return (
        <Layout>
            <div className="market-header">
                <h1 className="market-title">Classificados</h1>
                <p className="market-subtitle">Encontre raridades e proponha trocas com outros colecionadores.</p>
            </div>

            <input
                type="search"
                className="search-bar"
                placeholder="Buscar por disco ou artista..."
                aria-label="Buscar nos classificados"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ marginBottom: '30px' }}
            />

            {status === 'loading' && <p className="state-box">Carregando vitrine...</p>}

            {status === 'error' && (
                <div className="state-box" role="alert">
                    <p>{error}</p>
                    <button type="button" className="btn-primary" onClick={retry}>
                        Tentar novamente
                    </button>
                </div>
            )}

            {status === 'ready' && items.length === 0 && (
                <div className="state-box">
                    <p>{busca ? 'Nenhum disco encontrado para essa busca.' : 'Nenhum disco disponível para troca no momento.'}</p>
                </div>
            )}

            {items.length > 0 && (
                <div className="market-grid">
                    {items.map((item) => (
                        <div
                            className="market-card"
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            aria-label={`${item.nome}, de ${item.artista}, de ${item.dono.nome_completo}`}
                            onClick={() => setSelected(item)}
                            onKeyDown={keyboardActivate(() => setSelected(item))}
                        >
                            <div className="market-badge">Troca</div>
                            <CoverImage src={item.foto} alt="" className="market-cover" />
                            <div className="market-info">
                                <h3 className="market-album">{item.nome}</h3>
                                <p className="market-artist">{item.artista}</p>

                                <div className="market-owner">
                                    <Avatar src={item.dono.foto_perfil} name={item.dono.nome_completo} className="market-owner-avatar" />
                                    <span className="market-owner-name">{item.dono.nome_completo}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {selected && <VinylDetailsModal vinil={selected} playlist={playlist} onClose={() => setSelected(null)} />}
        </Layout>
    );
}
