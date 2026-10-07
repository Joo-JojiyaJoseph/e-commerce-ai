import { useEffect, useState } from 'react';
import { adminGet } from '../../api.js';
import { buildCategoryOptions } from '../../categoryTree.js';

export { buildCategoryOptions };

async function fetchEvery(endpoint) {
    const rows = [];
    let page = 1;
    let last = 1;
    do {
        const payload = await adminGet(`${endpoint}?per_page=200&page=${page}`);
        rows.push(...(payload.data ?? []));
        last = payload.meta?.last_page ?? payload.last_page ?? 1;
        page += 1;
    } while (page <= last && page <= 20);
    return rows;
}

/** Loads every category (not just the first page) as tree-ordered options. */
export function useCategoryOptions() {
    const [state, setState] = useState({ options: [], loaded: false });

    useEffect(() => {
        let cancelled = false;
        fetchEvery('/api/admin/categories')
            .then((items) => !cancelled && setState({ options: buildCategoryOptions(items), loaded: true }))
            .catch(() => !cancelled && setState({ options: [], loaded: true }));
        return () => { cancelled = true; };
    }, []);

    return state;
}

export function useBrandOptions() {
    const [options, setOptions] = useState([]);

    useEffect(() => {
        let cancelled = false;
        fetchEvery('/api/admin/brands')
            .then((items) => !cancelled && setOptions(items.map((item) => ({ value: String(item.id), label: item.name }))))
            .catch(() => undefined);
        return () => { cancelled = true; };
    }, []);

    return options;
}
