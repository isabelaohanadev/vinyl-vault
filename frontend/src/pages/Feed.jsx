import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Layout } from '../components/Layout';
import { NewPostModal } from '../components/NewPostModal';
import { PostCard } from '../components/PostCard';
import { usePagedFetch } from '../hooks/usePagedFetch';

export default function Feed() {
    const [searchParams] = useSearchParams();
    const hashtag = searchParams.get('hashtag') || undefined;
    const [creating, setCreating] = useState(false);

    const { items, status, error, hasMore, loadingMore, loadMore, retry, setItems } = usePagedFetch('/posts', {
        params: { hashtag },
        fallbackError: 'Não foi possível carregar o feed.'
    });

    return (
        <Layout>
            <div className="dashboard-header">
                <h1 className="dashboard-title">Feed</h1>
                <button type="button" className="btn-primary" onClick={() => setCreating(true)}>
                    + Nova publicação
                </button>
            </div>

            {hashtag && (
                <div className="timeline-toolbar">
                    <span className="tag-filter">
                        #{hashtag}
                        <Link to="/feed" aria-label="Limpar filtro de hashtag">
                            <i className="fas fa-times" aria-hidden="true"></i>
                        </Link>
                    </span>
                </div>
            )}

            {status === 'loading' && <p className="state-box">Carregando publicações...</p>}

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
                    <p>{hashtag ? `Nenhuma publicação com #${hashtag} ainda.` : 'Ninguém publicou nada ainda. Seja o primeiro!'}</p>
                </div>
            )}

            {items.length > 0 && (
                <div className="timeline-wrapper">
                    {items.map((post) => (
                        <PostCard key={post.id} post={post} onDeleted={(removed) => setItems((current) => current.filter((item) => item.id !== removed.id))} />
                    ))}

                    {hasMore && (
                        <button type="button" className="btn-primary" onClick={loadMore} disabled={loadingMore}>
                            {loadingMore ? 'Carregando...' : 'Carregar mais'}
                        </button>
                    )}
                </div>
            )}

            {creating && (
                <NewPostModal
                    onClose={() => setCreating(false)}
                    onCreated={(post) => {
                        setCreating(false);
                        // A new post matches the open filter only if it carries that hashtag; otherwise just reload.
                        if (hashtag) {
                            retry();
                        } else {
                            setItems((current) => [post, ...current]);
                        }
                    }}
                />
            )}
        </Layout>
    );
}
