import { useEffect } from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api, { session } from '../lib/api';
import { useAuth } from '../hooks/useAuth';
import { AuthProvider } from './AuthProvider';

vi.mock('../lib/api', async (importOriginal) => ({
    ...(await importOriginal()),
    default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() }
}));

const ana = { id: 1, username: 'ana', nome_completo: 'Ana' };

// Captures the context value after each render so tests can call login/logout and read the user.
const captured = { value: null };
const auth = () => captured.value;

const Probe = () => {
    const value = useAuth();

    useEffect(() => {
        captured.value = value;
    });

    return <p>{value.loading ? 'loading' : value.signed ? `signed:${value.user.username}` : 'guest'}</p>;
};

const mount = () =>
    render(
        <AuthProvider>
            <Probe />
        </AuthProvider>
    );

describe('AuthProvider', () => {
    beforeEach(() => {
        api.get.mockReset();
        api.post.mockReset();
    });

    it('starts as a guest without a stored session', () => {
        mount();

        expect(screen.getByText('guest')).toBeInTheDocument();
        expect(api.get).not.toHaveBeenCalled();
    });

    it('logs in with { login, senha }, stores the session and exposes the user', async () => {
        api.post.mockResolvedValue({ data: { token: 'jwt-123', usuario: ana } });
        mount();

        await act(() => auth().login('ana', 'segredo-123'));

        expect(api.post).toHaveBeenCalledWith('/auth/login', { login: 'ana', senha: 'segredo-123' });
        expect(screen.getByText('signed:ana')).toBeInTheDocument();
        expect(session.getToken()).toBe('jwt-123');
        expect(session.getUser()).toEqual(ana);
    });

    it('keeps the user a guest when login fails', async () => {
        api.post.mockRejectedValue(new Error('401'));
        mount();

        await expect(act(() => auth().login('ana', 'errada'))).rejects.toThrow();

        expect(screen.getByText('guest')).toBeInTheDocument();
        expect(session.getToken()).toBeNull();
    });

    it('registers and signs the new user in', async () => {
        api.post.mockResolvedValue({ data: { token: 'jwt-new', usuario: ana } });
        mount();

        await act(() => auth().register({ username: 'ana' }));

        expect(api.post).toHaveBeenCalledWith('/auth/register', { username: 'ana' });
        expect(screen.getByText('signed:ana')).toBeInTheDocument();
    });

    it('logs out and forgets everything', async () => {
        api.post.mockResolvedValue({ data: { token: 'jwt-123', usuario: ana } });
        mount();
        await act(() => auth().login('ana', 'segredo-123'));

        act(() => auth().logout());

        expect(screen.getByText('guest')).toBeInTheDocument();
        expect(session.getToken()).toBeNull();
        expect(session.getUser()).toBeNull();
    });

    it('restores a stored session and refreshes the profile from /auth/me', async () => {
        session.save('jwt-123', { ...ana, bio: 'old' });
        api.get.mockResolvedValue({ data: { usuario: { ...ana, bio: 'fresh' } } });

        mount();
        expect(screen.getByText('loading')).toBeInTheDocument();

        await waitFor(() => expect(screen.getByText('signed:ana')).toBeInTheDocument());
        expect(api.get).toHaveBeenCalledWith('/auth/me');
        expect(auth().user.bio).toBe('fresh');
        expect(session.getUser().bio).toBe('fresh');
    });

    it('keeps the cached session when the API is unreachable (offline start)', async () => {
        session.save('jwt-123', ana);
        api.get.mockRejectedValue(new Error('Network Error'));

        mount();

        await waitFor(() => expect(screen.getByText('signed:ana')).toBeInTheDocument());
    });

    it('updateUser refreshes the cached profile', async () => {
        session.save('jwt-123', ana);
        api.get.mockResolvedValue({ data: { usuario: ana } });
        mount();
        await waitFor(() => expect(screen.getByText('signed:ana')).toBeInTheDocument());

        act(() => auth().updateUser({ ...ana, bio: 'nova bio' }));

        expect(auth().user.bio).toBe('nova bio');
        expect(session.getUser().bio).toBe('nova bio');
    });

    it('useAuth refuses to run outside the provider', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => render(<Probe />)).toThrow(/AuthProvider/);

        spy.mockRestore();
    });
});
