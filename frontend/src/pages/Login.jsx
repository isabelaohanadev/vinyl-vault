import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');

        if (!email || !password) {
            setError('Preencha todos os campos.');
            return;
        }

        try {
            await login(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.response?.data?.error || 'Erro ao fazer login. Verifique suas credenciais.');
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-box">
                <img src="/assets/logo.png" alt="Vinyl Vault" className="auth-logo" />
                
                <form className="auth-form" onSubmit={handleLogin}>
                    <input 
                        type="email" 
                        className="auth-input" 
                        placeholder="Seu E-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    
                    <input 
                        type="password" 
                        className="auth-input" 
                        placeholder="Sua Senha"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />

                    {error && <p style={{ color: 'var(--secondary-color)', fontSize: '0.9rem', textAlign: 'center' }}>{error}</p>}
                    
                    <button type="submit" className="auth-btn">Entrar</button>
                </form>

                <div className="auth-links">
                    <p>Esqueceu a senha? <span>Recuperar</span></p>
                    <p>Ainda não tem a chave? <span>Criar conta</span></p>
                </div>
            </div>
        </div>
    );
}