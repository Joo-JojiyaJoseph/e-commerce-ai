import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminGet } from '../../api.js';

/**
 * Server-driven admin list. Filters live in the URL, so a filtered view can be bookmarked,
 * shared, refreshed and navigated with the browser's back button.
 */
export function useAdminList(endpoint, { perPage = 20, defaults = {} } = {}) {
    const [params, setParams] = useSearchParams();
    const [state, setState] = useState({ payload: null, loading: true, error: null });
    const [nonce, setNonce] = useState(0);
    const latest = useRef(0);
    const search = params.toString();
    const defaultsKey = JSON.stringify(defaults);

    useEffect(() => {
        const ticket = ++latest.current;
        setState((current) => ({ ...current, loading: true, error: null }));

        const query = new URLSearchParams(search);
        Object.entries(defaults).forEach(([key, value]) => !query.has(key) && query.set(key, value));
        if (!query.has('per_page')) query.set('per_page', String(perPage));

        adminGet(`${endpoint}?${query}`)
            .then((payload) => ticket === latest.current && setState({ payload, loading: false, error: null }))
            .catch((error) => ticket === latest.current && setState((current) => ({ payload: current.payload, loading: false, error })));
    }, [endpoint, search, nonce, perPage, defaultsKey]); // eslint-disable-line react-hooks/exhaustive-deps

    // Updates are composed through a ref (not the render-time snapshot), so two changes in quick
    // succession, e.g. a debounced search landing while a select changes, can never overwrite each other.
    const pending = useRef(params);
    pending.current = params;

    const setFilters = useCallback((changes) => {
        const next = new URLSearchParams(pending.current);
        Object.entries(changes).forEach(([key, value]) => {
            if (value === '' || value === null || value === undefined || value === false) next.delete(key);
            else next.set(key, value === true ? '1' : String(value));
        });
        if (!('page' in changes)) next.delete('page');
        pending.current = next;
        setParams(next, { replace: true });
    }, [setParams]);

    const values = useMemo(() => Object.fromEntries(params.entries()), [search]); // eslint-disable-line react-hooks/exhaustive-deps
    const payload = state.payload;
    const meta = payload?.meta ?? payload ?? {};

    return {
        values,
        setFilters,
        reset: () => { pending.current = new URLSearchParams(); setParams({}, { replace: true }); },
        setPage: (page) => setFilters({ page }),
        reload: () => setNonce((n) => n + 1),
        rows: payload?.data ?? [],
        mutateRows: (fn) => setState((current) => ({ ...current, payload: { ...current.payload, data: fn(current.payload?.data ?? []) } })),
        loading: state.loading,
        error: state.error,
        loaded: payload !== null,
        page: Number(meta.current_page ?? 1),
        lastPage: Number(meta.last_page ?? 1),
        total: Number(meta.total ?? (payload?.data ?? []).length),
        perPage: Number(meta.per_page ?? perPage),
        exportParams: { ...defaults, ...Object.fromEntries(Object.entries(values).filter(([key]) => !['page', 'per_page'].includes(key))) },
        // true when the user has narrowed the list beyond its built-in defaults
        isFiltered: Object.keys(values).some((key) => !['page', 'per_page'].includes(key)),
    };
}
