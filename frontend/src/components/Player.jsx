import { useState } from 'react';

export const Player = () => {
    const [isPlaying, setIsPlaying] = useState(false);

    return (
        <div className="global-player">
            <div className="player-info">
                <img src="/assets/default-cover.svg" alt="Capa" className="player-cover" />
                <div className="player-track-details">
                    <span className="player-title">Selecione um disco</span>
                    <span className="player-artist">Para ouvir o preview</span>
                </div>
            </div>

            <div className="player-controls">
                <div className="player-buttons">
                    <button className="btn-player">
                        <i className="fas fa-step-backward"></i>
                    </button>
                    <button 
                        className="btn-play-pause" 
                        onClick={() => setIsPlaying(!isPlaying)}
                    >
                        <i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i>
                    </button>
                    <button className="btn-player">
                        <i className="fas fa-step-forward"></i>
                    </button>
                </div>
                <div className="player-progress">
                    <div className="player-progress-bar" style={{ width: '30%' }}></div>
                </div>
            </div>

            <div className="player-volume">
                <i className="fas fa-volume-up"></i>
                <input type="range" className="volume-slider" min="0" max="100" />
            </div>
        </div>
    );
};