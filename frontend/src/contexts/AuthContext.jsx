import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const storedUser = localStorage.getItem('@VinylVault:user');
        const storedToken = localStorage.getItem('@VinylVault:token');

        if (storedUser && storedToken) {
            setUser(JSON.parse(storedUser));
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
        }

        setLoading(false);
    }, []);

    const login = async (email, password) => {
        const response = await axios.post('http://localhost:3000/api/login', {
            email,
            senha: password
        });

        const { token, usuario } = response.data;

        localStorage.setItem('@VinylVault:token', token);
        localStorage.setItem('@VinylVault:user', JSON.stringify(usuario));

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        setUser(usuario);
    };

    const logout = () => {
        localStorage.removeItem('@VinylVault:token');
        localStorage.removeItem('@VinylVault:user');
        delete axios.defaults.headers.common['Authorization'];
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ signed: !!user, user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};