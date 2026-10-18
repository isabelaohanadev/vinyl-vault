import { useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { Modal } from './Modal';

const MAX_CAPTION = 2200;

export const NewPostModal = ({ onClose, onCreated }) => {
    const [foto, setFoto] = useState('');
    const [legenda, setLegenda] = useState('');
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!foto.trim() && !legenda.trim()) {
            setError('Envie uma foto ou escreva uma legenda.');
            return;
        }

        setSaving(true);

        try {
            const { data } = await api.post('/posts', { foto, legenda });
            onCreated(data.post);
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível publicar.'));
            setSaving(false);
        }
    };

    return (
        <Modal title="Nova publicação" onClose={onClose}>
            <form onSubmit={handleSubmit} className="form-grid">
                <div className="input-group full-width">
                    <label htmlFor="post-foto" className="input-label">URL da foto (opcional)</label>
                    <input id="post-foto" type="url" className="input-field" placeholder="https://..." value={foto} onChange={(e) => setFoto(e.target.value)} />
                </div>

                <div className="input-group full-width">
                    <label htmlFor="post-legenda" className="input-label">Legenda</label>
                    <textarea
                        id="post-legenda"
                        className="input-field"
                        rows={4}
                        maxLength={MAX_CAPTION}
                        placeholder="Conte sobre o disco... use #hashtags para ser encontrado"
                        value={legenda}
                        onChange={(e) => setLegenda(e.target.value)}
                    />
                    <small className="form-field-hint">{legenda.length}/{MAX_CAPTION}</small>
                </div>

                {error && <p className="modal-error full-width" role="alert">{error}</p>}

                <div className="full-width">
                    <button type="submit" className="btn-submit" disabled={saving}>
                        {saving ? 'Publicando...' : 'Publicar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
