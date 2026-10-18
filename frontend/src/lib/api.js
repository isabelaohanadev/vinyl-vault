import axios from 'axios';

const TOKEN_KEY = '@VinylVault:token';
const USER_KEY = '@VinylVault:user';

// Same-origin "/api" works everywhere there is a reverse proxy (Vite dev server,
// the nginx image). Set VITE_API_URL to point at an API hosted elsewhere.
const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api'
});

export const session = {
    getToken: () => localStorage.getItem(TOKEN_KEY),
    getUser() {
        try {
            return JSON.parse(localStorage.getItem(USER_KEY));
        } catch {
            return null;
        }
    },
    save(token, user) {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    saveUser(user) {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    clear() {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
    }
};

let onSessionExpired = () => {};

export const setSessionExpiredHandler = (handler) => {
    onSessionExpired = handler;
};

api.interceptors.request.use((config) => {
    const token = session.getToken();

    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
});

api.interceptors.response.use(
    (response) => response,
    (error) => {
        // A 401 while holding a token means it expired or was revoked. (A wrong
        // password on /auth/login arrives without a token, so it is not affected.)
        if (error.response?.status === 401 && session.getToken()) {
            onSessionExpired();
        }

        return Promise.reject(error);
    }
);

// Turns an API/network error into a message that is safe to show to the user.
export const errorMessage = (error, fallback = 'Algo deu errado. Tente novamente.') => {
    if (!error.response) {
        return 'Não foi possível conectar ao servidor. Verifique sua conexão.';
    }

    const { error: message, details } = error.response.data ?? {};

    if (Array.isArray(details) && details.length > 0) {
        return details.map((detail) => detail.mensagem).join(' ');
    }

    return message || fallback;
};

export default api;
