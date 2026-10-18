import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import api, { errorMessage } from '../lib/api';
import { Modal } from './Modal';

export const EditProfileModal = ({ onClose }) => {
    const { user, updateUser, logout } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        nome_completo: user.nome_completo ?? '',
        bio: user.bio ?? '',
        foto_perfil: user.foto_perfil ?? '',
        senha_atual: '',
        senha: ''
    });
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const handleChange = (e) => setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        const { senha_atual, senha, ...profile } = form;
        const payload = { ...profile };

        if (senha) {
            payload.senha = senha;
            payload.senha_atual = senha_atual;
        }

        setSaving(true);

        try {
            const { data } = await api.put(`/usuarios/${user.id}`, payload);
            updateUser(data.usuario);
            onClose();
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível salvar o perfil.'));
            setSaving(false);
        }
    };

    const handleDeleteAccount = async () => {
        setError('');
        setDeleting(true);

        try {
            await api.delete(`/usuarios/${user.id}`);
            logout();
            navigate('/login', { replace: true });
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível excluir a conta.'));
            setDeleting(false);
        }
    };

    return (
        <Modal title="Editar perfil" onClose={onClose}>
            <form onSubmit={handleSubmit} className="form-grid">
                <div className="input-group full-width">
                    <label htmlFor="profile-nome" className="input-label">Nome completo</label>
                    <input id="profile-nome" name="nome_completo" className="input-field" required minLength={2} maxLength={150} value={form.nome_completo} onChange={handleChange} />
                </div>

                <div className="input-group full-width">
                    <label htmlFor="profile-foto" className="input-label">URL da foto de perfil</label>
                    <input id="profile-foto" type="url" name="foto_perfil" className="input-field" placeholder="https://..." value={form.foto_perfil} onChange={handleChange} />
                </div>

                <div className="input-group full-width">
                    <label htmlFor="profile-bio" className="input-label">Biografia</label>
                    <textarea id="profile-bio" name="bio" className="input-field" rows={3} maxLength={500} value={form.bio} onChange={handleChange} />
                    <small className="form-field-hint">{form.bio.length}/500</small>
                </div>

                <details className="full-width">
                    <summary className="input-label" style={{ cursor: 'pointer' }}>Alterar senha</summary>
                    <div className="form-grid" style={{ marginTop: '15px' }}>
                        <div className="input-group">
                            <label htmlFor="profile-senha-atual" className="input-label">Senha atual</label>
                            <input id="profile-senha-atual" type="password" name="senha_atual" autoComplete="current-password" className="input-field" value={form.senha_atual} onChange={handleChange} />
                        </div>
                        <div className="input-group">
                            <label htmlFor="profile-senha" className="input-label">Nova senha</label>
                            <input id="profile-senha" type="password" name="senha" autoComplete="new-password" minLength={8} className="input-field" value={form.senha} onChange={handleChange} />
                        </div>
                    </div>
                </details>

                {error && <p className="modal-error full-width" role="alert">{error}</p>}

                <div className="full-width">
                    <button type="submit" className="btn-submit" disabled={saving || deleting}>
                        {saving ? 'Salvando...' : 'Salvar alterações'}
                    </button>
                </div>
            </form>

            <section className="danger-zone">
                <h3>Excluir conta</h3>
                {confirmingDelete ? (
                    <>
                        <p>Isso apaga definitivamente seu perfil, acervo, publicações, seguidores e mensagens. Não há como desfazer.</p>
                        <div className="vinyl-action-bar">
                            <button type="button" className="btn-action btn-secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                                Cancelar
                            </button>
                            <button type="button" className="btn-action btn-danger" onClick={handleDeleteAccount} disabled={deleting}>
                                {deleting ? 'Excluindo...' : 'Sim, excluir minha conta'}
                            </button>
                        </div>
                    </>
                ) : (
                    <button type="button" className="btn-action btn-secondary" onClick={() => setConfirmingDelete(true)}>
                        Excluir minha conta
                    </button>
                )}
            </section>
        </Modal>
    );
};
