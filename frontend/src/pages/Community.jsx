import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Avatar } from '../components/Avatar';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useFetch } from '../hooks/useFetch';
import api, { errorMessage } from '../lib/api';
import { keyboardActivate } from '../lib/a11y';

export default function Community() {
    const navigate = useNavigate();
    const [search, setSearch] = useState('');
    const busca = useDebouncedValue(search.trim(), 300);
    const [pendingId, setPendingId] = useState(null);
    const [actionError, setActionError] = useState('');

    const { data, status, error, retry, setData } = useFetch('/comunidade', {
        params: { busca: busca || undefined },
        fallbackError: 'Não foi possível carregar os colecionadores.'
    });
    const users = useMemo(() => data ?? [], [data]);

    const toggleFollow = async (target) => {
        setActionError('');
        setPendingId(target.id);

        try {
            if (target.is_seguindo) {
                await api.delete(`/usuarios/${target.id}/seguir`);
            } else {
                await api.post(`/usuarios/${target.id}/seguir`);
            }

            setData((current) => current.map((u) => (u.id === target.id ? { ...u, is_seguindo: !u.is_seguindo } : u)));
        } catch (err) {
            setActionError(errorMessage(err, 'Não foi possível atualizar o vínculo.'));
        } finally {
            setPendingId(null);
        }
    };

    return (
        <Layout>
            <div className="community-container">
                <div className="dashboard-header">
                    <h1 className="dashboard-title">Comunidade</h1>
                </div>

                <input
                    type="search"
                    className="search-bar"
                    placeholder="Buscar colecionadores por nome ou @username..."
                    aria-label="Buscar colecionadores"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                {actionError && (
                    <p className="form-error" role="alert">
                        {actionError}
                    </p>
                )}

                {status === 'loading' && <p className="state-box">Carregando colecionadores...</p>}

                {status === 'error' && (
                    <div className="state-box" role="alert">
                        <p>{error}</p>
                        <button type="button" className="btn-primary" onClick={retry}>
                            Tentar novamente
                        </button>
                    </div>
                )}

                {status === 'ready' && users.length === 0 && (
                    <div className="state-box">
                        <p>{busca ? 'Nenhum colecionador encontrado com essa busca.' : 'Você é o primeiro por aqui! Convide outros colecionadores.'}</p>
                    </div>
                )}

                {users.length > 0 && (
                    <div className="users-grid">
                        {users.map((u) => (
                            <div
                                className="user-card"
                                key={u.id}
                                role="link"
                                tabIndex={0}
                                aria-label={`Ver perfil de ${u.nome_completo}`}
                                onClick={() => navigate(`/users/${u.id}`)}
                                onKeyDown={keyboardActivate(() => navigate(`/users/${u.id}`))}
                            >
                                <Avatar src={u.foto_perfil} name={u.nome_completo} className="user-avatar-large" />
                                <h3 className="user-name">{u.nome_completo}</h3>
                                <p className="user-username">@{u.username}</p>
                                <p className="user-bio">{u.bio || 'Colecionador misterioso...'}</p>
                                <button
                                    type="button"
                                    className={u.is_seguindo ? 'btn-unfollow' : 'btn-follow'}
                                    disabled={pendingId === u.id}
                                    aria-pressed={u.is_seguindo}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleFollow(u);
                                    }}
                                    onKeyDown={(e) => e.stopPropagation()}
                                >
                                    {u.is_seguindo ? 'Seguindo' : 'Seguir'}
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </Layout>
    );
}
