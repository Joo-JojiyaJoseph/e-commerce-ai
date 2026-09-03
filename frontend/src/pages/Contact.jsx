import { useState } from 'react';
import { Link } from 'react-router-dom';
import { sendContact } from '../api.js';
import { Button, Input, Textarea } from '../components/common.jsx';
import { Icon } from '../components/icons.jsx';
import { email, hasErrors, maxLen, minLen, personName, phone, pick, required, flattenErrors } from '../validate.js';

const empty = { name: '', email: '', phone: '', subject: '', message: '', website: '' };

export default function Contact() {
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState({});
    const [status, setStatus] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(false);

    function update(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    }

    async function onSubmit(event) {
        event.preventDefault();
        const nextErrors = pick({
            name: personName(form.name),
            email: email(form.email),
            phone: phone(form.phone),
            subject: required(form.subject, 'Subject') || maxLen(form.subject, 180, 'Subject'),
            message: required(form.message, 'Message') || minLen(form.message, 10, 'Message') || maxLen(form.message, 4000, 'Message'),
        });

        if (hasErrors(nextErrors)) {
            setErrors(nextErrors);
            return;
        }

        setLoading(true);
        setError(null);
        setStatus(null);

        try {
            const payload = {
                name: form.name.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),
                subject: form.subject.trim(),
                message: form.message.trim(),
            };

            if (form.website.trim()) {
                payload.website = form.website;
            }

            const { message } = await sendContact(payload);
            setStatus(message);
            setForm(empty);
            setErrors({});
        } catch (caught) {
            setError(caught.message);
            setErrors(flattenErrors(caught.errors));
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="grid items-start gap-10 lg:grid-cols-2">
            <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-muted">Contact</p>
                <h1 className="mt-2 font-display text-5xl leading-tight">Write to the floor.</h1>
                <p className="mt-4 max-w-md text-sm leading-6 text-muted">
                    Order questions, fit, or delivery. Messages go to the store mailbox and are not a live chat.
                </p>
                <dl className="mt-8 space-y-4 text-sm">
                    <div className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-4">
                        <Icon name="envelope" className="mt-0.5 h-5 w-5 text-muted" />
                        <div>
                            <dt className="text-muted">Email</dt>
                            <dd>hello@example.com</dd>
                        </div>
                    </div>
                    <div className="flex items-start gap-3 rounded-2xl border border-line bg-paper p-4">
                        <Icon name="map-pin" className="mt-0.5 h-5 w-5 text-muted" />
                        <div>
                            <dt className="text-muted">Hours</dt>
                            <dd>Monday–Friday, 10:00–18:00 IST</dd>
                        </div>
                    </div>
                </dl>
            </div>
            <form noValidate onSubmit={onSubmit} className="space-y-4 rounded-3xl border border-line bg-paper p-6 shadow-soft md:p-8">
                <div>
                    <h2 className="font-display text-2xl">Send a message</h2>
                    <p className="mt-1 text-sm text-muted">We’ll reply by email. Don’t include card numbers or passwords.</p>
                </div>
                {error && <p className="text-sm text-danger" role="alert">{error}</p>}
                {status && <p className="text-sm text-success" role="status">{status}</p>}
                <div className="hidden" aria-hidden="true">
                    <Input label="Website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(event) => update('website', event.target.value)} />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                    <Input label="Name" autoComplete="name" maxLength={80} value={form.name} error={errors.name} required onChange={(event) => update('name', event.target.value)} />
                    <Input type="email" label="Email" autoComplete="email" maxLength={255} value={form.email} error={errors.email} required onChange={(event) => update('email', event.target.value)} />
                </div>
                <Input label="Phone (optional)" autoComplete="tel" inputMode="tel" maxLength={20} value={form.phone} error={errors.phone} onChange={(event) => update('phone', event.target.value)} />
                <Input label="Subject" maxLength={180} value={form.subject} error={errors.subject} required onChange={(event) => update('subject', event.target.value)} />
                <Textarea label="Message" required maxLength={4000} hint="At least 10 characters." value={form.message} error={errors.message} onChange={(event) => update('message', event.target.value)} />
                <Button type="submit" loading={loading} className="w-full rounded-full sm:w-auto">
                    <Icon name="envelope" className="h-4 w-4" /> Send message
                </Button>
            </form>
        </div>
    );
}
