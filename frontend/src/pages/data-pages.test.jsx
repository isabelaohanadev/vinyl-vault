import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import api from '../lib/api';
import { renderApp } from '../test/utils';
import Community from './Community';
import Dashboard from './Dashboard';
import Market from './Market';

vi.mock('../lib/api', async (importOriginal) => ({
    ...(await importOriginal()),
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

const vinyl = (id, overrides = {}) => ({
    id, nome: `Disco ${id}`, artista: `Artista ${id}`, genero: 'Rock', ano: 1970, foto: null, preview_url: null,
    adquirido: true, negociavel: false, nota: 0, estado_capa: null, estado_disco: null, spotify: null, ...overrides
});

// Routes the mocked axios calls by URL so every test states only what it needs.
const mockGet = (routes) =>
    api.get.mockImplementation(async (url) => {
        const match = Object.entries(routes).find(([path]) => url === path);
        if (!match) throw { response: { status: 404, data: { error: `unmocked ${url}` } } };
        const value = match[1];
        if (value instanceof Error) throw value;
        return { data: typeof value === 'function' ? value() : value };
    });

describe('Dashboard', () => {
    const collection = [vinyl(1, { negociavel: true }), vinyl(2, { nome: 'Kind of Blue', artista: 'Miles Davis', genero: 'Jazz' }), vinyl(3, { adquirido: false })];

    it('loads the collection of the signed-in user and splits the counters', async () => {
        mockGet({ '/usuarios/1/vinis': collection });
        renderApp(<Dashboard />);

        expect(await screen.findByRole('button', { name: /Disco 1/ })).toBeInTheDocument();
        const values = screen.getAllByText(/^\d+$/, { selector: '.stat-value' }).map((el) => el.textContent);
        expect(values).toEqual(['2', '1', '1']); // collection, tradable, wishlist
        expect(api.get).toHaveBeenCalledWith('/usuarios/1/vinis', { params: {} });
    });

    it('filters the grid by title, artist or genre', async () => {
        const user = userEvent.setup();
        mockGet({ '/usuarios/1/vinis': collection });
        renderApp(<Dashboard />);
        await screen.findByRole('button', { name: /Disco 1/ });

        await user.type(screen.getByLabelText('Buscar no acervo'), 'jazz');

        expect(screen.getAllByRole('button', { name: /de / })).toHaveLength(1);
        expect(screen.getByRole('button', { name: /Kind of Blue/ })).toBeInTheDocument();

        await user.clear(screen.getByLabelText('Buscar no acervo'));
        await user.type(screen.getByLabelText('Buscar no acervo'), 'zzz');
        expect(screen.getByText(/Nenhum disco encontrado/)).toBeInTheDocument();
    });

    it('invites the user to add the first record when the collection is empty', async () => {
        mockGet({ '/usuarios/1/vinis': [] });
        renderApp(<Dashboard />);

        expect(await screen.findByText(/acervo ainda está vazio/)).toBeInTheDocument();
        expect(screen.queryByLabelText('Buscar no acervo')).not.toBeInTheDocument();
    });

    it('shows the failure with a retry that works', async () => {
        const user = userEvent.setup();
        let calls = 0;
        api.get.mockImplementation(async () => {
            calls += 1;
            if (calls === 1) throw { response: { data: { error: 'Banco indisponível.' } } };
            return { data: collection };
        });
        renderApp(<Dashboard />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Banco indisponível.');
        await user.click(screen.getByRole('button', { name: 'Tentar novamente' }));

        expect(await screen.findByRole('button', { name: /Disco 1/ })).toBeInTheDocument();
    });

    it('adds a record through the form and reloads the list', async () => {
        const user = userEvent.setup();
        mockGet({ '/usuarios/1/vinis': [] });
        api.post.mockResolvedValue({ data: { vinil: vinyl(9) } });
        renderApp(<Dashboard />);
        await screen.findByText(/acervo ainda está vazio/);

        await user.click(screen.getAllByRole('button', { name: '+ Adicionar Vinil' })[0]);
        await user.type(screen.getByLabelText('Nome do Álbum'), 'Blue Train');
        await user.type(screen.getByLabelText('Artista / Banda'), 'John Coltrane');
        await user.click(screen.getByRole('button', { name: '4 estrelas' }));
        await user.click(screen.getByRole('button', { name: 'Salvar Vinil' }));

        await waitFor(() => expect(api.post).toHaveBeenCalled());
        const [url, body] = api.post.mock.calls[0];
        expect(url).toBe('/vinis');
        expect(body).toMatchObject({ nome: 'Blue Train', artista: 'John Coltrane', nota: 4, adquirido: true, negociavel: false });
        await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
        expect(api.get).toHaveBeenCalledTimes(2);
    });

    it('shows the API validation message inside the form instead of an alert()', async () => {
        const user = userEvent.setup();
        mockGet({ '/usuarios/1/vinis': [] });
        api.post.mockRejectedValue({ response: { data: { error: 'Dados inválidos.', details: [{ campo: 'ano', mensagem: 'Deve ser no máximo 2027.' }] } } });
        renderApp(<Dashboard />);
        await screen.findByText(/acervo ainda está vazio/);

        await user.click(screen.getAllByRole('button', { name: '+ Adicionar Vinil' })[0]);
        await user.type(screen.getByLabelText('Nome do Álbum'), 'X');
        await user.type(screen.getByLabelText('Artista / Banda'), 'Y');
        await user.click(screen.getByRole('button', { name: 'Salvar Vinil' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Deve ser no máximo 2027.');
        expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('deletes a record only after confirmation', async () => {
        const user = userEvent.setup();
        mockGet({ '/usuarios/1/vinis': collection });
        api.delete.mockResolvedValue({ data: {} });
        renderApp(<Dashboard />);

        await user.click(await screen.findByRole('button', { name: /Disco 1/ }));
        await user.click(screen.getByRole('button', { name: 'Excluir' }));
        expect(api.delete).not.toHaveBeenCalled();
        expect(screen.getByRole('alertdialog')).toHaveTextContent(/não pode ser desfeita/);

        await user.click(screen.getByRole('button', { name: 'Sim, excluir' }));

        expect(api.delete).toHaveBeenCalledWith('/vinis/1');
        await waitFor(() => expect(screen.queryByRole('button', { name: /Disco 1/ })).not.toBeInTheDocument());
    });
});

describe('Community', () => {
    const people = [
        { id: 2, nome_completo: 'Bruno Lima', username: 'bruno', bio: 'Rock', foto_perfil: null, is_seguindo: false },
        { id: 3, nome_completo: 'Carla Dias', username: 'carla', bio: null, foto_perfil: null, is_seguindo: true }
    ];

    it('lists collectors and follows / unfollows them', async () => {
        const user = userEvent.setup();
        mockGet({ '/comunidade': people });
        api.post.mockResolvedValue({ data: {} });
        api.delete.mockResolvedValue({ data: {} });
        renderApp(<Community />);

        const bruno = (await screen.findByText('Bruno Lima')).closest('.user-card');
        await user.click(within(bruno).getByRole('button', { name: 'Seguir' }));

        expect(api.post).toHaveBeenCalledWith('/usuarios/2/seguir');
        expect(await within(bruno).findByRole('button', { name: 'Seguindo' })).toHaveAttribute('aria-pressed', 'true');

        const carla = screen.getByText('Carla Dias').closest('.user-card');
        await user.click(within(carla).getByRole('button', { name: 'Seguindo' }));

        expect(api.delete).toHaveBeenCalledWith('/usuarios/3/seguir');
        expect(await within(carla).findByRole('button', { name: 'Seguir' })).toBeInTheDocument();
    });

    it('shows an error and keeps the button state when following fails', async () => {
        const user = userEvent.setup();
        mockGet({ '/comunidade': people });
        api.post.mockRejectedValue({ response: { data: { error: 'Falhou ao seguir.' } } });
        renderApp(<Community />);

        const bruno = (await screen.findByText('Bruno Lima')).closest('.user-card');
        await user.click(within(bruno).getByRole('button', { name: 'Seguir' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Falhou ao seguir.');
        expect(within(bruno).getByRole('button', { name: 'Seguir' })).toBeInTheDocument();
    });

    it('searches on the server after a short pause', async () => {
        const user = userEvent.setup();
        mockGet({ '/comunidade': people });
        renderApp(<Community />);
        await screen.findByText('Bruno Lima');

        await user.type(screen.getByLabelText('Buscar colecionadores'), 'carla');

        await waitFor(() => expect(api.get).toHaveBeenLastCalledWith('/comunidade', { params: { busca: 'carla' } }));
    });

    it('shows a retryable error instead of fake users when the API is down', async () => {
        mockGet({ '/comunidade': Object.assign(new Error('x'), { response: { data: { error: 'Fora do ar.' } } }) });
        renderApp(<Community />);

        expect(await screen.findByRole('alert')).toHaveTextContent('Fora do ar.');
        expect(screen.queryByText('Carlos Silva')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Tentar novamente' })).toBeInTheDocument();
    });
});

describe('Market', () => {
    const items = [{ ...vinyl(7, { nome: 'Rumours', artista: 'Fleetwood Mac', negociavel: true }), dono: { id: 2, nome_completo: 'Bruno Lima', username: 'bruno', foto_perfil: null } }];

    it('lists tradable records with their owner and opens a read-only detail', async () => {
        const user = userEvent.setup();
        mockGet({ '/classificados': items });
        renderApp(<Market />);

        await user.click(await screen.findByRole('button', { name: /Rumours, de Fleetwood Mac, de Bruno Lima/ }));

        const dialog = screen.getByRole('dialog');
        expect(within(dialog).getByText('@bruno')).toBeInTheDocument();
        expect(within(dialog).getByRole('link', { name: 'Ver perfil de @bruno' })).toHaveAttribute('href', '/users/2');
        expect(within(dialog).queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument();
        expect(within(dialog).queryByRole('button', { name: 'Excluir' })).not.toBeInTheDocument();
    });

    it('explains an empty result', async () => {
        mockGet({ '/classificados': [] });
        renderApp(<Market />);

        expect(await screen.findByText(/Nenhum disco disponível para troca/)).toBeInTheDocument();
    });
});
