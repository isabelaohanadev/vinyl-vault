import { useMemo, useState } from 'react';
import { Layout } from '../components/Layout';
import { VinylCard } from '../components/VinylCard';
import { AddVinylModal } from '../components/AddVinylModal';
import { VinylDetailsModal } from '../components/VinylDetailsModal';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';

export default function Dashboard() {
    const { user } = useAuth();
    const { data, status, error, retry, reload, setData } = useFetch(`/usuarios/${user.id}/vinis`, {
        fallbackError: 'Não foi possível carregar seu acervo.'
    });
    const vinis = useMemo(() => data ?? [], [data]);
    const [search, setSearch] = useState('');
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [selected, setSelected] = useState(null);

    const stats = useMemo(
        () => ({
            colecao: vinis.filter((v) => v.adquirido).length,
            trocas: vinis.filter((v) => v.negociavel).length,
            desejos: vinis.filter((v) => !v.adquirido).length
        }),
        [vinis]
    );

    const filtered = useMemo(() => {
        const term = search.trim().toLowerCase();

        if (!term) {
            return vinis;
        }

        return vinis.filter((v) => [v.nome, v.artista, v.genero].some((field) => field?.toLowerCase().includes(term)));
    }, [vinis, search]);

    const playlist = useMemo(() => filtered.filter((v) => v.preview_url), [filtered]);

    const closeForm = () => {
        setFormOpen(false);
        setEditing(null);
    };

    const handleSaved = (saved) => {
        closeForm();
        // Reopen the details so an edit is reflected right away.
        setSelected((current) => (current ? saved : null));
        reload();
    };

    const handleDeleted = (removed) => {
        setSelected(null);
        setData((current) => current.filter((v) => v.id !== removed.id));
    };

    return (
        <Layout>
            <div className="dashboard-header">
                <h1 className="dashboard-title">Meu Acervo</h1>
                <button type="button" onClick={() => setFormOpen(true)} className="btn-primary">
                    + Adicionar Vinil
                </button>
            </div>

            <div className="stats-grid">
                <div className="stat-card">
                    <span className="stat-value">{stats.colecao}</span>
                    <span className="stat-label">Vinis na Coleção</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{stats.trocas}</span>
                    <span className="stat-label">Disponíveis para Troca</span>
                </div>
                <div className="stat-card">
                    <span className="stat-value">{stats.desejos}</span>
                    <span className="stat-label">Na Lista de Desejos</span>
                </div>
            </div>

            {status === 'loading' && <p className="state-box">Carregando acervo...</p>}

            {status === 'error' && (
                <div className="state-box" role="alert">
                    <p>{error}</p>
                    <button type="button" className="btn-primary" onClick={retry}>
                        Tentar novamente
                    </button>
                </div>
            )}

            {status === 'ready' && (
                <>
                    {vinis.length > 0 && (
                        <input
                            type="search"
                            className="search-bar"
                            placeholder="Buscar no acervo por disco, artista ou gênero..."
                            aria-label="Buscar no acervo"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            style={{ marginBottom: '30px' }}
                        />
                    )}

                    {filtered.length > 0 ? (
                        <div className="vinyl-grid">
                            {filtered.map((vinil) => (
                                <VinylCard key={vinil.id} vinil={vinil} onClick={() => setSelected(vinil)} />
                            ))}
                        </div>
                    ) : (
                        <div className="state-box">
                            {vinis.length === 0 ? (
                                <>
                                    <p>Seu acervo ainda está vazio. Que tal registrar o primeiro disco?</p>
                                    <button type="button" className="btn-primary" onClick={() => setFormOpen(true)}>
                                        Adicionar meu primeiro vinil
                                    </button>
                                </>
                            ) : (
                                <p>Nenhum disco encontrado para essa busca.</p>
                            )}
                        </div>
                    )}
                </>
            )}

            {(formOpen || editing) && <AddVinylModal vinil={editing} onClose={closeForm} onSaved={handleSaved} />}

            {selected && !editing && (
                <VinylDetailsModal
                    vinil={selected}
                    playlist={playlist}
                    onClose={() => setSelected(null)}
                    onEdit={setEditing}
                    onDeleted={handleDeleted}
                />
            )}
        </Layout>
    );
}
