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
        <div className="admin-app flex min-h-screen items-center justify-center bg-canvas px-4">
            <form noValidate onSubmit={onSubmit} className="w-full max-w-md space-y-4 rounded-3xl border border-line bg-paper p-8 shadow-soft">
                <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Webfolks</p>
                <h1 className="font-display text-3xl">Admin sign in</h1>
                <p className="text-sm text-muted">Use your store administrator account.</p>
                {error && <p className="text-sm text-danger" role="alert">{error}</p>}
                <Input type="email" label="Email" autoComplete="username" maxLength={255} placeholder="admin@webfolks.test" value={form.email} error={errors.email} required onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
                <Input type="password" label="Password" autoComplete="current-password" maxLength={72} value={form.password} error={errors.password} required onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
                <Button type="submit" loading={loading} loadingLabel="Signing in…" className="w-full rounded-full">
                    <Icon name="lock-closed" className="h-4 w-4" /> Continue
                </Button>
            </form>
        </div>
    );
}
