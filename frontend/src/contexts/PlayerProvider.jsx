import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PlayerContext } from './player';

const VOLUME_KEY = '@VinylVault:volume';

const DEFAULT_VOLUME = 0.8;

const readVolume = () => {
    try {
        const stored = localStorage.getItem(VOLUME_KEY);
        const value = stored === null ? NaN : Number(stored);
        return value >= 0 && value <= 1 ? value : DEFAULT_VOLUME;
    } catch {
        return DEFAULT_VOLUME;
    }
};

// One <audio> element for the whole app, so the preview keeps playing while the
// user navigates between pages.
export const PlayerProvider = ({ children }) => {
    const audioRef = useRef(null);
    const [track, setTrack] = useState(null);
    const [queue, setQueue] = useState([]);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [volume, setVolumeState] = useState(readVolume);
    const [error, setError] = useState('');

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const start = useCallback(async (vinil) => {
        const audio = audioRef.current;

        setTrack(vinil);
        setProgress(0);
        setError('');
        audio.src = vinil.preview_url;

        try {
            await audio.play();
        } catch {
            setPlaying(false);
            setError('Não foi possível tocar este preview.');
        }
    }, []);

    // `list` is the set of records the user can skip through (usually the page they clicked in).
    const play = useCallback(
        (vinil, list = [vinil]) => {
            if (!vinil?.preview_url) {
                return false;
            }

            setQueue(list.filter((item) => item.preview_url));
            start(vinil);
            return true;
        },
        [start]
    );

    const toggle = useCallback(() => {
        const audio = audioRef.current;

        if (!track) {
            return;
        }

        if (audio.paused) {
            audio.play().catch(() => setError('Não foi possível tocar este preview.'));
        } else {
            audio.pause();
        }
    }, [track]);

    const index = track ? queue.findIndex((item) => item.id === track.id) : -1;
    const hasNext = index >= 0 && index < queue.length - 1;
    const hasPrevious = index > 0;

    const next = useCallback(() => {
        if (hasNext) {
            start(queue[index + 1]);
        }
    }, [hasNext, index, queue, start]);

    const previous = useCallback(() => {
        const audio = audioRef.current;

        // Like most players: restart the track first, go back only near its start.
        if (audio.currentTime > 3 || !hasPrevious) {
            audio.currentTime = 0;
            return;
        }

        start(queue[index - 1]);
    }, [hasPrevious, index, queue, start]);

    const seek = useCallback((ratio) => {
        const audio = audioRef.current;

        if (audio?.duration) {
            audio.currentTime = Math.min(Math.max(ratio, 0), 1) * audio.duration;
        }
    }, []);

    const setVolume = useCallback((value) => {
        setVolumeState(value);

        try {
            localStorage.setItem(VOLUME_KEY, String(value));
        } catch {
            // Storage can be unavailable (private mode); the volume just will not persist.
        }
    }, []);

    const handleTimeUpdate = () => {
        const audio = audioRef.current;
        setProgress(audio.duration ? audio.currentTime / audio.duration : 0);
    };

    const handleEnded = () => {
        setPlaying(false);

        if (hasNext) {
            next();
        } else {
            setProgress(0);
        }
    };

    const value = useMemo(
        () => ({ track, playing, progress, volume, error, hasNext, play, toggle, next, previous, seek, setVolume }),
        [track, playing, progress, volume, error, hasNext, play, toggle, next, previous, seek, setVolume]
    );

    return (
        <PlayerContext.Provider value={value}>
            {children}
            <audio
                ref={audioRef}
                preload="none"
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onTimeUpdate={handleTimeUpdate}
                onEnded={handleEnded}
                onError={() => {
                    if (audioRef.current?.getAttribute('src')) {
                        setPlaying(false);
                        setError('Não foi possível carregar este preview.');
                    }
                }}
            />
        </PlayerContext.Provider>
    );
};
