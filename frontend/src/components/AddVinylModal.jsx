import { useState } from 'react';
import api, { errorMessage } from '../lib/api';
import { Modal } from './Modal';
import { StarRating } from './StarRating';

const CONDITIONS = [
    ['M', 'Mint (M)'],
    ['NM', 'Near Mint (NM)'],
    ['VG+', 'Very Good Plus (VG+)'],
    ['VG', 'Very Good (VG)'],
    ['G', 'Good (G)'],
    ['P', 'Poor (P)']
];

const EMPTY = {
    nome: '',
    artista: '',
    ano: '',
    genero: '',
    foto: '',
    spotify: '',
    preview_url: '',
    estado_capa: '',
    estado_disco: '',
    nota: 0,
    adquirido: true,
    negociavel: false
};

const toForm = (vinil) =>
    Object.fromEntries(Object.keys(EMPTY).map((field) => [field, vinil?.[field] ?? EMPTY[field]]));

// Creates a vinyl, or edits one when `vinil` is given. Parents mount it only while open,
// so the form always starts fresh.
export const AddVinylModal = ({ vinil, onClose, onSaved }) => {
    const editing = Boolean(vinil);
    const [form, setForm] = useState(() => toForm(vinil));
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSaving(true);

        try {
            const request = editing ? api.put(`/vinis/${vinil.id}`, form) : api.post('/vinis', form);
            const { data } = await request;
            onSaved(data.vinil);
        } catch (err) {
            setError(errorMessage(err, 'Erro ao salvar o vinil. Verifique os dados.'));
            setSaving(false);
        }
    };

    return (
        <Modal title={editing ? 'Editar disco' : 'Adicionar ao Acervo'} onClose={onClose}>
            <form onSubmit={handleSubmit} className="form-grid">
                <div className="input-group full-width">
                    <label htmlFor="vinyl-nome" className="input-label">Nome do Álbum</label>
                    <input id="vinyl-nome" type="text" name="nome" value={form.nome} onChange={handleChange} className="input-field" required maxLength={255} />
                </div>

                <div className="input-group">
                    <label htmlFor="vinyl-artista" className="input-label">Artista / Banda</label>
                    <input id="vinyl-artista" type="text" name="artista" value={form.artista} onChange={handleChange} className="input-field" required maxLength={255} />
                </div>

                <div className="input-group">
                    <label htmlFor="vinyl-ano" className="input-label">Ano de Lançamento</label>
                    <input id="vinyl-ano" type="number" name="ano" value={form.ano} onChange={handleChange} className="input-field" min={1877} max={new Date().getFullYear() + 1} />
                </div>

                <div className="input-group">
                    <label htmlFor="vinyl-genero" className="input-label">Gênero Musical</label>
                    <input id="vinyl-genero" type="text" name="genero" value={form.genero} onChange={handleChange} className="input-field" maxLength={100} />
                </div>

                <div className="input-group">
                    <label htmlFor="vinyl-foto" className="input-label">URL da Capa (Imagem)</label>
                    <input id="vinyl-foto" type="url" name="foto" value={form.foto} onChange={handleChange} className="input-field" placeholder="https://..." />
                </div>

                <div className="input-group">
                    <label htmlFor="vinyl-capa" className="input-label">Estado da Capa</label>
                    <select id="vinyl-capa" name="estado_capa" value={form.estado_capa} onChange={handleChange} className="input-field">
                        <option value="">Não informado</option>
                        {CONDITIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label htmlFor="vinyl-disco" className="input-label">Estado do Disco</label>
                    <select id="vinyl-disco" name="estado_disco" value={form.estado_disco} onChange={handleChange} className="input-field">
                        <option value="">Não informado</option>
                        {CONDITIONS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                        ))}
                    </select>
                </div>

                <div className="input-group">
                    <label htmlFor="vinyl-preview" className="input-label">URL do preview (áudio)</label>
                    <input id="vinyl-preview" type="url" name="preview_url" value={form.preview_url} onChange={handleChange} className="input-field" placeholder="https://...mp3" />
                </div>

                <div className="input-group">
                    <label htmlFor="vinyl-spotify" className="input-label">Link do Spotify</label>
                    <input id="vinyl-spotify" type="url" name="spotify" value={form.spotify} onChange={handleChange} className="input-field" placeholder="https://open.spotify.com/..." />
                </div>

                <div className="input-group">
                    <label htmlFor="vinyl-status" className="input-label">Status</label>
                    <select
                        id="vinyl-status"
                        value={form.adquirido ? 'colecao' : 'desejo'}
                        onChange={(e) => setForm((prev) => ({ ...prev, adquirido: e.target.value === 'colecao' }))}
                        className="input-field"
                    >
                        <option value="colecao">Está na minha coleção</option>
                        <option value="desejo">Quero ter (lista de desejos)</option>
                    </select>
                </div>

                <div className="input-group">
                    <span className="input-label">Minha nota</span>
                    <StarRating value={Number(form.nota)} onChange={(nota) => setForm((prev) => ({ ...prev, nota }))} />
                </div>

                <div className="input-group full-width" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px', marginTop: '10px' }}>
                    <input type="checkbox" name="negociavel" checked={form.negociavel} onChange={handleChange} id="negociavel-check" style={{ width: '18px', height: '18px' }} />
                    <label htmlFor="negociavel-check" className="input-label" style={{ cursor: 'pointer' }}>
                        Disponível para troca/venda
                    </label>
                </div>

                {error && (
                    <p className="modal-error full-width" role="alert">
                        {error}
                    </p>
                )}

                <div className="full-width">
                    <button type="submit" className="btn-submit" disabled={saving}>
                        {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Salvar Vinil'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};
