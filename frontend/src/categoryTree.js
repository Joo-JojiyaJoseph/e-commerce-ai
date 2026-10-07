/**
 * Flattens a category list into tree order with a readable path, e.g. "Knitwear › Sweaters".
 * Cycle-safe, and orphans (parent missing/deleted) are treated as top level.
 */
export function buildCategoryOptions(items) {
    const ids = new Set(items.map((item) => item.id));
    const children = new Map();

    items.forEach((item) => {
        const parent = item.parent_id && ids.has(item.parent_id) ? item.parent_id : null;
        if (!children.has(parent)) children.set(parent, []);
        children.get(parent).push(item);
    });

    const out = [];
    const seen = new Set();

    const walk = (parent, depth, trail) => {
        (children.get(parent) ?? []).forEach((item) => {
            if (seen.has(item.id)) return;
            seen.add(item.id);
            const path = [...trail, item.name];
            out.push({ ...item, value: String(item.id), depth, path, label: path.join(' › '), hasChildren: (children.get(item.id) ?? []).length > 0 });
            walk(item.id, depth + 1, path);
        });
    };

    walk(null, 0, []);
    return out;
}

