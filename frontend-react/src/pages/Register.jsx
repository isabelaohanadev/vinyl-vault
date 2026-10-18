import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/AuthLayout';
import { FormField } from '../components/FormField';
import { useAuth } from '../hooks/useAuth';
import { errorMessage } from '../lib/api';

const initialForm = { nome_completo: '', username: '', email: '', data_nascimento: '', senha: '', confirmar: '' };

export default function Register() {
    const [form, setForm] = useState(initialForm);
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (form.senha !== form.confirmar) {
            setError('As senhas não conferem.');
            return;
        }

        const { confirmar: _confirmar, ...payload } = form;

        setSubmitting(true);

        try {
            await register({ ...payload, data_nascimento: payload.data_nascimento || undefined });
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível criar a conta.'));
            setSubmitting(false);
        }
    };

    return (
        <AuthLayout
            footer={
                <p>
                    Já tem uma conta? <Link to="/login">Entrar</Link>
                </p>
            }
        >
            <h1 className="auth-title">Criar conta</h1>

            <form className="auth-form" onSubmit={handleSubmit}>
                <FormField label="Nome completo" name="nome_completo" autoComplete="name" required minLength={2} maxLength={150} value={form.nome_completo} onChange={handleChange} />
                <FormField
                    label="Nome de usuário"
                    name="username"
                    autoComplete="username"
                    required
                    minLength={3}
                    maxLength={30}
                    pattern="[A-Za-z0-9_.]+"
                    hint="Letras, números, _ e ."
                    value={form.username}
                    onChange={handleChange}
                />
                <FormField label="E-mail" type="email" name="email" autoComplete="email" required value={form.email} onChange={handleChange} />
                <FormField label="Data de nascimento (opcional)" type="date" name="data_nascimento" autoComplete="bday" max={new Date().toISOString().slice(0, 10)} value={form.data_nascimento} onChange={handleChange} />
                <FormField label="Senha" type="password" name="senha" autoComplete="new-password" required minLength={8} hint="Mínimo de 8 caracteres" value={form.senha} onChange={handleChange} />
                <FormField label="Confirmar senha" type="password" name="confirmar" autoComplete="new-password" required value={form.confirmar} onChange={handleChange} />

                {error && (
                    <p className="form-error" role="alert">
                        {error}
                    </p>
                )}

                <button type="submit" className="auth-btn" disabled={submitting}>
                    {submitting ? 'Criando...' : 'Criar conta'}
                </button>
            </form>
        </AuthLayout>
    );
}
