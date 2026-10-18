import { useCallback, useEffect, useState } from 'react';
import api, { errorMessage } from '../lib/api';

const initialState = { items: [], status: 'loading', error: '', hasMore: false, loadingMore: false };

// Offset-paginated GET (?limite=&offset=) that accumulates pages for "load more" lists.
// Changing url/params starts over from the first page.
export function usePagedFetch(url, { params, pageSize = 20, fallbackError = 'Não foi possível carregar os dados.' } = {}) {
    const paramsKey = JSON.stringify(params ?? {});
    const key = `${url}|${paramsKey}`;

    const [state, setState] = useState(initialState);
    const [page, setPage] = useState(0);
    const [reloadKey, setReloadKey] = useState(0);
    const [currentKey, setCurrentKey] = useState(key);

    // Reset while rendering when the query changes (React's recommended way to reset state on a prop change).
    if (key !== currentKey) {
        setCurrentKey(key);
        setPage(0);
        setState(initialState);
    }

    useEffect(() => {
        let cancelled = false;

        api.get(url, { params: { ...JSON.parse(paramsKey), limite: pageSize, offset: page * pageSize } })
            .then(({ data }) => {
                if (cancelled) {
                    return;
                }

                setState((previous) => ({
                    items: page === 0 ? data : [...previous.items, ...data],
                    status: 'ready',
                    error: '',
                    hasMore: data.length === pageSize,
                    loadingMore: false
                }));
            })
            .catch((error) => {
                if (!cancelled) {
                    setState((previous) => ({ ...previous, status: 'error', error: errorMessage(error, fallbackError), loadingMore: false }));
                }
            });

        return () => {
            cancelled = true;
        };
    }, [url, paramsKey, page, pageSize, reloadKey, fallbackError]);

    const loadMore = useCallback(() => {
        setState((previous) => ({ ...previous, loadingMore: true }));
        setPage((current) => current + 1);
    }, []);

    const retry = useCallback(() => {
        setState((previous) => ({ ...previous, status: previous.items.length > 0 ? 'ready' : 'loading', error: '' }));
        setPage(0);
        setReloadKey((current) => current + 1);
    }, []);

    const setItems = useCallback((update) => {
        setState((previous) => ({ ...previous, items: typeof update === 'function' ? update(previous.items) : update }));
    }, []);

    return { ...state, loadMore, retry, setItems };
}
