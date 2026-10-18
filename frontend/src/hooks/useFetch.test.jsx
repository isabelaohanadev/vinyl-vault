import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '../lib/api';
import { useFetch } from './useFetch';

vi.mock('../lib/api', async (importOriginal) => ({
    ...(await importOriginal()),
    default: { get: vi.fn() }
}));

describe('useFetch', () => {
    beforeEach(() => api.get.mockReset());

    it('goes from loading to ready with the data', async () => {
        api.get.mockResolvedValue({ data: [1, 2] });

        const { result } = renderHook(() => useFetch('/items'));
        expect(result.current.status).toBe('loading');

        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.data).toEqual([1, 2]);
        expect(api.get).toHaveBeenCalledWith('/items', { params: {} });
    });

    it('reports a friendly error and recovers on retry', async () => {
        api.get.mockRejectedValueOnce({ response: { data: { error: 'Quebrou.' } } }).mockResolvedValueOnce({ data: 'ok' });

        const { result } = renderHook(() => useFetch('/items'));
        await waitFor(() => expect(result.current.status).toBe('error'));
        expect(result.current.error).toBe('Quebrou.');

        act(() => result.current.retry());
        expect(result.current.status).toBe('loading');

        await waitFor(() => expect(result.current.status).toBe('ready'));
        expect(result.current.data).toBe('ok');
    });

    it('refetches when params change but keeps showing the previous data meanwhile', async () => {
        let resolveSecond;
        api.get
            .mockResolvedValueOnce({ data: ['first'] })
            .mockImplementationOnce(() => new Promise((resolve) => { resolveSecond = resolve; }));

        const { result, rerender } = renderHook(({ term }) => useFetch('/items', { params: { busca: term } }), { initialProps: { term: 'a' } });
        await waitFor(() => expect(result.current.data).toEqual(['first']));

        rerender({ term: 'ab' });
        await waitFor(() => expect(api.get).toHaveBeenCalledTimes(2));
        expect(result.current.data).toEqual(['first']);
        expect(api.get).toHaveBeenLastCalledWith('/items', { params: { busca: 'ab' } });

        await act(async () => resolveSecond({ data: ['second'] }));
        expect(result.current.data).toEqual(['second']);
    });

    it('ignores a response that arrives after the params changed', async () => {
        let resolveStale;
        api.get
            .mockImplementationOnce(() => new Promise((resolve) => { resolveStale = resolve; }))
            .mockResolvedValueOnce({ data: 'fresh' });

        const { result, rerender } = renderHook(({ term }) => useFetch('/items', { params: { busca: term } }), { initialProps: { term: 'a' } });
        rerender({ term: 'b' });
        await waitFor(() => expect(result.current.data).toBe('fresh'));

        await act(async () => resolveStale({ data: 'stale' }));

        expect(result.current.data).toBe('fresh');
    });

    it('skips the request for a falsy url and supports local edits', async () => {
        const { result } = renderHook(() => useFetch(null));
        expect(api.get).not.toHaveBeenCalled();

        act(() => result.current.setData([1]));
        expect(result.current.data).toEqual([1]);
        act(() => result.current.setData((current) => [...current, 2]));
        expect(result.current.data).toEqual([1, 2]);
    });
});
