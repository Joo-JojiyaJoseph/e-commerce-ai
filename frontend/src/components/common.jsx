import { Link } from 'react-router-dom';
import { Icon } from './icons.jsx';

const variants = {
    primary: 'bg-ink text-white hover:bg-black',
    secondary: 'bg-forest text-white hover:bg-[#152e28]',
    accent: 'bg-accent text-white hover:bg-accent-dark',
    ghost: 'border border-line bg-paper text-ink hover:border-ink',
    outline: 'border border-ink bg-transparent text-ink hover:bg-canvas',
    danger: 'border border-red-200 bg-white text-danger hover:bg-red-50',
    success: 'bg-success text-white hover:bg-[#18573c]',
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
            className={`inline-flex cursor-pointer items-center justify-center gap-2 rounded-md px-4 py-2.5 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${variants[variant] ?? variants.primary} ${className}`}
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
            className={`inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full text-ink transition hover:bg-canvas ${className}`}
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
            <span className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-success' : 'bg-[#d4cdc3]'}`}>
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
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
                className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm shadow-none outline-none ring-0 transition focus:border-ink focus:outline-none focus:ring-0 focus-visible:outline-none ${invalid ? 'border-danger' : 'border-line'}`}
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
                className={`min-h-28 w-full rounded-lg border bg-white px-3 py-2.5 text-sm outline-none transition focus:border-ink ${invalid ? 'border-danger' : 'border-line'}`}
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
                className={`w-full cursor-pointer rounded-lg border bg-white px-3 py-2.5 text-sm shadow-none outline-none ring-0 transition focus:border-ink focus:outline-none focus:ring-0 focus-visible:outline-none ${error ? 'border-danger' : 'border-line'}`}
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
        muted: 'bg-line text-ink',
        sale: 'bg-accent text-white',
        success: 'bg-success/10 text-success',
        warning: 'bg-warning/10 text-warning',
        danger: 'bg-danger/10 text-danger',
        info: 'bg-info/10 text-info',
    };

    return <span className={`inline-flex rounded px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide ${tones[tone] ?? tones.ink}`}>{children}</span>;
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
        <div className="rounded-xl border border-dashed border-line bg-paper px-6 py-14 text-center">
            <Icon name={icon} className="mx-auto h-10 w-10 text-muted" />
            <h2 className="mt-4 font-display text-2xl">{title}</h2>
            {body && <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted">{body}</p>}
            {action && <div className="mt-5">{action}</div>}
        </div>
    );
}

export function ErrorState({ title = 'Something went wrong', body, onRetry }) {
    return (
        <div className="rounded-xl border border-red-200 bg-red-50 px-6 py-10 text-center">
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
                {eyebrow && <p className="text-[11px] uppercase tracking-[0.16em] text-muted">{eyebrow}</p>}
                <h1 className="font-display text-3xl md:text-4xl">{title}</h1>
                {subtitle && <p className="mt-1 max-w-2xl text-sm leading-6 text-muted">{subtitle}</p>}
            </div>
            {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
        </div>
    );
}

export function SectionCard({ title, subtitle, children, className = '' }) {
    return (
        <section className={`space-y-4 rounded-xl border border-line bg-paper p-5 ${className}`}>
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
            <button type="button" className="flex-1 bg-ink/40" aria-label="Close" onClick={onClose} />
            <aside
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`drawer-enter flex h-full w-full max-w-md flex-col bg-paper shadow-soft ${side === 'left' ? 'order-first' : ''}`}
            >
                <div className="flex items-center justify-between border-b border-line px-5 py-4">
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
        <div className="fixed inset-0 z-[60] grid place-items-center bg-ink/40 p-4">
            <button type="button" className="absolute inset-0 cursor-default" aria-label="Close dialog" onClick={onClose} />
            <div
                role="dialog"
                aria-modal="true"
                aria-label={title}
                className={`modal-enter relative max-h-[90vh] w-full overflow-y-auto rounded-xl bg-paper p-5 shadow-soft ${widths[size] ?? widths.lg}`}
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
        info: 'border-info/20 bg-info/[0.06]',
        success: 'border-success/20 bg-success/[0.07]',
        warning: 'border-warning/25 bg-warning/[0.08]',
        accent: 'border-accent/20 bg-accent/[0.06]',
    };

    return (
        <div className={`rounded-xl border px-4 py-3 text-sm ${tones[tone] ?? tones.info} ${className}`}>
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
                    <span className={`grid h-6 w-6 place-items-center rounded-full text-[11px] font-medium ${index <= current ? 'bg-ink text-white' : 'bg-line text-muted'}`}>
                        {index + 1}
                    </span>
                    <span className={index <= current ? 'text-ink' : 'text-muted'}>{step}</span>
                    {index < steps.length - 1 && <span className="mx-1 hidden h-px w-6 bg-line sm:block" />}
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
        <div className="overflow-x-auto rounded-2xl border border-line bg-paper shadow-soft">
            {children}
        </div>
    );
}

export function ShippingAddress({ address, className = '' }) {
    if (!address) {
        return null;
    }

    return (
        <div className={`rounded-2xl border border-line bg-paper p-5 text-sm ${className}`}>
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
