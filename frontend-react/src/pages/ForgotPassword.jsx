import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../components/FormField';
import api, { errorMessage } from '../lib/api';

export default function ForgotPassword() {
    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        try {
            const { data } = await api.post('/auth/forgot-password', { email });
            setMessage(data.message);
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível enviar o e-mail agora.'));
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout
            footer={
                <p>
                    <Link to="/login">Voltar para o login</Link>
                </p>
            }
        >
            <h1 className="auth-title">Recuperar senha</h1>

            {message ? (
                <p className="form-success" role="status">
                    {message}
                </p>
            ) : (
                <form className="auth-form" onSubmit={handleSubmit}>
                    <p className="auth-hint">Informe o e-mail da sua conta e enviaremos um link para criar uma nova senha.</p>
                    <FormField label="E-mail" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />

                    {error && (
                        <p className="form-error" role="alert">
                            {error}
                        </p>
                    )}

                    <button type="submit" className="auth-btn" disabled={submitting}>
                        {submitting ? 'Enviando...' : 'Enviar link'}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}
