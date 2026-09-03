import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Input } from '../components/common.jsx';
import { useToast } from '../toast.jsx';
import { confirmPassword, email, flattenErrors, hasErrors, password, personName, pick } from '../validate.js';

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const { success } = useToast();
    const [form, setForm] = useState({ name: '', email: '', password: '', password_confirmation: '' });
    const [errors, setErrors] = useState({});
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(event) {
        event.preventDefault();
        const nextErrors = pick({
            name: personName(form.name),
            email: email(form.email),
            password: password(form.password),
            password_confirmation: confirmPassword(form.password_confirmation, form.password),
        });

        if (hasErrors(nextErrors)) {
            setErrors(nextErrors);
            return;
        }

        setLoading(true);
        setError(null);
        setErrors({});

        try {
            await register({
                ...form,
                name: form.name.trim(),
                email: form.email.trim().toLowerCase(),
            });
            success('Account created', 'You are signed in and ready to shop.');
            navigate('/account');
        } catch (caught) {
            setError(caught instanceof ApiError ? caught.message : 'Unable to create the account.');
            setErrors(flattenErrors(caught.errors));
        } finally {
            setLoading(false);
        }
    }

    return (
        <form noValidate onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 rounded-3xl border border-line bg-paper p-8 shadow-soft">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Account</p>
            <h1 className="font-display text-4xl">Create account</h1>
            {error && <p className="text-sm text-danger" role="alert">{error}</p>}
            <Input label="Full name" autoComplete="name" maxLength={80} value={form.name} error={errors.name} required onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} />
            <Input type="email" label="Email" autoComplete="email" maxLength={255} value={form.email} error={errors.email} required onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
            <Input type="password" label="Password" autoComplete="new-password" maxLength={72} hint="At least 8 characters." value={form.password} error={errors.password} required onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))} />
            <Input type="password" label="Confirm password" autoComplete="new-password" maxLength={72} value={form.password_confirmation} error={errors.password_confirmation} required onChange={(event) => setForm((current) => ({ ...current, password_confirmation: event.target.value }))} />
            <Button type="submit" loading={loading} loadingLabel="Creating account…" className="w-full rounded-full">Create account</Button>
            <Link to="/login" className="block text-sm text-muted underline">Already have an account?</Link>
        </form>
    );
}
