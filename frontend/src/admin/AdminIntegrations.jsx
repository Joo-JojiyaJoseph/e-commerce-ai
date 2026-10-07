import { useEffect, useState } from 'react';
import { adminGet } from '../api.js';
import { Badge, ErrorState, Notice, PageHeader, Skeleton } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import { useToast } from '../toast.jsx';

const MODE_TONE = { live: 'success', test: 'warning', sandbox: 'warning' };

function CopyField({ label, value }) {
    const { success, error } = useToast();

    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            success('Copied', label);
        } catch {
            error('Could not copy', 'Select the text and copy it manually.');
        }
    }

    return (
        <div className="min-w-0">
            <p className="text-xs font-medium text-muted">{label}</p>
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-slate-900/10 bg-white/70 px-3 py-2">
                <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
                <button type="button" onClick={copy} className="shrink-0 cursor-pointer rounded-lg px-2 py-1 text-xs font-semibold text-accent-dark transition hover:bg-accent/10">Copy</button>
            </div>
        </div>
    );
}

function Status({ ok, yes = 'Connected', no = 'Not set up' }) {
    return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${ok ? 'bg-success/10 text-success ring-1 ring-inset ring-success/20' : 'bg-slate-900/[0.06] text-muted'}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${ok ? 'bg-success' : 'bg-slate-400'}`} />
            {ok ? yes : no}
        </span>
    );
}

function GatewayCard({ gateway }) {
    const isCod = gateway.id === 'cod';

    return (
        <article className="hover-lift flex flex-col rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
            <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                    <h3 className="font-display text-lg">{gateway.label}</h3>
                    <p className="mt-0.5 text-sm text-muted">{gateway.description}</p>
                </div>
                <Status ok={gateway.configured} yes={isCod ? 'Enabled' : 'Connected'} no={isCod ? 'Disabled' : 'Not set up'} />
            </div>

            {gateway.configured && !isCod && (
                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    <Badge tone={MODE_TONE[gateway.mode] ?? 'muted'}>{gateway.mode} mode</Badge>
                    {gateway.key_hint && <span className="text-muted">Key {gateway.key_hint}</span>}
                    {!gateway.webhook_secret_set && <Badge tone="warning">Webhook secret missing</Badge>}
                </div>
            )}

            {!isCod && (
                <div className="mt-4 space-y-3">
                    {gateway.webhook_url && <CopyField label="Webhook URL (paste into the provider dashboard)" value={gateway.webhook_url} />}
                    {!gateway.configured && (
                        <div className="rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-3 text-sm">
                            <p className="font-medium">Add to your server&apos;s <code className="rounded bg-white/70 px-1">.env</code>:</p>
                            <ul className="mt-1.5 space-y-0.5 font-mono text-xs">
                                {gateway.env.map((key) => (
                                    <li key={key} className={gateway.missing.includes(key) ? 'font-semibold text-danger' : 'text-muted'}>
                                        {key}{gateway.missing.includes(key) ? '  ← required' : ''}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}

            {isCod && (
                <div className="mt-4 rounded-2xl bg-white/50 p-3 text-xs text-muted">
                    Controlled by <code>{gateway.env.join(', ')}</code> in <code>.env</code> (limits are optional).
                </div>
            )}

            {gateway.docs_url && (
                <a href={gateway.docs_url} target="_blank" rel="noopener noreferrer" className="mt-auto inline-flex cursor-pointer items-center gap-1 pt-4 text-sm font-semibold text-accent-dark hover:underline">
                    Get your {gateway.label} keys <Icon name="arrow-right" className="h-4 w-4" />
                </a>
            )}
        </article>
    );
}

export default function AdminIntegrations() {
    const [data, setData] = useState(null);
    const [failed, setFailed] = useState(null);

    function load() {
        setFailed(null);
        return adminGet('/api/admin/integrations').then((response) => setData(response.data)).catch(setFailed);
    }

    useEffect(() => { load(); }, []);

    if (failed) return <ErrorState title="Could not load integrations" body={failed.message} onRetry={load} />;
    if (!data) return <div className="space-y-4"><Skeleton className="h-24 rounded-3xl" /><Skeleton className="h-72 rounded-3xl" /></div>;

    const wa = data.whatsapp;

    return (
        <div className="space-y-6">
            <PageHeader eyebrow="Settings" title="Payments & integrations" subtitle="See what's connected and what each service still needs. Secret keys live only in your server's .env file and are never shown here." />

            {data.using_test_gateway && (
                <Notice tone="warning" title="Online payments are not connected yet">
                    Only the built-in test gateway is active, so card and UPI payments won&apos;t take real money. Add keys for at least one gateway below before going live.
                </Notice>
            )}

            <section className="space-y-3">
                <h2 className="font-display text-xl">Payment gateways</h2>
                <div className="grid gap-4 md:grid-cols-2">
                    {data.payments.map((gateway) => <GatewayCard key={gateway.id} gateway={gateway} />)}
                </div>
                <p className="text-xs text-muted">After changing <code>.env</code>, restart your server (or run <code>php artisan config:clear</code>) so the new keys load. Prices are charged in <strong>{data.currency}</strong>.</p>
            </section>

            <section className="space-y-3">
                <h2 className="font-display text-xl">WhatsApp</h2>
                <article className="rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                    <div className="grid gap-5 md:grid-cols-2">
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="flex items-center gap-2 font-display text-lg"><span className="grid h-8 w-8 place-items-center rounded-xl bg-[#25D366]/15 text-[#128C7E]"><Icon name="chat-bubble" className="h-4 w-4" /></span> Click-to-chat</h3>
                                <Status ok yes="Always on" />
                            </div>
                            <p className="mt-2 text-sm text-muted">Admins can open a prefilled WhatsApp message from any order, and shoppers can share products. No account or fees needed.</p>
                            <p className="mt-3 text-sm">
                                Storefront chat button:{' '}
                                {wa.business_number ? <strong>+{wa.business_number}</strong> : <span className="text-muted">hidden until you set <code>WHATSAPP_BUSINESS_NUMBER</code></span>}
                            </p>
                        </div>
                        <div>
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="font-display text-lg">Automatic messages</h3>
                                <Status ok={wa.api_configured} yes="Cloud API connected" />
                            </div>
                            <p className="mt-2 text-sm text-muted">Send updates straight from the admin using Meta&apos;s WhatsApp Cloud API{wa.auto_notify ? ' — and automatically on every order status change.' : '.'}</p>
                            {!wa.api_configured && (
                                <div className="mt-3 rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-3 text-xs">
                                    <p className="font-medium">Add to <code>.env</code>:</p>
                                    <ul className="mt-1 space-y-0.5 font-mono">
                                        {['WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'].map((key) => <li key={key} className={wa.missing.includes(key) ? 'font-semibold text-danger' : 'text-muted'}>{key}{wa.missing.includes(key) ? '  ← required' : ''}</li>)}
                                        <li className="text-muted">WHATSAPP_AUTO_NOTIFY=true  (optional)</li>
                                    </ul>
                                </div>
                            )}
                            <p className="mt-3 text-xs text-muted">Meta only allows free-form messages within 24 hours of the customer&apos;s last message; otherwise an approved template is required.</p>
                        </div>
                    </div>
                </article>
            </section>

            <section className="space-y-3">
                <h2 className="font-display text-xl">Shopping assistant</h2>
                <article className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-line bg-paper p-5 shadow-soft md:p-6">
                    <div>
                        <h3 className="flex items-center gap-2 font-display text-lg"><Icon name="sparkles" className="h-5 w-5 text-accent" /> Built-in chat assistant</h3>
                        <p className="mt-1 max-w-2xl text-sm text-muted">Answers shipping, payment and order questions from live store data and recommends products. It runs on your own server: free, no API key, and no customer messages are sent to a third party.</p>
                    </div>
                    <Status ok yes="Running" />
                </article>
            </section>
        </div>
    );
}
