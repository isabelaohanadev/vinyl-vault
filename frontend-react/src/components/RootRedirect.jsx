import { Navigate, useSearchParams } from 'react-router-dom';

// The password-recovery e-mail links to "/?token=...": send it to the reset form.
export const RootRedirect = () => {
    const [params] = useSearchParams();
    const token = params.get('token');

    return <Navigate to={token ? `/reset-password?token=${encodeURIComponent(token)}` : '/dashboard'} replace />;
};
