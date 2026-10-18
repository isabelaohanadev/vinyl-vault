import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../components/FormField';
import api, { errorMessage } from '../lib/api';

export default function ResetPassword() {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [done, setDone] = useState(false);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirm) {
            setError('As senhas não conferem.');
            return;
        }

        setSubmitting(true);

        try {
            await api.post('/auth/reset-password', { token, novaSenha: password });
            setDone(true);
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível redefinir a senha.'));
        } finally {
            setSubmitting(false);
        }
    };

    let content;

    if (!token) {
        content = (
            <p className="form-error" role="alert">
                Link inválido. Peça um novo e-mail de recuperação.
            </p>
        );
    } else if (done) {
        content = (
            <p className="form-success" role="status">
                Senha redefinida! Você já pode entrar com a nova senha.
            </p>
        );
    } else {
        content = (
            <form className="auth-form" onSubmit={handleSubmit}>
                <FormField label="Nova senha" type="password" autoComplete="new-password" required minLength={8} hint="Mínimo de 8 caracteres" value={password} onChange={(e) => setPassword(e.target.value)} />
                <FormField label="Confirmar nova senha" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />

                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}

                <button type="submit" className="auth-btn" disabled={submitting}>
                    {submitting ? 'Salvando...' : 'Redefinir senha'}
                </button>
            </form>
        );
    }

    return (
        <AuthLayout
            footer={
                <p>
                    <Link to="/login">{done ? 'Ir para o login' : 'Voltar para o login'}</Link>
                </p>
            }
        >
            <h1 className="auth-title">Nova senha</h1>
            {content}
        </AuthLayout>
    );
}
