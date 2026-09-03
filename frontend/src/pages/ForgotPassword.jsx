import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPassword } from '../api.js';
import { Button, Input } from '../components/common.jsx';
import { email } from '../validate.js';

export default function ForgotPassword() {
    const [value, setValue] = useState('');
    const [error, setError] = useState(null);
    const [message, setMessage] = useState(null);
    const [loading, setLoading] = useState(false);

    async function onSubmit(event) {
        event.preventDefault();
        const invalid = email(value);
        if (invalid) {
            setError(invalid);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const { message: next } = await forgotPassword(value.trim().toLowerCase());
            setMessage(next);
        } catch (caught) {
            setError(caught.message);
        } finally {
            setLoading(false);
        }
    }

    return (
        <form noValidate onSubmit={onSubmit} className="mx-auto max-w-md space-y-4 rounded-3xl border border-line bg-paper p-8 shadow-soft">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted">Account</p>
            <h1 className="font-display text-4xl">Reset password</h1>
            <Input type="email" label="Email" autoComplete="email" maxLength={255} value={value} error={error && !message ? error : undefined} required onChange={(event) => setValue(event.target.value)} />
            <Button type="submit" loading={loading} className="w-full rounded-full">Send reset link</Button>
            {message && <p className="text-sm text-success" role="status">{message}</p>}
            <Link to="/login" className="text-sm underline">Back to sign in</Link>
        </form>
    );
}
