import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export const PrivateRoute = ({ children }) => {
    const { signed, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', backgroundColor: 'var(--primary-color)', color: 'white' }}>
                <h2>Carregando o cofre...</h2>
            </div>
        );
    }

    if (!signed) {
        return <Navigate to="/login" />;
    }

    return children;
};