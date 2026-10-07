import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getBrands, getCategories, getHome } from '../api.js';

const CatalogContext = createContext(null);
let homePromise = null;

export function CatalogProvider({ children }) {
    const [allCategories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);
    const [home, setHome] = useState(null);

    const loadHome = useCallback(() => {
        if (!homePromise) {
            homePromise = getHome()
                .then((response) => {
                    setHome(response.data);

                    if (response.data.categories?.length) {
                        setCategories(response.data.categories);
                    }

                    if (response.data.brands?.length) {
                        setBrands(response.data.brands);
                    }

                    return response.data;
                })
                .catch((error) => {
                    homePromise = null;
                    throw error;
                });
        }

        return homePromise;
    }, []);

    useEffect(() => {
        getCategories()
            .then(({ data }) => setCategories(Array.isArray(data) ? data : []))
            .catch(() => setCategories([]));
        getBrands()
            .then(({ data }) => setBrands(Array.isArray(data) ? data : []))
            .catch(() => setBrands([]));
        loadHome().catch(() => {});
    }, [loadHome]);

    // `categories` is the top level only (each carries its nested `children`); `allCategories` is every
    // active category, for filters and breadcrumbs. A child whose parent is hidden is promoted to top level.
    const categories = useMemo(() => {
        const ids = new Set(allCategories.map((category) => category.id));
        return allCategories.filter((category) => !category.parent_id || !ids.has(category.parent_id));
    }, [allCategories]);

    const value = useMemo(
        () => ({ categories, allCategories, brands, home, loadHome, setHome }),
        [categories, allCategories, brands, home, loadHome],
    );

    return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
    const context = useContext(CatalogContext);

    if (!context) {
        throw new Error('useCatalog must be used inside CatalogProvider.');
    }

    return context;
}
