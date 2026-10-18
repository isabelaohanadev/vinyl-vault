import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { Avatar } from '../components/Avatar';
import { EditProfileModal } from '../components/EditProfileModal';
import { PostCard } from '../components/PostCard';
import { VinylCard } from '../components/VinylCard';
import { VinylDetailsModal } from '../components/VinylDetailsModal';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import { usePagedFetch } from '../hooks/usePagedFetch';
import api, { errorMessage } from '../lib/api';
import { computeBadges } from '../lib/badges';

const PostsTab = ({ userId, own }) => {
    const { items, status, error, hasMore, loadingMore, loadMore, retry, setItems } = usePagedFetch(`/usuarios/${userId}/posts`, {
        fallbackError: 'Não foi possível carregar as publicações.'
    });

    if (status === 'loading') return <p className="state-box">Carregando publicações...</p>;

    if (status === 'error') {
        return (
            <div className="state-box" role="alert">
                <p>{error}</p>
                <button type="button" className="btn-primary" onClick={retry}>Tentar novamente</button>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="state-box">
                <p>{own ? 'Você ainda não fez nenhuma publicação.' : 'Nenhuma publicação ainda.'}</p>
                {own && <Link to="/feed" className="btn-primary">Ir para o feed</Link>}
            </div>
        );
    }

    return (
        <div className="timeline-wrapper" style={{ marginTop: '30px' }}>
            {items.map((post) => (
                <PostCard key={post.id} post={post} onDeleted={(removed) => setItems((current) => current.filter((item) => item.id !== removed.id))} />
            ))}
            {hasMore && (
                <button type="button" className="btn-primary" onClick={loadMore} disabled={loadingMore}>
                    {loadingMore ? 'Carregando...' : 'Carregar mais'}
                </button>
            )}
        </div>
    );
};

const CollectionTab = ({ userId, own }) => {
    const { data, status, error, retry } = useFetch(`/usuarios/${userId}/vinis`, { fallbackError: 'Não foi possível carregar o acervo.' });
    const [selected, setSelected] = useState(null);

    if (status === 'loading') return <p className="state-box">Carregando acervo...</p>;

    if (status === 'error') {
        return (
            <div className="state-box" role="alert">
                <p>{error}</p>
                <button type="button" className="btn-primary" onClick={retry}>Tentar novamente</button>
            </div>
        );
    }

    if (data.length === 0) {
        return <div className="state-box"><p>{own ? 'Seu acervo ainda está vazio.' : 'Este colecionador ainda não cadastrou discos.'}</p></div>;
    }

    return (
        <>
            {own && (
                <p style={{ textAlign: 'center', marginTop: '30px' }}>
                    <Link to="/dashboard" className="vinyl-link">Gerenciar meu acervo</Link>
                </p>
            )}
            <div className="vinyl-grid" style={{ marginTop: '30px' }}>
                {data.map((vinil) => (
                    <VinylCard key={vinil.id} vinil={vinil} onClick={() => setSelected(vinil)} />
                ))}
            </div>
            {selected && <VinylDetailsModal vinil={selected} playlist={data.filter((v) => v.preview_url)} onClose={() => setSelected(null)} />}
        </>
    );
};

// Remounted (key) whenever the profile being viewed changes, so tabs and modals reset.
const ProfileView = ({ targetId }) => {
    const { user } = useAuth();
    const own = targetId === user.id;

    const [tab, setTab] = useState('acervo');
    const [editing, setEditing] = useState(false);
    const [followError, setFollowError] = useState('');
    const [following, setFollowing] = useState(false);

    const publicProfile = useFetch(own ? null : `/usuarios/${targetId}`, { fallbackError: 'Não foi possível carregar o perfil.' });
    const stats = useFetch(`/usuarios/${targetId}/stats`, { fallbackError: 'Não foi possível carregar as estatísticas.' });

    const profile = own ? user : publicProfile.data;

    if (!own && publicProfile.status === 'error') {
        return (
            <Layout>
                <div className="state-box" role="alert">
                    <p>{publicProfile.error}</p>
                    <Link to="/community" className="btn-primary">Voltar para a comunidade</Link>
                </div>
            </Layout>
        );
    }

    if (!profile) {
        return <Layout><p className="state-box">Carregando perfil...</p></Layout>;
    }

    const counts = stats.data;

    const toggleFollow = async () => {
        setFollowError('');
        setFollowing(true);

        try {
            if (counts.eu_sigo) {
                await api.delete(`/usuarios/${targetId}/seguir`);
            } else {
                await api.post(`/usuarios/${targetId}/seguir`);
            }

            stats.setData((current) => ({
                ...current,
                eu_sigo: !current.eu_sigo,
                seguidores: current.seguidores + (current.eu_sigo ? -1 : 1)
            }));
        } catch (err) {
            setFollowError(errorMessage(err, 'Não foi possível atualizar o vínculo.'));
        } finally {
            setFollowing(false);
        }
    };

    const badges = counts
        ? computeBadges({ totalVinis: counts.total_vinis, totalTrocas: counts.total_trocas, seguidores: counts.seguidores, totalPosts: counts.total_posts })
        : [];

    return (
        <Layout>
            <div className="profile-container">
                <header className="profile-header">
                    <Avatar src={profile.foto_perfil} name={profile.nome_completo || profile.username} className="profile-avatar-large" />

                    <div className="profile-info">
                        <div className="profile-name-row">
                            <div>
                                <h1 className="profile-name">{profile.nome_completo || profile.username}</h1>
                                <span className="profile-username">@{profile.username}</span>
                            </div>
                            <div className="profile-actions">
                                {own ? (
                                    <button type="button" className="btn-edit-profile" onClick={() => setEditing(true)}>Editar Perfil</button>
                                ) : (
                                    counts && (
                                        <button
                                            type="button"
                                            className={counts.eu_sigo ? 'btn-unfollow profile-follow' : 'btn-follow profile-follow'}
                                            onClick={toggleFollow}
                                            disabled={following}
                                            aria-pressed={counts.eu_sigo}
                                        >
                                            {counts.eu_sigo ? 'Seguindo' : 'Seguir'}
                                        </button>
                                    )
                                )}
                            </div>
                        </div>

                        {followError && <p className="form-error" role="alert">{followError}</p>}

                        <div className="profile-stats">
                            <span>{counts ? counts.total_vinis : '–'} <b>discos</b></span>
                            <span>{counts ? counts.seguidores : '–'} <b>seguidores</b></span>
                            <span>{counts ? counts.seguindo : '–'} <b>seguindo</b></span>
                        </div>

                        {profile.tocando_agora && (
                            <span className="now-playing-badge" title={profile.tocando_agora}>
                                <span className="now-playing-icon"></span>
                                {profile.tocando_agora}
                            </span>
                        )}

                        <p className="profile-bio">
                            {profile.bio || (own ? 'Nenhuma biografia definida ainda. Clique em editar para contar sua história com o vinil.' : 'Este colecionador ainda não escreveu uma biografia.')}
                        </p>

                        {badges.length > 0 && (
                            <div className="badges-container">
                                {badges.map((badge) => (
                                    <div className="badge-item" key={badge.id} title={badge.name}>
                                        <span className="badge-icon" aria-hidden="true">{badge.icon}</span>
                                        <span className="badge-name">{badge.name}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </header>

                <nav className="profile-tabs" role="tablist" aria-label="Seções do perfil">
                    <button type="button" role="tab" aria-selected={tab === 'acervo'} className={`profile-tab ${tab === 'acervo' ? 'active' : ''}`} onClick={() => setTab('acervo')}>
                        Acervo
                    </button>
                    <button type="button" role="tab" aria-selected={tab === 'posts'} className={`profile-tab ${tab === 'posts' ? 'active' : ''}`} onClick={() => setTab('posts')}>
                        Publicações
                    </button>
                </nav>

                {tab === 'acervo' ? <CollectionTab userId={targetId} own={own} /> : <PostsTab userId={targetId} own={own} />}
            </div>

            {editing && <EditProfileModal onClose={() => setEditing(false)} />}
        </Layout>
    );
};

export default function Profile() {
    const { id } = useParams();
    const { user } = useAuth();
    const targetId = id === undefined ? user.id : Number(id);

    if (!Number.isInteger(targetId) || targetId < 1) {
        return (
            <Layout>
                <div className="state-box" role="alert">
                    <p>Perfil não encontrado.</p>
                    <Link to="/community" className="btn-primary">Voltar para a comunidade</Link>
                </div>
            </Layout>
        );
    }

    return <ProfileView key={targetId} targetId={targetId} />;
}
