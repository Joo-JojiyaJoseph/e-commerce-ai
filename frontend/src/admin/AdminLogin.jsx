import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ApiError } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Input } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import { email, hasErrors, pick, required } from '../validate.js';

export default function AdminLogin() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [form, setForm] = useState({ email: '', password: '' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

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
            const user = await login({
                email: form.email.trim().toLowerCase(),
                password: form.password,
            });

            if (!user.roles?.includes('admin')) {
                setError('This account is not an administrator.');
                return;
            }

            navigate('/admin');
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Unable to sign in.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="admin-app relative flex min-h-screen items-center justify-center overflow-hidden px-4">
            <div className="orb float-slow left-[10%] top-[15%] h-72 w-72 bg-accent/50" />
            <div className="orb float-slower bottom-[10%] right-[12%] h-72 w-72 bg-fuchsia-400/40" />
            <form noValidate onSubmit={onSubmit} className="glass reveal relative w-full max-w-md space-y-4 rounded-[2rem] border border-white/70 p-8 shadow-[0_1px_0_rgb(255_255_255_/_0.9)_inset,0_40px_90px_-20px_rgb(76_56_180_/_0.45)] sm:p-10">
                <span className="grid h-12 w-12 place-items-center rounded-2xl bg-accent font-display text-xl font-extrabold text-white shadow-[0_12px_24px_-6px_rgb(109_74_255_/_0.7)]">W</span>
                <h1 className="font-display text-3xl font-extrabold">Admin <span className="text-gradient inline-block pr-[0.06em]">sign in</span></h1>
                <p className="text-sm text-muted">Use your store administrator account.</p>
                {error && <p className="text-sm text-danger" role="alert">{error}</p>}
                <Input type="email" label="Email" autoComplete="username" maxLength={255} placeholder="admin@webfolks.test" value={form.email} error={errors.email} required onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                <Input type="password" label="Password" autoComplete="current-password" maxLength={72} value={form.password} error={errors.password} required onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
                <Button type="submit" variant="accent" loading={loading} loadingLabel="Signing in…" className="w-full rounded-xl py-3">
                    <Icon name="lock-closed" className="h-4 w-4" /> Continue
                </Button>
            </form>
        </div>
    );
}
