import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import api from '../lib/api';
import { renderApp } from '../test/utils';
import ForgotPassword from './ForgotPassword';
import Login from './Login';
import Register from './Register';
import ResetPassword from './ResetPassword';

vi.mock('../lib/api', async (importOriginal) => ({
    ...(await importOriginal()),
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

const guest = { signed: false, user: null };

describe('Login', () => {
    it('requires both fields before calling the API', async () => {
        const user = userEvent.setup();
        const { authValue } = renderApp(<Login />, { auth: guest });

        await user.click(screen.getByRole('button', { name: 'Entrar' }));

        expect(screen.getByRole('alert')).toHaveTextContent('Preencha todos os campos.');
        expect(authValue.login).not.toHaveBeenCalled();
    });

    it('signs in with e-mail or username and goes to the dashboard', async () => {
        const user = userEvent.setup();
        const { authValue } = renderApp(
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/dashboard" element={<p>dashboard page</p>} />
            </Routes>,
            { route: '/login', auth: { ...guest, login: vi.fn().mockResolvedValue() } }
        );

        await user.type(screen.getByLabelText('E-mail ou usuário'), '  ana.souza ');
        await user.type(screen.getByLabelText('Sua senha'), 'segredo-123');
        await user.click(screen.getByRole('button', { name: 'Entrar' }));

        expect(authValue.login).toHaveBeenCalledWith('ana.souza', 'segredo-123');
        expect(await screen.findByText('dashboard page')).toBeInTheDocument();
    });

    it('shows the API error and lets the user try again', async () => {
        const user = userEvent.setup();
        const login = vi.fn().mockRejectedValue({ response: { data: { error: 'Credenciais inválidas.' } } });
        renderApp(<Login />, { auth: { ...guest, login } });

        await user.type(screen.getByLabelText('E-mail ou usuário'), 'ana');
        await user.type(screen.getByLabelText('Sua senha'), 'errada');
        await user.click(screen.getByRole('button', { name: 'Entrar' }));

        expect(await screen.findByRole('alert')).toHaveTextContent('Credenciais inválidas.');
        expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled();
    });

    it('links to sign-up and recovery', () => {
        renderApp(<Login />, { auth: guest });

        expect(screen.getByRole('link', { name: 'Criar conta' })).toHaveAttribute('href', '/register');
        expect(screen.getByRole('link', { name: 'Recuperar' })).toHaveAttribute('href', '/forgot-password');
    });
});

describe('Register', () => {
    const fill = async (user, { senha = 'senha-forte-123', confirmar = 'senha-forte-123' } = {}) => {
        await user.type(screen.getByLabelText('Nome completo'), 'Eva Teste');
        await user.type(screen.getByLabelText('Nome de usuário'), 'eva.teste');
        await user.type(screen.getByLabelText('E-mail', { exact: true }), 'eva@example.com');
        await user.type(screen.getByLabelText('Senha', { exact: true }), senha);
        await user.type(screen.getByLabelText('Confirmar senha'), confirmar);
        await user.click(screen.getByRole('button', { name: 'Criar conta' }));
    };

    it('does not submit when the passwords differ', async () => {
        const user = userEvent.setup();
        const { authValue } = renderApp(<Register />, { auth: guest });

        await fill(user, { confirmar: 'outra-coisa-123' });

        expect(screen.getByRole('alert')).toHaveTextContent('As senhas não conferem.');
        expect(authValue.register).not.toHaveBeenCalled();
    });

    it('sends the form without the confirmation field and without an empty birth date', async () => {
        const user = userEvent.setup();
        const { authValue } = renderApp(<Register />, { auth: { ...guest, register: vi.fn().mockResolvedValue() } });

        await fill(user);

        await waitFor(() => expect(authValue.register).toHaveBeenCalled());
        const payload = authValue.register.mock.calls[0][0];
        expect(payload).toEqual({
            nome_completo: 'Eva Teste',
            username: 'eva.teste',
            email: 'eva@example.com',
            senha: 'senha-forte-123',
            data_nascimento: undefined
        });
        expect(payload).not.toHaveProperty('confirmar');
    });

    it('shows every validation message returned by the API', async () => {
        const user = userEvent.setup();
        const register = vi.fn().mockRejectedValue({ response: { data: { error: 'Dados inválidos.', details: [{ mensagem: 'E-mail inválido.' }, { mensagem: 'Senha curta.' }] } } });
        renderApp(<Register />, { auth: { ...guest, register } });

        await fill(user);

        expect(await screen.findByRole('alert')).toHaveTextContent('E-mail inválido. Senha curta.');
    });
});

describe('ForgotPassword', () => {
    it('shows the neutral confirmation from the API', async () => {
        api.post.mockResolvedValue({ data: { message: 'Se este e-mail estiver cadastrado, enviaremos um link.' } });
        const user = userEvent.setup();
        renderApp(<ForgotPassword />, { auth: guest });

        await user.type(screen.getByLabelText('E-mail'), 'ana@example.com');
        await user.click(screen.getByRole('button', { name: 'Enviar link' }));

        expect(api.post).toHaveBeenCalledWith('/auth/forgot-password', { email: 'ana@example.com' });
        expect(await screen.findByRole('status')).toHaveTextContent('Se este e-mail estiver cadastrado');
    });
});

describe('ResetPassword', () => {
    it('warns about a link without a token', () => {
        renderApp(<ResetPassword />, { route: '/reset-password', auth: guest });

        expect(screen.getByRole('alert')).toHaveTextContent(/Link inválido/);
    });

    it('sends the token from the URL with the new password', async () => {
        api.post.mockResolvedValue({ data: {} });
        const user = userEvent.setup();
        renderApp(<ResetPassword />, { route: '/reset-password?token=abc123', auth: guest });

        await user.type(screen.getByLabelText('Nova senha', { exact: true }), 'nova-senha-123');
        await user.type(screen.getByLabelText('Confirmar nova senha'), 'nova-senha-123');
        await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

        expect(api.post).toHaveBeenCalledWith('/auth/reset-password', { token: 'abc123', novaSenha: 'nova-senha-123' });
        expect(await screen.findByRole('status')).toHaveTextContent('Senha redefinida');
    });

    it('does not call the API when the confirmation differs', async () => {
        const user = userEvent.setup();
        renderApp(<ResetPassword />, { route: '/reset-password?token=abc123', auth: guest });

        await user.type(screen.getByLabelText('Nova senha', { exact: true }), 'nova-senha-123');
        await user.type(screen.getByLabelText('Confirmar nova senha'), 'diferente-123');
        await user.click(screen.getByRole('button', { name: 'Redefinir senha' }));

        expect(screen.getByRole('alert')).toHaveTextContent('As senhas não conferem.');
        expect(api.post).not.toHaveBeenCalled();
    });
});
