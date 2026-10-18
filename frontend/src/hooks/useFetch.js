import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';

// GET `url` and track its state: status is 'loading' | 'ready' | 'error'.
// - Changing url/params refetches but keeps the previous data on screen (no flicker while typing a search).
// - reload() refreshes in the background; retry() goes back to the loading state first.
// - Pass a falsy url to skip the request.
export function useFetch(url, { params, fallbackError = 'Não foi possível carregar os dados.' } = {}) {
    const [state, setState] = useState({ data: null, status: 'loading', error: '' });
    const [reloadKey, setReloadKey] = useState(0);
    const paramsKey = JSON.stringify(params ?? {});

    useEffect(() => {
        if (!url) {
            return undefined;
        }

        let cancelled = false;

        api.get(url, { params: JSON.parse(paramsKey) })
            .then(({ data }) => {
                if (!cancelled) {
                    setState({ data, status: 'ready', error: '' });
                }
            })
            .catch((error) => {
                if (!cancelled) {
                    setState((previous) => ({ ...previous, status: 'error', error: errorMessage(error, fallbackError) }));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [url, paramsKey, reloadKey, fallbackError]);

    const reload = useCallback(() => setReloadKey((key) => key + 1), []);

    const retry = useCallback(() => {
        setState((previous) => ({ ...previous, status: 'loading', error: '' }));
        setReloadKey((key) => key + 1);
    }, []);

    // Optimistic local edits (e.g. removing a deleted item) without a round trip.
    const setData = useCallback((update) => {
        setState((previous) => ({ ...previous, data: typeof update === 'function' ? update(previous.data) : update }));
    }, []);

    return { ...state, reload, retry, setData };
}
