import { Link } from 'react-router-dom';
import { Icon } from './icons.jsx';

const variants = {
    primary: 'bg-ink text-white shadow-[0_8px_20px_-6px_rgb(11_16_32_/_0.5)] hover:-translate-y-0.5 hover:shadow-[0_14px_28px_-8px_rgb(11_16_32_/_0.55)]',
    secondary: 'bg-forest text-white shadow-[0_8px_20px_-6px_rgb(16_20_51_/_0.5)] hover:-translate-y-0.5',
    accent: 'bg-accent text-white shadow-[0_10px_24px_-6px_rgb(109_74_255_/_0.65)] hover:-translate-y-0.5 hover:shadow-[0_16px_32px_-8px_rgb(109_74_255_/_0.7)] hover:brightness-110',
    ghost: 'border border-white/70 bg-paper text-ink shadow-[0_1px_0_rgb(255_255_255_/_0.8)_inset] hover:-translate-y-0.5 hover:border-accent/40 hover:bg-white/80',
    outline: 'border border-ink/70 bg-transparent text-ink hover:-translate-y-0.5 hover:bg-white/60',
    danger: 'border border-red-200/80 bg-white/70 text-danger backdrop-blur hover:-translate-y-0.5 hover:bg-red-50',
    glass: 'border border-white/30 bg-white/10 text-white backdrop-blur-xl hover:-translate-y-0.5 hover:border-white/60 hover:bg-white/20',
    success: 'bg-success text-white shadow-[0_8px_20px_-6px_rgb(11_122_84_/_0.5)] hover:-translate-y-0.5 hover:brightness-110',
};

export function Button({
    as,
    variant = 'primary',
    className = '',
    loading = false,
    loadingLabel = 'Please wait…',
    children,
    ...props
}) {
    const Tag = as || 'button';

    return (
        <Tag
            className={`btn-shine inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition duration-300 ease-out active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0 ${variants[variant] ?? variants.primary} ${className}`}
            disabled={props.disabled || loading}
            {...props}
        >
            {loading ? (
                <>
                    <Icon name="arrow-path" className="h-4 w-4 animate-spin" />
                    {loadingLabel}
                </>
            ) : children}
        </Tag>
    );
}

export function IconButton({ name, label, className = '', variant = 'ghost', ...props }) {
    return (
        <button
            type="button"
            aria-label={label}
            title={label}
            className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink transition duration-300 hover:bg-white/70 hover:shadow-sm active:scale-90 ${className}`}
            {...props}
        >
            <Icon name={name} className="h-5 w-5" />
        </button>
    );
}

export function Toggle({
    checked = false,
    onChange,
    onLabel = 'Active',
    offLabel = 'Inactive',
    showLabel = true,
    disabled = false,
    className = '',
}) {
    return (
        <button
            type="button"
            role="switch"
            aria-checked={checked}
            disabled={disabled}
            className={`inline-flex cursor-pointer items-center gap-2.5 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
            onClick={() => onChange?.(!checked)}
        >
            <span className={`relative h-6 w-11 shrink-0 rounded-full shadow-inner transition-colors duration-300 ${checked ? 'bg-success' : 'bg-slate-300/80'}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
            </span>
            {showLabel && (
                <span className={`text-sm ${checked ? 'text-success' : 'text-muted'}`}>
                    {checked ? onLabel : offLabel}
                </span>
            )}
        </button>
    );
}

export function Input({ label, error, className = '', id, required, hint, maxLength, ...props }) {
    const invalid = Boolean(error);

    return (
        <label className={`block text-sm ${className}`} htmlFor={id}>
            {label && (
                <span className="mb-1.5 block font-medium">
                    {label}
                    {required ? <span className="text-accent"> *</span> : null}
                </span>
            )}
            <input
                id={id}
                required={required}
                maxLength={maxLength}
                aria-invalid={invalid}
                className={`w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm shadow-none outline-none ring-0 transition placeholder:text-muted/60 focus:outline-none focus:ring-0 focus-visible:outline-none ${invalid ? 'border-danger' : 'border-slate-900/10'}`}
                {...props}
            />
            {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
            {error && <span className="mt-1 block text-xs text-danger" role="alert">{error}</span>}
        </label>
    );
}

export function Textarea({ label, error, className = '', required, maxLength, hint, ...props }) {
    const invalid = Boolean(error);

    return (
        <label className={`block text-sm ${className}`}>
            {label && (
                <span className="mb-1.5 block font-medium">
                    {label}
                    {required ? <span className="text-accent"> *</span> : null}
                </span>
            )}
            <textarea
                required={required}
                maxLength={maxLength}
                aria-invalid={invalid}
                className={`min-h-28 w-full rounded-xl border bg-white px-3.5 py-2.5 text-sm outline-none transition placeholder:text-muted/60 ${invalid ? 'border-danger' : 'border-slate-900/10'}`}
                {...props}
            />
            {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
            {error && <span className="mt-1 block text-xs text-danger" role="alert">{error}</span>}
        </label>
    );
}

export function Select({ label, children, className = '', error, required, ...props }) {
    return (
        <label className={`block text-sm ${className}`}>
            {label && (
                <span className="mb-1.5 block font-medium">
                    {label}
                    {required ? <span className="text-accent"> *</span> : null}
                </span>
            )}
            <select
                required={required}
                className={`w-full cursor-pointer rounded-xl border bg-white px-3.5 py-2.5 text-sm shadow-none outline-none ring-0 transition focus:outline-none focus:ring-0 focus-visible:outline-none ${error ? 'border-danger' : 'border-slate-900/10'}`}
                {...props}
            >
                {children}
            </select>
            {error && <span className="mt-1 block text-xs text-danger">{error}</span>}
        </label>
    );
}

export function Badge({ children, tone = 'ink' }) {
    const tones = {
        ink: 'bg-ink text-white',
        accent: 'bg-accent text-white',
        muted: 'bg-slate-900/[0.06] text-ink ring-1 ring-inset ring-white/60',
        sale: 'bg-accent text-white',
        success: 'bg-success/10 text-success ring-1 ring-inset ring-success/20',
        warning: 'bg-warning/10 text-warning ring-1 ring-inset ring-warning/20',
        danger: 'bg-danger/10 text-danger ring-1 ring-inset ring-danger/20',
        info: 'bg-info/10 text-info ring-1 ring-inset ring-info/20',
    };

    return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider ${tones[tone] ?? tones.ink}`}>{children}</span>;
}

export function StatusBadge({ value }) {
    const label = String(value ?? '').replaceAll('_', ' ');
    const tone = /cancel|reject|fail|out/.test(label) ? 'danger'
        : /pending|draft|low/.test(label) ? 'warning'
        : /paid|active|approved|deliver|complete|success/.test(label) ? 'success'
        : 'muted';

    return <Badge tone={tone}>{label || '—'}</Badge>;
}

export function Skeleton({ className = '' }) {
    return <div className={`skeleton rounded-md ${className}`} />;
}

export function EmptyState({ title, body, action, icon = 'inbox' }) {
    return (
        <div className="rounded-3xl border border-dashed border-accent/30 bg-paper px-6 py-16 text-center">
            <span className="float-slow mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-accent/10 text-accent ring-1 ring-white/70"><Icon name={icon} className="h-8 w-8" /></span>
            <h2 className="mt-4 font-display text-2xl">{title}</h2>
            {body && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function ErrorState({ title = 'Something went wrong', body, onRetry }) {
    return (
        <div className="rounded-3xl border border-red-200/70 bg-red-50/70 px-6 py-10 text-center backdrop-blur-xl">
            <Icon name="exclamation-triangle" className="mx-auto h-8 w-8 text-danger" />
            <h2 className="mt-3 font-medium text-danger">{title}</h2>
            {body && <p className="mt-2 text-sm text-danger">{body}</p>}
            {onRetry && (
                <Button type="button" variant="ghost" className="mt-4" onClick={onRetry}>
                    Try again
                </Button>
            )}
        </div>
    );
}

export function PageHeader({ eyebrow, title, subtitle, actions }) {
    return (
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
                {eyebrow && <p className="mb-1 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/55 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent-dark backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{eyebrow}</p>}
                <h1 className="font-display text-3xl md:text-[2.5rem]">{title}</h1>
                {subtitle && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function SectionCard({ title, subtitle, children, className = '' }) {
    return (
        <section className={`space-y-4 rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6 ${className}`}>
            {(title || subtitle) && (
                <div>
                    {title && <h2 className="font-display text-xl">{title}</h2>}
                    {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
                </div>
            )}
            {children}
        </section>
    );
}

export function Drawer({ open, title, onClose, children, side = 'right' }) {
    if (!open) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex">
            <button type="button" className="backdrop-enter flex-1 cursor-pointer bg-ink/30" aria-label="Close" onClick={onClose} />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`drawer-enter glass-strong flex h-full w-full max-w-md flex-col border-l border-white/70 shadow-[0_0_80px_rgb(40_30_110_/_0.25)] ${side === 'left' ? 'order-first border-l-0 border-r' : ''}`}
            >
                <div className="flex items-center justify-between border-b border-slate-900/[0.06] px-5 py-4">
                    <h2 className="font-display text-xl">{title}</h2>
                    <IconButton name="close" label="Close" onClick={onClose} />
                </div>
                <div className="flex-1 overflow-y-auto p-5">{children}</div>
            </aside>
        </div>
    );
}

export function Modal({ open, title, onClose, children, size = 'lg' }) {
    if (!open) {
        return null;
    }

    const widths = {
        sm: 'max-w-md',
        md: 'max-w-lg',
        lg: 'max-w-3xl',
    };

    return (
        <div className="backdrop-enter fixed inset-0 z-[60] grid place-items-center bg-ink/30 p-4">
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`modal-enter relative max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-white/70 bg-paper p-6 shadow-[0_30px_90px_rgb(40_30_110_/_0.35)] ${widths[size] ?? widths.lg}`}
            >
                <div className="mb-4 flex items-center justify-between gap-4">
                    <h2 className="font-display text-2xl">{title}</h2>
                    <IconButton name="close" label="Close" onClick={onClose} />
                </div>
                {children}
            </div>
        </div>
    );
}

export function Breadcrumbs({ items = [] }) {
    return (
        <nav className="mb-3 flex flex-wrap items-center gap-1 text-sm text-muted" aria-label="Breadcrumb">
            {items.map((item, index) => (
                <span key={item.label} className="inline-flex items-center gap-1">
                    {index > 0 && <Icon name="chevron-right" className="h-3.5 w-3.5" />}
                    {item.to ? <Link to={item.to} className="hover:text-ink">{item.label}</Link> : <span className="text-ink">{item.label}</span>}
                </span>
            ))}
        </nav>
    );
}

export function Container({ as: Tag = 'div', className = '', children }) {
    return <Tag className={`page-shell ${className}`}>{children}</Tag>;
}

export function Notice({ tone = 'info', title, children, className = '' }) {
    const tones = {
        info: 'border-info/25 bg-info/[0.08]',
        success: 'border-success/25 bg-success/[0.09]',
        warning: 'border-warning/30 bg-warning/[0.10]',
        accent: 'border-accent/25 bg-accent/[0.08]',
    };

    return (
        <div className={`rounded-2xl border px-4 py-3 text-sm backdrop-blur-xl ${tones[tone] ?? tones.info} ${className}`}>
            {title && <p className="font-medium">{title}</p>}
            {children && <div className={title ? 'mt-1 text-muted' : ''}>{children}</div>}
        </div>
    );
}

export function Stepper({ steps, current = 0 }) {
    return (
        <ol className="flex flex-wrap items-center gap-2 text-sm" aria-label="Progress">
            {steps.map((step, index) => (
                <li key={step} className="inline-flex items-center gap-2">
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-medium ${index <= current ? 'bg-accent text-white shadow-[0_4px_12px_-2px_rgb(109_74_255_/_0.6)]' : 'bg-white/60 text-muted ring-1 ring-inset ring-white/70'}`}>
                        {index + 1}
                    </span>
                    <span className={index <= current ? 'text-ink' : 'text-muted'}>{step}</span>
                    {index < steps.length - 1 && <span className="mx-1 hidden h-px w-6 bg-slate-900/10 sm:block" />}
                </li>
            ))}
        </ol>
    );
}

export function TableShell({ children, empty = false, emptyState }) {
    if (empty) {
        return emptyState ?? <EmptyState title="Nothing here yet" body="New records will appear in this table." />;
    }

    return (
        <div className="overflow-x-auto rounded-3xl border border-line bg-paper shadow-soft">
            {children}
        </div>
    );
}

export function ShippingAddress({ address, className = '' }) {
    if (!address) {
        return null;
    }

    return (
        <div className={`rounded-3xl border border-line bg-paper p-5 text-sm shadow-soft ${className}`}>
            <h2 className="font-medium">Delivery</h2>
            <p className="mt-2 font-medium">{address.name}</p>
            {address.phone && (
                <p className="mt-0.5 text-muted">
                    <a href={`tel:${String(address.phone).replace(/\s/g, '')}`} className="hover:underline">{address.phone}</a>
                </p>
            )}
            <p className="mt-1 leading-6 text-muted">
                {address.line1}{address.line2 ? `, ${address.line2}` : ''}
                <br />
                {[address.city, address.region, address.postal_code].filter(Boolean).join(', ')}
                {address.country ? ` · ${address.country}` : ''}
            </p>
        </div>
    );
}
