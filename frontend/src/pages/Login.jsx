import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Input } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import { safeNextPath } from '../format.js';
import { useCatalog } from '../store/catalog.jsx';
import { useToast } from '../toast.jsx';
import { email, hasErrors, pick, required } from '../validate.js';

const PERKS = [
    ['lock-closed', 'Secure sign-in', 'Your password stays on the server.'],
    ['clipboard-document-list', 'Track orders', 'See status from bag to delivery.'],
    ['truck', 'Faster checkout', 'Saved addresses and payment options.'],
];

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [params] = useSearchParams();
    const { home } = useCatalog();
    const { success } = useToast();
    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [show, setShow] = useState(false);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);
    const image = home?.new_arrivals?.[0]?.image_url;
    const nextPath = safeNextPath(params.get('next'));
    const checkoutNext = nextPath.startsWith('/checkout');

    function update(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
        setError(null);
    }

    async function onSubmit(event) {
        event.preventDefault();
        const nextErrors = pick({
            email: email(form.email),
            password: required(form.password, 'Password'),
        });

        if (hasErrors(nextErrors)) {
            setErrors(nextErrors);
            return;
        }

        setLoading(true);
        setError(null);
        setErrors({});

        try {
            await login({ email: form.email.trim().toLowerCase(), password: form.password });
            success('Signed in', checkoutNext ? 'Continue to checkout when you are ready.' : 'Welcome back.');
            navigate(nextPath);
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Those details did not match. Check your email and password.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="grid overflow-hidden rounded-[2rem] border border-line bg-paper shadow-[0_1px_0_rgb(255_255_255_/_0.9)_inset,0_40px_90px_-24px_rgb(76_56_180_/_0.4)] lg:grid-cols-2">
            <form noValidate onSubmit={onSubmit} className="flex flex-col justify-center space-y-5 p-6 sm:p-10 lg:p-12">
                <div>
                    <p className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/55 px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-accent-dark backdrop-blur"><span className="h-1.5 w-1.5 rounded-full bg-accent" />Welcome back</p>
                    <h1 className="mt-3 font-display text-4xl font-extrabold leading-tight">Sign in to <span className="text-gradient inline-block pr-[0.06em]">Webfolks</span></h1>
                    <p className="mt-2 text-sm leading-6 text-muted">
                        {checkoutNext
                            ? 'Sign in to use a saved address and finish this order.'
                            : 'Pick up your bag, wishlist, and orders from any device.'}
                    </p>
                </div>

                {checkoutNext && (
                    <p className="rounded-xl border border-accent/20 bg-accent/[0.06] px-4 py-3 text-sm">
                        You were heading to checkout. After sign-in we’ll take you back there.
                    </p>
                )}

                {error && (
                    <p className="rounded-xl border border-danger/20 bg-red-50 px-4 py-3 text-sm text-danger" role="alert">
                        {error}
                    </p>
                )}

                <Input
                    type="email"
                    label="Email"
                    autoComplete="email"
                    inputMode="email"
                    maxLength={255}
                    placeholder="you@example.com"
                    value={form.email}
                    error={errors.email}
                    required
                    onChange={(event) => update('email', event.target.value)}
                />
                <div className="relative">
                    <Input
                        type={show ? 'text' : 'password'}
                        label="Password"
                        autoComplete="current-password"
                        maxLength={72}
                        value={form.password}
                        error={errors.password}
                        required
                        onChange={(event) => update('password', event.target.value)}
                    />
                    <button
                        type="button"
                        className="absolute right-3 top-[2.35rem] inline-flex cursor-pointer items-center gap-1 text-xs text-muted hover:text-ink"
                        onClick={() => setShow((value) => !value)}
                    >
                        <Icon name="eye" className="h-4 w-4" />
                        {show ? 'Hide' : 'Show'}
                    </button>
                </div>

                <div className="flex items-center justify-between text-sm">
                    <Link to="/forgot-password" className="cursor-pointer text-muted underline hover:text-ink">Forgot password?</Link>
                    <Link to="/shop" className="cursor-pointer text-muted hover:text-ink">Continue shopping</Link>
                </div>

                <Button type="submit" loading={loading} loadingLabel="Signing in…" className="w-full rounded-xl py-3" variant="accent">
                    <Icon name="arrow-right-on-rectangle" className="h-4 w-4" /> Sign in
                </Button>

                <p className="text-center text-sm text-muted">
                    New here?{' '}
                    <Link to="/register" className="cursor-pointer font-medium text-ink underline">Create a free account</Link>
                </p>
            </form>

            <aside className="relative hidden min-h-[28rem] overflow-hidden bg-forest text-paper lg:block">
                {image ? (
                    <img src={image} alt="" className="absolute inset-0 h-full w-full object-cover" />
                ) : null}
                <div className="absolute inset-0 bg-gradient-to-t from-forest via-forest/70 to-forest/20" />
                <div className="orb float-slow -left-10 top-10 h-64 w-64 bg-accent/60" />
                <div className="orb float-slower bottom-10 right-0 h-56 w-56 bg-fuchsia-500/40" />
                <div className="relative flex h-full flex-col justify-end gap-6 p-10">
                    <p className="font-display text-3xl leading-tight">A quieter store for linen, knitwear, and everyday bags.</p>
                    <ul className="space-y-3 text-sm text-white/80">
                        {PERKS.map(([icon, title, body]) => (
                            <li key={title} className="flex gap-3">
                                <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/20 bg-white/10 backdrop-blur-xl">
                                    <Icon name={icon} className="h-4 w-4" />
                                </span>
                                <span>
                                    <span className="block font-medium text-paper">{title}</span>
                                    {body}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
            </aside>
        </div>
    );
}
