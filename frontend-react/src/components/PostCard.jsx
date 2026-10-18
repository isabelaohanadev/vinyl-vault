import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useFetch } from '../hooks/useFetch';
import api, { errorMessage } from '../lib/api';
import { timeAgo } from '../lib/date';
import { splitHashtags } from '../lib/hashtags';
import { Avatar } from './Avatar';

const Caption = ({ text }) => (
    <p className="post-caption">
        {splitHashtags(text).map((part, index) =>
            part.tag ? (
                <Link key={index} to={`/feed?hashtag=${encodeURIComponent(part.tag)}`} className="hashtag">
                    {part.text}
                </Link>
            ) : (
                <span key={index}>{part.text}</span>
            )
        )}
    </p>
);

const Comments = ({ post, onCountChange }) => {
    const { user } = useAuth();
    const { data, status, error, reload, setData } = useFetch(`/posts/${post.id}/comentarios`, {
        fallbackError: 'Não foi possível carregar os comentários.'
    });
    const [text, setText] = useState('');
    const [sending, setSending] = useState(false);
    const [actionError, setActionError] = useState('');

    const comments = data ?? [];

    const handleSubmit = async (e) => {
        e.preventDefault();
        const texto = text.trim();

        if (!texto) {
            return;
        }

        setSending(true);
        setActionError('');

        try {
            await api.post(`/posts/${post.id}/comentarios`, { texto });
            setText('');
            reload();
            onCountChange(1);
        } catch (err) {
            setActionError(errorMessage(err, 'Não foi possível comentar.'));
        } finally {
            setSending(false);
        }
    };

    const handleDelete = async (comment) => {
        setActionError('');

        try {
            await api.delete(`/comentarios/${comment.id}`);
            setData((current) => current.filter((item) => item.id !== comment.id));
            onCountChange(-1);
        } catch (err) {
            setActionError(errorMessage(err, 'Não foi possível apagar o comentário.'));
        }
    };

    return (
        <div className="comments-section">
            {status === 'loading' && <p className="comment-item">Carregando comentários...</p>}
            {status === 'error' && <p className="comment-item" role="alert">{error}</p>}

            {comments.map((comment) => (
                <div className="comment-item" key={comment.id}>
                    <p>
                        <Link to={comment.usuario_id === user.id ? '/profile' : `/users/${comment.usuario_id}`}>
                            <strong>@{comment.username}</strong>
                        </Link>{' '}
                        {comment.texto}
                    </p>
                    {(comment.usuario_id === user.id || post.usuario_id === user.id) && (
                        <button type="button" className="comment-delete" onClick={() => handleDelete(comment)} aria-label="Apagar comentário">
                            <i className="fas fa-times" aria-hidden="true"></i>
                        </button>
                    )}
                </div>
            ))}

            {actionError && <p className="form-error" role="alert">{actionError}</p>}

            <form className="comment-input-wrapper" onSubmit={handleSubmit}>
                <input
                    type="text"
                    className="comment-input"
                    placeholder="Adicione um comentário..."
                    aria-label="Adicionar um comentário"
                    maxLength={1000}
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                />
                <button type="submit" className="btn-send-comment" disabled={sending || !text.trim()}>
                    Publicar
                </button>
            </form>
        </div>
    );
};

export const PostCard = ({ post, onDeleted }) => {
    const { user } = useAuth();
    const [likes, setLikes] = useState({ count: post.likes_count, liked: post.user_liked });
    const [commentCount, setCommentCount] = useState(post.comments_count);
    const [commentsOpen, setCommentsOpen] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [imageBroken, setImageBroken] = useState(false);
    const [error, setError] = useState('');

    const isOwn = post.usuario_id === user.id;
    const profileLink = isOwn ? '/profile' : `/users/${post.usuario_id}`;

    const toggleLike = async () => {
        setError('');

        try {
            const { data } = await api.post(`/posts/${post.id}/curtir`);
            setLikes({ count: data.likes_count, liked: data.user_liked });
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível curtir.'));
        }
    };

    const handleDelete = async () => {
        setError('');

        try {
            await api.delete(`/posts/${post.id}`);
            onDeleted(post);
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível excluir a publicação.'));
        }
    };

    return (
        <article className="post-card">
            <Link to={profileLink} className="post-header">
                <Avatar src={post.autor.foto_perfil} name={post.autor.nome_completo} className="post-avatar" />
                <div>
                    <div className="post-author-name">{post.autor.nome_completo}</div>
                    <small className="post-meta">
                        @{post.autor.username} · {timeAgo(post.criado_em)}
                    </small>
                </div>
            </Link>

            {post.foto && !imageBroken && (
                <img src={post.foto} alt="Foto da publicação" className="post-image" loading="lazy" onError={() => setImageBroken(true)} />
            )}

            <div className="post-content">
                <div className="post-actions-bar">
                    <button type="button" className="btn-post-action" onClick={toggleLike} aria-pressed={likes.liked} aria-label={likes.liked ? 'Descurtir' : 'Curtir'}>
                        <i className={`${likes.liked ? 'fas' : 'far'} fa-heart`} style={likes.liked ? { color: 'var(--secondary-color)' } : undefined} aria-hidden="true"></i>
                        <span>{likes.count}</span>
                    </button>
                    <button type="button" className="btn-post-action" onClick={() => setCommentsOpen((open) => !open)} aria-expanded={commentsOpen} aria-label="Comentários">
                        <i className="far fa-comment" aria-hidden="true"></i>
                        <span>{commentCount}</span>
                    </button>
                    {isOwn && !confirmingDelete && (
                        <button type="button" className="btn-post-action post-delete" onClick={() => setConfirmingDelete(true)} aria-label="Excluir publicação">
                            <i className="far fa-trash-alt" aria-hidden="true"></i>
                        </button>
                    )}
                </div>

                {confirmingDelete && (
                    <div className="post-confirm" role="alertdialog" aria-label="Confirmar exclusão">
                        <span>Excluir esta publicação?</span>
                        <button type="button" className="btn-action btn-secondary" onClick={() => setConfirmingDelete(false)}>Cancelar</button>
                        <button type="button" className="btn-action btn-danger" onClick={handleDelete}>Excluir</button>
                    </div>
                )}

                {post.legenda && <Caption text={post.legenda} />}
                {error && <p className="form-error" role="alert">{error}</p>}
            </div>

            {commentsOpen && <Comments post={post} onCountChange={(delta) => setCommentCount((count) => count + delta)} />}
        </article>
    );
};
