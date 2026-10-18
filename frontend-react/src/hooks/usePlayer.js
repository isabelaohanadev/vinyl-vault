import { useContext } from 'react';
import { PlayerContext } from '../contexts/player';

export const usePlayer = () => {
    const context = useContext(PlayerContext);

    if (!context) {
        throw new Error('usePlayer deve ser usado dentro de <PlayerProvider>.');
    }

    return context;
};
