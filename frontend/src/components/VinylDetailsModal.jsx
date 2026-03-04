export const VinylDetailsModal = ({ isOpen, onClose, vinil }) => {
    if (!isOpen || !vinil) return null;

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h2 className="modal-title">Detalhes do Disco</h2>
                    <button onClick={onClose} className="btn-close">
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="vinyl-detail-container">
                    <div className="vinyl-visuals">
                        <div className="vinyl-record">
                            <div className="vinyl-label-center" style={{ backgroundImage: `url(${vinil.foto || '/assets/default-cover.jpg'})` }}>
                                <div className="vinyl-hole"></div>
                            </div>
                        </div>
                        <img 
                            src={vinil.foto || '/assets/default-cover.jpg'} 
                            alt={vinil.nome} 
                            className="vinyl-sleeve" 
                        />
                    </div>

                    <div className="vinyl-meta">
                        <h3 style={{ fontSize: '1.5rem', color: 'var(--primary-color)', marginBottom: '5px' }}>{vinil.nome}</h3>
                        <p style={{ fontSize: '1.1rem', color: 'var(--tertiary-color)', marginBottom: '15px' }}>{vinil.artista}</p>
                        
                        <div style={{ display: 'flex', justifyContent: 'center', gap: '15px', flexWrap: 'wrap', marginBottom: '20px' }}>
                            <span className="badge-item">Ano: {vinil.ano || 'N/A'}</span>
                            <span className="badge-item">Gênero: {vinil.genero || 'N/A'}</span>
                            <span className="badge-item">Capa: {vinil.estado_capa}</span>
                            <span className="badge-item">Mídia: {vinil.estado_disco}</span>
                            {vinil.negociavel && (
                                <span className="badge-item" style={{ backgroundColor: 'var(--secondary-color)', color: 'var(--text-light)' }}>
                                    Disponível para Troca
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="vinyl-action-bar">
                        <button className="btn-action btn-play">
                            <i className="fas fa-play"></i> Tocar Preview
                        </button>
                        <button className="btn-action btn-secondary">
                            <i className="fas fa-edit"></i> Editar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};