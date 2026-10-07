import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Icon } from '../../components/icons.jsx';

const selectClass = 'w-full cursor-pointer rounded-xl border border-slate-900/10 bg-white px-3.5 py-2.5 text-sm outline-none transition';
const MAX_PLACEMENTS = 6;

/**
 * Cascading Category → Subcategory → … picker. A product is stored against its deepest choice, and the
 * storefront automatically lists it under every parent as well. Supports several placements.
 *
 * value: array of category ids. onChange receives only real, de-duplicated ids (never empty rows).
 * options: tree-ordered options from useCategoryOptions().
 */
export default function CategoryPicker({ value, onChange, options, error, loading = false }) {
    const [rows, setRows] = useState(() => (value.length ? value : [null]));
    const emitted = useRef(JSON.stringify(value));

    // Adopt ids that arrive from outside (e.g. the product finishing loading), but ignore our own echoes.
    useEffect(() => {
        const incoming = JSON.stringify(value);
        if (incoming !== emitted.current) {
            emitted.current = incoming;
            setRows(value.length ? value : [null]);
        }
    }, [value]);

    const byId = useMemo(() => new Map(options.map((item) => [item.id, item])), [options]);
    const childrenOf = useMemo(() => {
        const map = new Map();
        options.forEach((item) => {
            const key = item.parent_id && byId.has(item.parent_id) ? item.parent_id : null;
            if (!map.has(key)) map.set(key, []);
            map.get(key).push(item);
        });
        return map;
    }, [options, byId]);

    function commit(next) {
        const cleaned = next.length ? next : [null];
        const ids = [...new Set(cleaned.filter((id) => id !== null))];
        setRows(cleaned);
        emitted.current = JSON.stringify(ids);
        onChange(ids);
    }

    const pathTo = (id) => {
        const path = [];
        const guard = new Set();
        let cursor = byId.get(id);
        while (cursor && !guard.has(cursor.id)) {
            guard.add(cursor.id);
            path.unshift(cursor.id);
            cursor = byId.get(cursor.parent_id);
        }
        return path;
    };

    if (loading) {
        return <div className="h-14 animate-pulse rounded-2xl border border-white/70 bg-white/40" role="status" aria-label="Loading categories" />;
    }

    if (options.length === 0) {
        return (
            <p className="rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-4 text-sm text-muted">
                No categories yet. <Link to="/admin/categories" className="font-semibold text-accent-dark underline">Create a category</Link> first, then come back to assign it.
            </p>
        );
    }

    return (
        <div className="space-y-3">
            {rows.map((id, index) => {
                const path = id === null ? [] : pathTo(id);
                // one select per level: the roots, then the children of each chosen node that has any
                const levels = [childrenOf.get(null) ?? []];
                path.forEach((nodeId) => {
                    const kids = childrenOf.get(nodeId) ?? [];
                    if (kids.length) levels.push(kids);
                });

                return (
                    <div key={index} className="flex flex-wrap items-center gap-2 rounded-2xl border border-white/70 bg-white/40 p-3">
                        {levels.map((choices, depth) => (
                            <div key={depth} className="min-w-44 flex-1">
                                <select
                                    aria-label={depth === 0 ? `Category ${index + 1}` : `Subcategory level ${depth} for category ${index + 1}`}
                                    className={selectClass}
                                    value={path[depth] ?? ''}
                                    onChange={(event) => {
                                        const picked = event.target.value ? Number(event.target.value) : null;
                                        // choosing at a level drops anything deeper; clearing falls back to the parent level
                                        const next = [...rows];
                                        next[index] = picked ?? (depth > 0 ? path[depth - 1] : null);
                                        commit(next);
                                    }}
                                >
                                    <option value="">{depth === 0 ? 'Choose a category…' : 'Subcategory (optional)'}</option>
                                    {choices.map((choice) => <option key={choice.id} value={choice.id}>{choice.name}</option>)}
                                </select>
                            </div>
                        ))}
                        {(rows.length > 1 || id !== null) && (
                            <button
                                type="button"
                                aria-label={`Remove category ${index + 1}`}
                                onClick={() => commit(rows.filter((_, i) => i !== index))}
                                className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger"
                            >
                                <Icon name="close" className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                );
            })}
            <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                    type="button"
                    disabled={rows[rows.length - 1] === null || rows.length >= MAX_PLACEMENTS}
                    onClick={() => commit([...rows, null])}
                    className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-accent-dark transition hover:underline disabled:cursor-not-allowed disabled:opacity-40"
                >
                    <Icon name="plus" className="h-4 w-4" /> Add to another category
                </button>
                <p className="text-xs text-muted">Subcategory is optional. The product also appears under its parent category.</p>
            </div>
            {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        </div>
    );
}
