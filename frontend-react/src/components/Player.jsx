import { usePlayer } from '../hooks/usePlayer';
import { CoverImage } from './CoverImage';

export const Player = () => {
    const { track, playing, progress, volume, error, hasNext, toggle, next, previous, seek, setVolume } = usePlayer();

    const handleSeek = (event) => {
        const bounds = event.currentTarget.getBoundingClientRect();
        seek((event.clientX - bounds.left) / bounds.width);
    };

    const handleSeekKey = (event) => {
        if (event.key === 'ArrowRight') seek(progress + 0.05);
        if (event.key === 'ArrowLeft') seek(progress - 0.05);
    };

    return (
        <div className="global-player" role="region" aria-label="Player de áudio">
            <div className="player-info">
                <CoverImage src={track?.foto} alt={track ? `Capa de ${track.nome}` : ''} className="player-cover" />
                <div className="player-track-details">
                    <span className="player-title">{track ? track.nome : 'Selecione um disco'}</span>
                    <span className="player-artist" role={error ? 'alert' : undefined}>
                        {error || (track ? track.artista : 'Para ouvir o preview')}
                    </span>
                </div>
            </div>

            <div className="player-controls">
                <div className="player-buttons">
                    <button type="button" className="btn-player" onClick={previous} disabled={!track} aria-label="Faixa anterior">
                        <i className="fas fa-step-backward" aria-hidden="true"></i>
                    </button>
                    <button type="button" className="btn-play-pause" onClick={toggle} disabled={!track} aria-label={playing ? 'Pausar' : 'Tocar'}>
                        <i className={`fas ${playing ? 'fa-pause' : 'fa-play'}`} aria-hidden="true"></i>
                    </button>
                    <button type="button" className="btn-player" onClick={next} disabled={!hasNext} aria-label="Próxima faixa">
                        <i className="fas fa-step-forward" aria-hidden="true"></i>
                    </button>
                </div>
                <div
                    className="player-progress"
                    role="slider"
                    tabIndex={track ? 0 : -1}
                    aria-label="Progresso"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(progress * 100)}
                    onClick={handleSeek}
                    onKeyDown={handleSeekKey}
                >
                    <div className="player-progress-bar" style={{ width: `${progress * 100}%` }}></div>
                </div>
            </div>

            <div className="player-volume">
                <i className="fas fa-volume-up" aria-hidden="true"></i>
                <input
                    type="range"
                    className="volume-slider"
                    min="0"
                    max="100"
                    value={Math.round(volume * 100)}
                    aria-label="Volume"
                    onChange={(event) => setVolume(Number(event.target.value) / 100)}
                />
            </div>
        </div>
    );
};
