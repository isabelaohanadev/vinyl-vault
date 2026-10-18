import { Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FullScreenLoader } from './FullScreenLoader';

// Login / sign-up pages: a signed-in user is sent to the app instead.
export const PublicOnlyRoute = ({ children }) => {
    const { signed, loading } = useAuth();

    if (loading) {
        return <FullScreenLoader />;
    }

    return signed ? <Navigate to="/dashboard" replace /> : children;
};
