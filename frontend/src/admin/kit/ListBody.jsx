import { EmptyState, ErrorState, Skeleton, TableShell } from '../../components/common.jsx';

/**
 * Handles the first-load skeleton, error, and empty states for an admin table so each page
 * only has to describe its columns. Keeps old rows visible (dimmed) while a refetch runs.
 */
export default function ListBody({ list, empty, children }) {
    if (!list.loaded && list.loading) {
        return (
            <div className="space-y-2 rounded-3xl border border-line bg-paper p-4">
                {[0, 1, 2, 3, 4].map((key) => <Skeleton key={key} className="h-12 rounded-xl" />)}
            </div>
        );
    }

    if (list.error && !list.loaded) {
        return <ErrorState title="Could not load this list" body={list.error.message} onRetry={list.reload} />;
    }

    return (
        <TableShell empty={list.loaded && list.rows.length === 0} emptyState={empty}>
            <div className={`transition-opacity duration-200 ${list.loading ? 'opacity-60' : ''}`} aria-busy={list.loading}>
                {children}
            </div>
        </TableShell>
    );
}

export function EmptyFiltered({ title, body, icon, list }) {
    const filtered = list.isFiltered ?? Object.keys(list.exportParams).length > 0;

    return (
        <EmptyState
            title={filtered ? 'No matches' : title}
            body={filtered ? 'Nothing fits the current filters. Try removing one.' : body}
            icon={icon}
            action={filtered ? <button type="button" onClick={list.reset} className="cursor-pointer text-sm font-semibold text-accent-dark hover:underline">Clear filters</button> : undefined}
        />
    );
}
