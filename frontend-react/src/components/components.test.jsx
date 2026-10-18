import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import { renderApp } from '../test/utils';
import { Modal } from './Modal';
import { PrivateRoute } from './PrivateRoute';
import { PublicOnlyRoute } from './PublicOnlyRoute';
import { StarRating } from './StarRating';
import { VinylCard } from './VinylCard';
import { Avatar } from './Avatar';
import { CoverImage, DEFAULT_COVER } from './CoverImage';
import { fireEvent } from '@testing-library/react';

const routes = (guard) => (
    <Routes>
        <Route path="/login" element={<p>login page</p>} />
        <Route path="/dashboard" element={<p>dashboard page</p>} />
        <Route path="/secret" element={guard(<p>secret page</p>)} />
    </Routes>
);

describe('route guards', () => {
    it('PrivateRoute sends guests to /login', () => {
        renderApp(routes((page) => <PrivateRoute>{page}</PrivateRoute>), { route: '/secret', auth: { signed: false, user: null } });

        expect(screen.getByText('login page')).toBeInTheDocument();
    });

    it('PrivateRoute shows a loader while the session is checked, then the page', () => {
        const { unmount } = renderApp(routes((page) => <PrivateRoute>{page}</PrivateRoute>), { route: '/secret', auth: { loading: true } });
        expect(screen.getByRole('status')).toHaveTextContent(/Carregando/);
        expect(screen.queryByText('secret page')).not.toBeInTheDocument();
        unmount();

        renderApp(routes((page) => <PrivateRoute>{page}</PrivateRoute>), { route: '/secret' });
        expect(screen.getByText('secret page')).toBeInTheDocument();
    });

    it('PublicOnlyRoute sends signed-in users to the app', () => {
        renderApp(routes((page) => <PublicOnlyRoute>{page}</PublicOnlyRoute>), { route: '/secret' });

        expect(screen.getByText('dashboard page')).toBeInTheDocument();
    });
});

describe('Modal', () => {
    it('is an accessible dialog labelled by its title', () => {
        renderApp(<Modal title="Meu modal" onClose={() => {}}><p>conteúdo</p></Modal>);

        const dialog = screen.getByRole('dialog', { name: 'Meu modal' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        expect(dialog).toHaveFocus();
    });

    it('closes with Escape, the close button and a click on the backdrop, but not on a click inside', async () => {
        const onClose = vi.fn();
        const user = userEvent.setup();
        renderApp(<Modal title="T" onClose={onClose}><p>dentro</p></Modal>);

        await user.click(screen.getByText('dentro'));
        expect(onClose).not.toHaveBeenCalled();

        await user.keyboard('{Escape}');
        await user.click(screen.getByRole('button', { name: 'Fechar' }));
        fireEvent.mouseDown(screen.getByRole('dialog').parentElement);

        expect(onClose).toHaveBeenCalledTimes(3);
    });

    it('locks page scroll while open and restores focus on close', () => {
        const trigger = document.createElement('button');
        document.body.appendChild(trigger);
        trigger.focus();

        const { unmount } = renderApp(<Modal title="T" onClose={() => {}}>x</Modal>);
        expect(document.body.style.overflow).toBe('hidden');

        unmount();
        expect(document.body.style.overflow).toBe('');
        expect(trigger).toHaveFocus();
        trigger.remove();
    });
});

describe('VinylCard', () => {
    const vinil = { id: 1, nome: 'Abbey Road', artista: 'The Beatles', foto: null, negociavel: true, adquirido: true };

    it('is operable by keyboard and mouse and describes itself', async () => {
        const onClick = vi.fn();
        const user = userEvent.setup();
        renderApp(<VinylCard vinil={vinil} onClick={onClick} />);

        const card = screen.getByRole('button', { name: 'Abbey Road, de The Beatles' });
        await user.click(card);
        card.focus();
        await user.keyboard('{Enter}');
        await user.keyboard(' ');

        expect(onClick).toHaveBeenCalledTimes(3);
    });

    it('flags tradable and wishlist records', () => {
        const { rerender } = renderApp(<VinylCard vinil={vinil} onClick={() => {}} />);
        expect(screen.getByText('Troca')).toBeInTheDocument();
        expect(screen.queryByText('Quero')).not.toBeInTheDocument();

        rerender(<VinylCard vinil={{ ...vinil, negociavel: false, adquirido: false }} onClick={() => {}} />);
        expect(screen.getByText('Quero')).toBeInTheDocument();
    });
});

describe('images', () => {
    it('CoverImage falls back to the default cover when missing or broken', () => {
        const { container, rerender } = renderApp(<CoverImage src={null} alt="" />);
        expect(container.querySelector('img')).toHaveAttribute('src', DEFAULT_COVER);

        rerender(<CoverImage src="https://x/broken.png" alt="" />);
        const img = container.querySelector('img');
        expect(img).toHaveAttribute('src', 'https://x/broken.png');
        fireEvent.error(img);
        expect(img).toHaveAttribute('src', DEFAULT_COVER);
    });

    it('Avatar shows the initial when there is no photo or the photo breaks', () => {
        const { container } = renderApp(<Avatar src="https://x/me.png" name="ana" className="a" />);
        fireEvent.error(container.querySelector('img'));

        expect(screen.getByText('A')).toBeInTheDocument();
    });
});

describe('StarRating', () => {
    it('is a read-only image with a spoken value when there is no onChange', () => {
        renderApp(<StarRating value={3} />);

        expect(screen.getByRole('img', { name: 'Nota: 3 de 5' })).toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(0);
    });

    it('lets the user pick a rating and clear it by clicking the same star again', async () => {
        const onChange = vi.fn();
        const user = userEvent.setup();
        renderApp(<StarRating value={4} onChange={onChange} />);
        const group = screen.getByRole('group', { name: 'Nota' });

        await user.click(within(group).getByRole('button', { name: '2 estrelas' }));
        await user.click(within(group).getByRole('button', { name: '4 estrelas' }));

        expect(onChange).toHaveBeenNthCalledWith(1, 2);
        expect(onChange).toHaveBeenNthCalledWith(2, 0);
    });
});
