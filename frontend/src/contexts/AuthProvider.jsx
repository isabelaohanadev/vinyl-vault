import { useCallback, useEffect, useMemo, useState } from 'react';
import api, { session, setSessionExpiredHandler } from '../lib/api';
import { AuthContext } from './auth';

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => (session.getToken() ? session.getUser() : null));
    // While a stored session is being checked against the API, show a loader instead of flashing /login.
    const [loading, setLoading] = useState(() => Boolean(session.getToken()));

    const logout = useCallback(() => {
        session.clear();
        setUser(null);
    }, []);

    useEffect(() => {
        setSessionExpiredHandler(logout);
        return () => setSessionExpiredHandler(() => {});
    }, [logout]);

    useEffect(() => {
        if (!session.getToken()) {
            return undefined;
        }

        let cancelled = false;

        // Refreshes the cached profile. A 401 is handled by the interceptor (logout);
        // a network failure keeps the cached session so the app still opens offline.
        api.get('/auth/me')
            .then(({ data }) => {
                if (!cancelled) {
                    session.saveUser(data.usuario);
                    setUser(data.usuario);
                }
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const authenticate = useCallback((token, usuario) => {
        session.save(token, usuario);
        setUser(usuario);
    }, []);

    const login = useCallback(
        async (identifier, senha) => {
            const { data } = await api.post('/auth/login', { login: identifier, senha });
            authenticate(data.token, data.usuario);
        },
        [authenticate]
    );

    const register = useCallback(
        async (payload) => {
            const { data } = await api.post('/auth/register', payload);
            authenticate(data.token, data.usuario);
        },
        [authenticate]
    );

    // Keeps the cached profile in sync after the user edits it.
    const updateUser = useCallback((usuario) => {
        session.saveUser(usuario);
        setUser(usuario);
    }, []);

    const value = useMemo(
        () => ({ signed: Boolean(user), user, loading, login, register, logout, updateUser }),
        [user, loading, login, register, logout, updateUser]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
