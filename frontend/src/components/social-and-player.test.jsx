import { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/api';
import { PlayerProvider } from '../contexts/PlayerProvider';
import { usePlayer } from '../hooks/usePlayer';
import { renderApp } from '../test/utils';
import { Player } from './Player';
import { PostCard } from './PostCard';
import { VinylDetailsModal } from './VinylDetailsModal';

vi.mock('../lib/api', async (importOriginal) => ({
    ...(await importOriginal()),
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

const post = (overrides = {}) => ({
    id: 10, usuario_id: 2, foto: null, legenda: 'Disco novo #jazz #vinil', criado_em: new Date().toISOString(),
    likes_count: 2, comments_count: 1, user_liked: false,
    autor: { id: 2, username: 'bruno', nome_completo: 'Bruno Lima', foto_perfil: null }, ...overrides
});

describe('PostCard', () => {
    it('turns hashtags into links that filter the feed', () => {
        renderApp(<PostCard post={post()} onDeleted={() => {}} />);

        expect(screen.getByRole('link', { name: '#jazz' })).toHaveAttribute('href', '/feed?hashtag=jazz');
        expect(screen.getByRole('link', { name: '#vinil' })).toHaveAttribute('href', '/feed?hashtag=vinil');
    });

    it('toggles the like using the count returned by the API', async () => {
        const user = userEvent.setup();
        api.post.mockResolvedValue({ data: { acao: 'adicionada', user_liked: true, likes_count: 3 } });
        renderApp(<PostCard post={post()} onDeleted={() => {}} />);

        await user.click(screen.getByRole('button', { name: 'Curtir' }));

        expect(api.post).toHaveBeenCalledWith('/posts/10/curtir');
        expect(await screen.findByRole('button', { name: 'Descurtir' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByText('3')).toBeInTheDocument();
    });

    it('only offers deletion on your own posts, and asks first', async () => {
        const user = userEvent.setup();
        api.delete.mockResolvedValue({ data: {} });
        const onDeleted = vi.fn();
        const { unmount } = renderApp(<PostCard post={post()} onDeleted={onDeleted} />);
        expect(screen.queryByRole('button', { name: 'Excluir publicação' })).not.toBeInTheDocument();
        unmount();

        renderApp(<PostCard post={post({ usuario_id: 1 })} onDeleted={onDeleted} />);
        await user.click(screen.getByRole('button', { name: 'Excluir publicação' }));
        expect(api.delete).not.toHaveBeenCalled();
        await user.click(screen.getByRole('button', { name: 'Excluir' }));

        await waitFor(() => expect(onDeleted).toHaveBeenCalledWith(expect.objectContaining({ id: 10 })));
        expect(api.delete).toHaveBeenCalledWith('/posts/10');
    });

    it('loads comments on demand and lets you comment', async () => {
        const user = userEvent.setup();
        api.get.mockResolvedValue({ data: [{ id: 1, usuario_id: 2, username: 'bruno', texto: 'Que capa!' }] });
        api.post.mockResolvedValue({ data: { id: 2 } });
        renderApp(<PostCard post={post()} onDeleted={() => {}} />);
        expect(api.get).not.toHaveBeenCalled();

        await user.click(screen.getByRole('button', { name: 'Comentários' }));
        expect(await screen.findByText('Que capa!')).toBeInTheDocument();

        await user.type(screen.getByLabelText('Adicionar um comentário'), 'Concordo!');
        await user.click(screen.getByRole('button', { name: 'Publicar' }));

        expect(api.post).toHaveBeenCalledWith('/posts/10/comentarios', { texto: 'Concordo!' });
    });
});

describe('VinylDetailsModal', () => {
    const vinil = { id: 5, nome: 'Blue Train', artista: 'John Coltrane', foto: null, adquirido: true, negociavel: false, nota: 4, ano: 1957, preview_url: null };

    it('disables playback for records without a preview', () => {
        renderApp(<VinylDetailsModal vinil={vinil} onClose={() => {}} />);

        expect(screen.getByRole('button', { name: /Tocar Preview/ })).toBeDisabled();
    });

    it('plays the preview handing the player its playlist', async () => {
        const user = userEvent.setup();
        const withPreview = { ...vinil, preview_url: 'https://cdn.example.com/p.mp3' };
        const { playerValue } = renderApp(<VinylDetailsModal vinil={withPreview} playlist={[withPreview]} onClose={() => {}} />);

        await user.click(screen.getByRole('button', { name: /Tocar Preview/ }));

        expect(playerValue.play).toHaveBeenCalledWith(withPreview, [withPreview]);
    });

    it('pauses instead when this record is the one playing', async () => {
        const user = userEvent.setup();
        const withPreview = { ...vinil, preview_url: 'https://cdn.example.com/p.mp3' };
        const { playerValue } = renderApp(<VinylDetailsModal vinil={withPreview} onClose={() => {}} />, { player: { track: withPreview, playing: true } });

        await user.click(screen.getByRole('button', { name: /Pausar/ }));

        expect(playerValue.toggle).toHaveBeenCalled();
        expect(playerValue.play).not.toHaveBeenCalled();
    });

    it('hides edit and delete unless the callbacks are provided', () => {
        renderApp(<VinylDetailsModal vinil={vinil} onClose={() => {}} />);

        expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    });
});

describe('player', () => {
    const tracks = [1, 2, 3].map((id) => ({ id, nome: `Faixa ${id}`, artista: 'Banda', foto: null, preview_url: `https://cdn.example.com/${id}.mp3` }));
    // Captures the player API after each render so tests can drive it.
    const captured = { value: null };
    const controls = () => captured.value;

    const Probe = () => {
        const value = usePlayer();

        useEffect(() => {
            captured.value = value;
        });

        return <Player />;
    };

    const mount = () => render(<PlayerProvider><Probe /></PlayerProvider>);

    beforeEach(() => {
        HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue();
        HTMLMediaElement.prototype.pause = vi.fn();
    });

    it('starts empty with controls disabled', () => {
        mount();

        expect(screen.getByText('Selecione um disco')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Tocar' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Próxima faixa' })).toBeDisabled();
    });

    it('refuses records without a preview', () => {
        mount();

        let started;
        act(() => { started = controls().play({ id: 9, nome: 'Mudo', artista: 'X', preview_url: null }); });

        expect(started).toBe(false);
        expect(screen.getByText('Selecione um disco')).toBeInTheDocument();
    });

    it('plays a track, shows it and walks through the queue', async () => {
        mount();

        act(() => { controls().play(tracks[0], tracks); });

        await waitFor(() => expect(screen.getByText('Faixa 1')).toBeInTheDocument());
        expect(document.querySelector('audio').getAttribute('src')).toBe('https://cdn.example.com/1.mp3');
        expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
        expect(screen.getByRole('button', { name: 'Próxima faixa' })).toBeEnabled();

        await userEvent.click(screen.getByRole('button', { name: 'Próxima faixa' }));
        await waitFor(() => expect(screen.getByText('Faixa 2')).toBeInTheDocument());

        await userEvent.click(screen.getByRole('button', { name: 'Faixa anterior' }));
        await waitFor(() => expect(screen.getByText('Faixa 1')).toBeInTheDocument());
    });

    it('moves to the next track when one ends, and stops after the last', async () => {
        mount();
        act(() => { controls().play(tracks[1], tracks); });
        await waitFor(() => expect(screen.getByText('Faixa 2')).toBeInTheDocument());

        act(() => { document.querySelector('audio').dispatchEvent(new Event('ended')); });
        await waitFor(() => expect(screen.getByText('Faixa 3')).toBeInTheDocument());

        act(() => { document.querySelector('audio').dispatchEvent(new Event('ended')); });
        expect(screen.getByText('Faixa 3')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Próxima faixa' })).toBeDisabled();
    });

    it('reports playback errors in the player', async () => {
        HTMLMediaElement.prototype.play = vi.fn().mockRejectedValue(new Error('NotSupportedError'));
        mount();

        act(() => { controls().play(tracks[0], tracks); });

        expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível tocar este preview.');
    });

    it('persists the volume', async () => {
        mount();

        act(() => controls().setVolume(0.3));

        expect(localStorage.getItem('@VinylVault:volume')).toBe('0.3');
        expect(screen.getByLabelText('Volume')).toHaveValue('30');
    });
});
