import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPassword } from '../api.js';
import { Button, Input } from '../components/common.jsx';
import { confirmPassword, email, flattenErrors, hasErrors, password, pick } from '../validate.js';

export default function ResetPassword() {
    const [params] = useSearchParams();
    const [form, setForm] = useState({
        email: params.get('email') ?? '',
        token: params.get('token') ?? '',
        password: '',
        password_confirmation: '',
    });
    const [errors, setErrors] = useState({});
    const [message, setMessage] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(event) {
        event.preventDefault();
        const nextErrors = pick({
            email: email(form.email),
            password: password(form.password),
            password_confirmation: confirmPassword(form.password_confirmation, form.password),
        });

        if (hasErrors(nextErrors) || !form.token) {
            setErrors(nextErrors);
            setError(form.token ? null : 'This reset link is missing a token. Request a new email.');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { message: next } = await resetPassword({
                ...form,
                email: form.email.trim().toLowerCase(),
            });
            setMessage(next);
        } catch (caught) {
            setError(caught.message);
            setErrors(flattenErrors(caught.errors));
        } finally {
            setLoading(false);
        }
    }

    return (
        <form noValidate onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 rounded-3xl border border-line bg-paper p-8 shadow-soft">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Account</p>
            <h1 className="font-display text-4xl">New password</h1>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            {message && <p className="text-sm text-success" role="status">{message}</p>}
            <Input type="email" label="Email" autoComplete="email" maxLength={255} value={form.email} error={errors.email} required onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <Input type="password" label="New password" autoComplete="new-password" maxLength={72} hint="At least 8 characters." value={form.password} error={errors.password} required onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            <Input type="password" label="Confirm password" autoComplete="new-password" maxLength={72} value={form.password_confirmation} error={errors.password_confirmation} required onChange={(event) => setForm((current) => ({ ...current, password_confirmation: event.target.value }))} />
            <Button type="submit" loading={loading} className="w-full rounded-full">Update password</Button>
            <Link to="/login" className="text-sm underline">Sign in</Link>
        </form>
    );
}
