import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { FullScreenLoader } from './FullScreenLoader';

export const PrivateRoute = ({ children }) => {
    const { signed, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        return <FullScreenLoader />;
    }

    if (!signed) {
        return <Navigate to="/login" replace state={{ from: location }} />;
    }

    return children;
};
