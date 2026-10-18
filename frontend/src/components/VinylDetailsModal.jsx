import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorMessage } from '../lib/api';
import { cssUrl } from '../lib/cssUrl';
import { usePlayer } from '../hooks/usePlayer';
import { DEFAULT_COVER, CoverImage } from './CoverImage';
import { Modal } from './Modal';
import { StarRating } from './StarRating';

// `onEdit` / `onDeleted` are only offered for the owner's own records; without them
// (the classifieds) the modal is read-only and shows who owns the record.
export const VinylDetailsModal = ({ vinil, playlist = [], onClose, onEdit, onDeleted }) => {
    const { play, toggle, track, playing } = usePlayer();
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [error, setError] = useState('');

    const isCurrent = track?.id === vinil.id;
    const hasPreview = Boolean(vinil.preview_url);

    const handlePlay = () => {
        if (isCurrent) {
            toggle();
        } else {
            play(vinil, playlist);
        }
    };

    const handleDelete = async () => {
        setError('');
        setDeleting(true);

        try {
            await api.delete(`/vinis/${vinil.id}`);
            onDeleted(vinil);
        } catch (err) {
            setError(errorMessage(err, 'Não foi possível excluir o disco.'));
            setDeleting(false);
        }
    };

    return (
        <Modal title="Detalhes do Disco" onClose={onClose} maxWidth="500px">
            <div className="vinyl-detail-container">
                <div className="vinyl-visuals">
                    <div className="vinyl-record">
                        <div className="vinyl-label-center" style={{ backgroundImage: cssUrl(vinil.foto || DEFAULT_COVER) }}>
                            <div className="vinyl-hole"></div>
                        </div>
                    </div>
                    <CoverImage src={vinil.foto} alt={`Capa de ${vinil.nome}`} className="vinyl-sleeve" />
                </div>

                <div className="vinyl-meta">
                    <h3 className="vinyl-meta-title">{vinil.nome}</h3>
                    <p className="vinyl-meta-artist">{vinil.artista}</p>

                    <div className="vinyl-badges">
                        {vinil.ano && <span className="badge-item">Ano: {vinil.ano}</span>}
                        {vinil.genero && <span className="badge-item">Gênero: {vinil.genero}</span>}
                        {vinil.estado_capa && <span className="badge-item">Capa: {vinil.estado_capa}</span>}
                        {vinil.estado_disco && <span className="badge-item">Mídia: {vinil.estado_disco}</span>}
                        {!vinil.adquirido && <span className="badge-item">Lista de desejos</span>}
                        {vinil.negociavel && <span className="badge-item badge-trade">Disponível para Troca</span>}
                    </div>

                    {vinil.nota > 0 && <StarRating value={vinil.nota} label="Nota do colecionador" />}

                    {vinil.dono && (
                        <p className="vinyl-owner">
                            Colecionador: <strong>@{vinil.dono.username}</strong>
                        </p>
                    )}

                    {vinil.spotify && (
                        <a href={vinil.spotify} target="_blank" rel="noopener noreferrer" className="vinyl-link">
                            <i className="fab fa-spotify" aria-hidden="true"></i> Abrir no Spotify
                        </a>
                    )}
                </div>

                <div className="vinyl-action-bar">
                    <button
                        type="button"
                        className="btn-action btn-play"
                        onClick={handlePlay}
                        disabled={!hasPreview}
                        title={hasPreview ? undefined : 'Este disco não tem preview de áudio'}
                    >
                        <i className={`fas ${isCurrent && playing ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i>{' '}
                        {isCurrent && playing ? 'Pausar' : 'Tocar Preview'}
                    </button>

                    {onEdit && (
                        <button type="button" className="btn-action btn-secondary" onClick={() => onEdit(vinil)}>
                            <i className="fas fa-edit" aria-hidden="true"></i> Editar
                        </button>
                    )}

                    {onDeleted && !confirmingDelete && (
                        <button type="button" className="btn-action btn-secondary" onClick={() => setConfirmingDelete(true)}>
                            <i className="fas fa-trash" aria-hidden="true"></i> Excluir
                        </button>
                    )}
                </div>

                {confirmingDelete && (
                    <div className="vinyl-confirm" role="alertdialog" aria-label="Confirmar exclusão">
                        <p>
                            Excluir <strong>{vinil.nome}</strong> do seu acervo? Esta ação não pode ser desfeita.
                        </p>
                        <div className="vinyl-action-bar">
                            <button type="button" className="btn-action btn-secondary" onClick={() => setConfirmingDelete(false)} disabled={deleting}>
                                Cancelar
                            </button>
                            <button type="button" className="btn-action btn-danger" onClick={handleDelete} disabled={deleting}>
                                {deleting ? 'Excluindo...' : 'Sim, excluir'}
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <p className="modal-error" role="alert">
                        {error}
                    </p>
                )}

                {vinil.dono && (
                    <Link to={`/users/${vinil.dono.id}`} className="vinyl-link" onClick={onClose}>
                        Ver perfil de @{vinil.dono.username}
                    </Link>
                )}
            </div>
        </Modal>
    );
};
