import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../lib/api';

export default function Login() {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!identifier.trim() || !password) {
            setError('Preencha todos os campos.');
            return;
        }

        setSubmitting(true);

        try {
            await login(identifier.trim(), password);
            navigate(location.state?.from?.pathname || '/dashboard', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível entrar. Verifique suas credenciais.'));
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout
            footer={
                <>
                    <p>
                        Esqueceu a senha? <Link to="/forgot-password">Recuperar</Link>
                    </p>
                    <p>
                        Ainda não tem a chave? <Link to="/register">Criar conta</Link>
                    </p>
                </>
            }
        >
            <form className="auth-form" onSubmit={handleLogin} noValidate>
                <input
                    type="text"
                    className="auth-input"
                    placeholder="E-mail ou usuário"
                    aria-label="E-mail ou usuário"
                    autoComplete="username"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                />

                <input
                    type="password"
                    className="auth-input"
                    placeholder="Sua senha"
                    aria-label="Sua senha"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />

                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}

                <button type="submit" className="auth-btn" disabled={submitting}>
                    {submitting ? 'Entrando...' : 'Entrar'}
                </button>
            </form>
        </AuthLayout>
    );
}
