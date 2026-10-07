import { useEffect, useRef, useState } from 'react';
import { Icon } from '../../components/icons.jsx';
import { useToast } from '../../toast.jsx';
import { exportRows, fetchAllRows } from './exporter.js';

const field = 'w-full cursor-pointer rounded-xl border border-slate-900/10 bg-white px-3 py-2 text-sm outline-none transition';

function Field({ label, children }) {
    return (
        <label className="block text-xs font-medium text-muted">
            <span className="mb-1 block">{label}</span>
            {children}
        </label>
    );
}

function SearchBox({ value, placeholder, onCommit }) {
    const [text, setText] = useState(value);

    useEffect(() => setText(value), [value]);
    useEffect(() => {
        if (text === value) return undefined;
        const timer = setTimeout(() => onCommit(text.trim()), 350);
        return () => clearTimeout(timer);
    }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="relative min-w-52 flex-1">
            <Icon name="search" className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
                type="search"
                value={text}
                onChange={(event) => setText(event.target.value)}
                placeholder={placeholder}
                aria-label={placeholder}
                className="w-full rounded-xl border border-slate-900/10 bg-white py-2.5 pl-10 pr-3 text-sm outline-none"
            />
        </div>
    );
}

function ExportMenu({ list, exportConfig }) {
    const { success, error, info } = useToast();
    const [open, setOpen] = useState(false);
    const [busy, setBusy] = useState(null);
    const ref = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        const close = (event) => !ref.current?.contains(event.target) && setOpen(false);
        const esc = (event) => event.key === 'Escape' && setOpen(false);
        document.addEventListener('mousedown', close);
        document.addEventListener('keydown', esc);
        return () => {
            document.removeEventListener('mousedown', close);
            document.removeEventListener('keydown', esc);
        };
    }, [open]);

    async function run(format) {
        setBusy(format);
        try {
            const { rows, truncated } = await fetchAllRows(exportConfig.endpoint, list.exportParams);
            if (rows.length === 0) {
                info('Nothing to export', 'No rows match the current filters.');
                return;
            }
            await exportRows({ format, filename: exportConfig.filename, rows, columns: exportConfig.columns });
            success('Export ready', `${rows.length} row${rows.length === 1 ? '' : 's'} saved${truncated ? ' (first 10,000 only)' : ''}.`);
            setOpen(false);
        } catch (caught) {
            error('Export failed', caught.message);
        } finally {
            setBusy(null);
        }
    }

    return (
        <div className="relative" ref={ref}>
            <button
                type="button"
                aria-haspopup="menu"
                aria-expanded={open}
                onClick={() => setOpen((value) => !value)}
                className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-3.5 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
            >
                <Icon name="download" className="h-4 w-4" /> Export
            </button>
            {open && (
                <div role="menu" className="dropdown-enter absolute right-0 z-30 mt-2 w-60 rounded-2xl border border-white/70 p-1.5 shadow-soft">
                    <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
                        {list.total} matching row{list.total === 1 ? '' : 's'}
                    </p>
                    {[['csv', 'CSV', 'Opens in Excel, Sheets, Numbers'], ['xlsx', 'Excel (.xlsx)', 'Formatted spreadsheet']].map(([format, label, hint]) => (
                        <button
                            key={format}
                            type="button"
                            role="menuitem"
                            disabled={busy !== null}
                            onClick={() => run(format)}
                            className="flex w-full cursor-pointer items-start gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition hover:bg-accent/10 disabled:cursor-wait disabled:opacity-60"
                        >
                            <Icon name={busy === format ? 'arrow-path' : 'document'} className={`mt-0.5 h-4 w-4 text-accent ${busy === format ? 'animate-spin' : ''}`} />
                            <span>
                                <span className="block font-medium">{busy === format ? 'Preparing…' : label}</span>
                                <span className="block text-xs text-muted">{hint}</span>
                            </span>
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Glass filter toolbar shared by every admin list: debounced search, typed filter fields,
 * removable chips for what's applied, reset, and CSV/Excel export of exactly what's filtered.
 *
 * fields: [{ key, label, type: 'select'|'date'|'number'|'toggle', options?: [{ value, label }], placeholder? }]
 */
export default function FilterBar({ list, search, fields = [], exportConfig, actions }) {
    const [open, setOpen] = useState(false);
    const applied = fields.filter((item) => list.values[item.key]);
    const chips = applied.map((item) => {
        const raw = list.values[item.key];
        const label = item.type === 'select' ? item.options?.find((option) => String(option.value) === raw)?.label ?? raw : item.type === 'toggle' ? 'Yes' : raw;
        return { key: item.key, text: `${item.label}: ${label}` };
    });
    const hasAnything = chips.length > 0 || list.values.q;

    return (
        <section className="admin-toolbar !block space-y-3" aria-label="Filters">
            <div className="flex flex-wrap items-center gap-2">
                {search && <SearchBox value={list.values.q ?? ''} placeholder={search} onCommit={(q) => list.setFilters({ q })} />}
                {fields.length > 0 && (
                    <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setOpen((value) => !value)}
                        className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-white/70 bg-white/70 px-3.5 py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
                    >
                        <Icon name="funnel" className="h-4 w-4" /> Filters
                        {chips.length > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-accent px-1 text-[11px] text-white">{chips.length}</span>}
                    </button>
                )}
                {exportConfig && <ExportMenu list={list} exportConfig={exportConfig} />}
                {actions}
            </div>

            {open && (
                <div className="reveal grid gap-3 rounded-2xl border border-white/70 bg-white/40 p-3 sm:grid-cols-2 lg:grid-cols-4">
                    {fields.map((item) => (
                        <Field key={item.key} label={item.label}>
                            {item.type === 'select' && (
                                <select aria-label={item.label} className={field} value={list.values[item.key] ?? ''} onChange={(event) => list.setFilters({ [item.key]: event.target.value })}>
                                    <option value="">{item.placeholder ?? 'All'}</option>
                                    {item.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                                </select>
                            )}
                            {(item.type === 'date' || item.type === 'number') && (
                                <input
                                    aria-label={item.label}
                                    type={item.type}
                                    min={item.type === 'number' ? 0 : undefined}
                                    placeholder={item.placeholder}
                                    className={`${field} cursor-text`}
                                    value={list.values[item.key] ?? ''}
                                    onChange={(event) => list.setFilters({ [item.key]: event.target.value })}
                                />
                            )}
                            {item.type === 'toggle' && (
                                <button
                                    type="button"
                                    role="switch"
                                    aria-label={item.label}
                                    aria-checked={Boolean(list.values[item.key])}
                                    onClick={() => list.setFilters({ [item.key]: !list.values[item.key] })}
                                    className={`${field} text-left ${list.values[item.key] ? 'border-accent bg-accent/10 font-semibold text-accent-dark' : ''}`}
                                >
                                    {list.values[item.key] ? 'On' : 'Off'}
                                </button>
                            )}
                        </Field>
                    ))}
                </div>
            )}

            {hasAnything && (
                <div className="flex flex-wrap items-center gap-2" aria-live="polite">
                    {list.values.q && (
                        <button type="button" onClick={() => list.setFilters({ q: '' })} className="chip">
                            Search: “{list.values.q}” <Icon name="close" className="h-3 w-3" />
                        </button>
                    )}
                    {chips.map((chip) => (
                        <button key={chip.key} type="button" onClick={() => list.setFilters({ [chip.key]: '' })} className="chip">
                            {chip.text} <Icon name="close" className="h-3 w-3" />
                        </button>
                    ))}
                    <button type="button" onClick={list.reset} className="cursor-pointer text-xs font-semibold text-accent-dark hover:underline">Clear all</button>
                </div>
            )}
        </section>
    );
}
