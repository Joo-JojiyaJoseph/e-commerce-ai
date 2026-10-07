import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { askAssistant, money } from '../../api.js';
import { useStorefrontConfig } from '../../store/storefrontConfig.js';
import { Icon } from '../icons.jsx';

const GREETING = {
    id: 'welcome',
    from: 'bot',
    text: 'Hi! I can find products, track an order, or answer questions about shipping, payments and returns.',
    suggestions: ['Track my order', 'Shipping info', 'Payment options', 'What is on sale?'],
    products: [],
    actions: [],
};

let counter = 0;
const nextId = () => `m${(counter += 1)}`;

function BotAction({ action, onNavigate }) {
    const className = 'inline-flex cursor-pointer items-center gap-1 rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 text-xs font-semibold text-accent-dark transition hover:bg-accent/20';
    const internal = action.url?.startsWith('/');
    const safeExternal = /^https:\/\/wa\.me\//.test(action.url ?? '');

    if (internal) return <Link to={action.url} onClick={onNavigate} className={className}>{action.label}</Link>;
    if (safeExternal) return <a href={action.url} target="_blank" rel="noopener noreferrer" className={className}>{action.label}</a>;
    return null;
}

function MiniProduct({ product, onNavigate }) {
    return (
        <Link to={`/products/${product.slug}`} onClick={onNavigate} className="flex cursor-pointer items-center gap-3 rounded-2xl border border-white/70 bg-white/70 p-2 transition hover:-translate-y-0.5 hover:bg-white">
            <span className="h-14 w-12 shrink-0 overflow-hidden rounded-xl bg-accent/10">
                {product.image_url && <img src={product.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />}
            </span>
            <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold">{product.name}</span>
                <span className="text-xs text-muted">
                    {product.price ? money(product.price) : ''}
                    {product.compare_at_price && <s className="ml-1.5">{money(product.compare_at_price)}</s>}
                </span>
            </span>
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-muted" />
        </Link>
    );
}

export default function ChatWidget() {
    const config = useStorefrontConfig();
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([GREETING]);
    const [text, setText] = useState('');
    const [busy, setBusy] = useState(false);
    const listRef = useRef(null);
    const inputRef = useRef(null);
    const abortRef = useRef(null);

    useEffect(() => {
        if (!open) return undefined;
        inputRef.current?.focus();
        const onKey = (event) => event.key === 'Escape' && setOpen(false);
        document.addEventListener('keydown', onKey);
        return () => document.removeEventListener('keydown', onKey);
    }, [open]);

    useEffect(() => {
        listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
    }, [messages, busy, open]);

    useEffect(() => () => abortRef.current?.abort(), []);

    async function send(raw) {
        const message = raw.trim();
        if (!message || busy) return;

        setMessages((current) => [...current, { id: nextId(), from: 'user', text: message }]);
        setText('');
        setBusy(true);
        abortRef.current?.abort();
        abortRef.current = new AbortController();

        try {
            const { data } = await askAssistant(message.slice(0, 300), { signal: abortRef.current.signal });
            setMessages((current) => [...current, { id: nextId(), from: 'bot', text: data.reply, products: data.products ?? [], actions: data.actions ?? [], suggestions: data.suggestions ?? [] }]);
        } catch (caught) {
            if (caught.name === 'AbortError') return;
            const limited = caught.status === 429;
            setMessages((current) => [...current, {
                id: nextId(),
                from: 'bot',
                text: limited ? "You're sending messages quickly. Please wait a moment and try again." : "Sorry, I couldn't reach the store just now. Please try again in a moment.",
                products: [],
                actions: [],
                suggestions: [],
            }]);
        } finally {
            setBusy(false);
        }
    }

    const lastBot = [...messages].reverse().find((message) => message.from === 'bot');
    const whatsapp = config.whatsapp_number;

    return (
        <>
            <div className="no-print fixed bottom-24 right-4 z-40 flex flex-col items-end gap-3 lg:bottom-6 lg:right-6">
                {whatsapp && !open && (
                    <a
                        href={`https://wa.me/${whatsapp}?text=${encodeURIComponent('Hi! I need some help.')}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Chat with us on WhatsApp"
                        className="grid h-12 w-12 cursor-pointer place-items-center rounded-full bg-[#25D366] text-white shadow-[0_12px_28px_-6px_rgb(37_211_102_/_0.75)] transition duration-300 hover:-translate-y-1 hover:scale-105 active:scale-95"
                    >
                        <Icon name="chat-bubble" className="h-6 w-6" />
                    </a>
                )}
                <button
                    type="button"
                    aria-label={open ? 'Close assistant' : 'Open shopping assistant'}
                    aria-expanded={open}
                    onClick={() => setOpen((value) => !value)}
                    className="btn-shine relative grid h-14 w-14 cursor-pointer place-items-center rounded-full bg-accent text-white shadow-[0_14px_32px_-6px_rgb(109_74_255_/_0.75)] transition duration-300 hover:-translate-y-1 hover:scale-105 active:scale-95"
                >
                    <Icon name={open ? 'close' : 'sparkles'} className="h-6 w-6" />
                    {!open && <span className="absolute right-0.5 top-0.5 h-3 w-3 rounded-full bg-emerald-400 ring-2 ring-white" />}
                </button>
            </div>

            {open && (
                <section
                    role="dialog"
                    aria-label="Shopping assistant"
                    className="modal-enter glass-strong fixed inset-x-3 bottom-24 z-50 flex max-h-[min(36rem,calc(100dvh-8rem))] flex-col overflow-hidden rounded-3xl border border-white/70 shadow-[0_30px_80px_-10px_rgb(40_30_110_/_0.45)] sm:inset-x-auto sm:right-6 sm:w-[24rem] lg:bottom-24"
                >
                    <header className="flex items-center gap-3 border-b border-slate-900/[0.06] bg-accent px-4 py-3 text-white">
                        <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur"><Icon name="sparkles" className="h-5 w-5" /></span>
                        <div className="min-w-0 flex-1">
                            <p className="font-display text-base font-bold leading-tight">Shopping assistant</p>
                            <p className="flex items-center gap-1.5 text-xs text-white/80"><span className="h-1.5 w-1.5 rounded-full bg-emerald-300" /> Online · replies instantly</p>
                        </div>
                        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="grid h-8 w-8 cursor-pointer place-items-center rounded-full transition hover:bg-white/20">
                            <Icon name="close" className="h-4 w-4" />
                        </button>
                    </header>

                    <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4" aria-live="polite">
                        {messages.map((message) => (
                            <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`reveal max-w-[88%] space-y-2 ${message.from === 'user' ? '' : 'w-full'}`}>
                                    <p className={`whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.from === 'user' ? 'ml-auto w-fit bg-accent text-white' : 'w-fit border border-white/70 bg-white/80'}`}>{message.text}</p>
                                    {message.products?.length > 0 && (
                                        <div className="space-y-2">
                                            {message.products.map((product) => <MiniProduct key={product.id} product={product} onNavigate={() => setOpen(false)} />)}
                                        </div>
                                    )}
                                    {message.actions?.length > 0 && (
                                        <div className="flex flex-wrap gap-2">
                                            {message.actions.map((action) => <BotAction key={action.label} action={action} onNavigate={() => setOpen(false)} />)}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {busy && (
                            <div className="flex" role="status" aria-label="Assistant is typing">
                                <span className="inline-flex gap-1 rounded-2xl border border-white/70 bg-white/80 px-4 py-3">
                                    {[0, 150, 300].map((delay) => <span key={delay} className="h-2 w-2 animate-bounce rounded-full bg-accent/60" style={{ animationDelay: `${delay}ms` }} />)}
                                </span>
                            </div>
                        )}
                    </div>

                    {lastBot?.suggestions?.length > 0 && !busy && (
                        <div className="flex gap-2 overflow-x-auto px-4 pb-2">
                            {lastBot.suggestions.map((suggestion) => (
                                <button key={suggestion} type="button" onClick={() => send(suggestion)} className="shrink-0 cursor-pointer rounded-full border border-accent/25 bg-white/70 px-3 py-1.5 text-xs font-semibold text-accent-dark transition hover:bg-accent/10">
                                    {suggestion}
                                </button>
                            ))}
                        </div>
                    )}

                    <form onSubmit={(event) => { event.preventDefault(); send(text); }} className="flex items-center gap-2 border-t border-slate-900/[0.06] p-3">
                        <input
                            ref={inputRef}
                            value={text}
                            onChange={(event) => setText(event.target.value)}
                            maxLength={300}
                            placeholder="Ask about products, orders, shipping…"
                            aria-label="Message"
                            className="min-w-0 flex-1 rounded-full border border-slate-900/10 bg-white px-4 py-2.5 text-sm outline-none"
                        />
                        <button type="submit" disabled={busy || !text.trim()} aria-label="Send message" className="grid h-10 w-10 shrink-0 cursor-pointer place-items-center rounded-full bg-accent text-white shadow-[0_8px_18px_-4px_rgb(109_74_255_/_0.7)] transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-40">
                            <Icon name="send" className="h-4 w-4" />
                        </button>
                    </form>
                </section>
            )}
        </>
    );
}
