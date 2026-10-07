import { Icon } from '../../components/icons.jsx';

export default function Pagination({ list }) {
    if (!list.loaded || list.total === 0) return null;

    const from = (list.page - 1) * list.perPage + 1;
    const to = Math.min(list.total, list.page * list.perPage);
    const btn = 'inline-flex h-9 cursor-pointer items-center gap-1 rounded-xl border border-white/70 bg-white/70 px-3 text-sm font-medium transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40';

    return (
        <nav className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted" aria-label="Pagination">
            <p>Showing <strong className="text-ink">{from}–{to}</strong> of <strong className="text-ink">{list.total}</strong></p>
            <div className="flex items-center gap-2">
                <label className="flex items-center gap-2">
                    <span className="hidden sm:inline">Rows</span>
                    <select
                        className="cursor-pointer rounded-xl border border-slate-900/10 bg-white px-2 py-1.5"
                        value={list.perPage}
                        onChange={(event) => list.setFilters({ per_page: event.target.value })}
                    >
                        {[20, 50, 100].map((size) => <option key={size} value={size}>{size}</option>)}
                    </select>
                </label>
                <button type="button" className={btn} disabled={list.page <= 1} onClick={() => list.setPage(list.page - 1)}>
                    <Icon name="arrow-left" className="h-4 w-4" /> Prev
                </button>
                <span className="tabular-nums">{list.page} / {list.lastPage}</span>
                <button type="button" className={btn} disabled={list.page >= list.lastPage} onClick={() => list.setPage(list.page + 1)}>
                    Next <Icon name="arrow-right" className="h-4 w-4" />
                </button>
            </div>
        </nav>
    );
}
