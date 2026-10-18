import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { AuthContext } from '../contexts/auth';
import { PlayerContext } from '../contexts/player';

export const makeUser = (overrides = {}) => ({
    id: 1,
    username: 'ana',
    nome_completo: 'Ana Souza',
    email: 'ana@example.com',
    bio: null,
    foto_perfil: null,
    ...overrides
});

// Renders inside a router plus fake auth/player contexts, so components can be tested without the providers' side effects.
export const renderApp = (ui, { route = '/', auth = {}, player = {} } = {}) => {
    const authValue = {
        signed: true,
        user: makeUser(),
        loading: false,
        login: vi.fn(),
        register: vi.fn(),
        logout: vi.fn(),
        updateUser: vi.fn(),
        ...auth
    };

    const playerValue = {
        track: null,
        playing: false,
        progress: 0,
        volume: 0.8,
        error: '',
        hasNext: false,
        play: vi.fn(),
        toggle: vi.fn(),
        next: vi.fn(),
        previous: vi.fn(),
        seek: vi.fn(),
        setVolume: vi.fn(),
        ...player
    };

    return {
        authValue,
        playerValue,
        ...render(
            <AuthContext.Provider value={authValue}>
                <PlayerContext.Provider value={playerValue}>
                    <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
                </PlayerContext.Provider>
            </AuthContext.Provider>
        )
    };
};
