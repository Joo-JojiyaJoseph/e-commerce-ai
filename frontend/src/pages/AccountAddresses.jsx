import { useEffect, useState } from 'react';
import { createAddress, deleteAddress, friendlyError, getAddresses } from '../api.js';
import { Button, EmptyState, Input } from '../components/common.jsx';
import { useConfirm } from '../feedback.jsx';
import { useToast } from '../toast.jsx';
import { addressErrors, flattenErrors, hasErrors } from '../validate.js';
import { AccountShell } from './AccountShell.jsx';

const empty = {
    name: '',
    phone: '',
    line1: '',
    city: '',
    region: '',
    postal_code: '',
    country: 'IN',
    is_default: true,
};

export default function AccountAddresses() {
    const { success, error } = useToast();
    const confirm = useConfirm();
    const [addresses, setAddresses] = useState([]);
    const [form, setForm] = useState(empty);
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        getAddresses().then(({ data }) => setAddresses(data)).catch(() => setAddresses([]));
    }, []);

    function update(key, value) {
        setForm((current) => ({ ...current, [key]: value }));
        setErrors((current) => ({ ...current, [key]: undefined }));
    }

    return (
        <AccountShell title="Addresses">
            {addresses.length === 0 && (
                <EmptyState title="No saved addresses" body="Add one so checkout is faster next time." icon="map-pin" />
            )}
            <div className="mt-4 grid gap-4 md:grid-cols-2">
                {addresses.map((address) => (
                    <div key={address.id} className="rounded-xl border border-line bg-paper p-5 text-sm">
                        <p className="font-medium">{address.name}</p>
                        <p className="text-muted">{address.line1}, {address.city} {address.postal_code}</p>
                        <button
                            type="button"
                            className="mt-3 text-danger"
                            onClick={async () => {
                                const ok = await confirm({
                                    title: 'Remove address?',
                                    message: 'This address will be deleted from your account.',
                                    confirmLabel: 'Remove',
                                });
                                if (!ok) {
                                    return;
                                }
                                try {
                                    await deleteAddress(address.id);
                                    setAddresses((current) => current.filter((item) => item.id !== address.id));
                                    success('Address removed');
                                } catch (caught) {
                                    error('Could not remove address', friendlyError(caught));
                                }
                            }}
                        >
                            Remove
                        </button>
                    </div>
                ))}
            </div>
            <form
                noValidate
                className="mt-6 grid gap-3 rounded-xl border border-line bg-paper p-6 sm:grid-cols-2"
                onSubmit={async (event) => {
                    event.preventDefault();
                    const nextErrors = addressErrors(form, { includePhone: true });
                    if (hasErrors(nextErrors)) {
                        setErrors(nextErrors);
                        return;
                    }
                    setSaving(true);
                    setErrors({});
                    try {
                        const { data } = await createAddress({
                            ...form,
                            name: form.name.trim(),
                            country: form.country.trim().slice(0, 2).toUpperCase(),
                            phone: form.phone.trim() || null,
                        });
                        setAddresses((current) => [data, ...current]);
                        setForm(empty);
                        success('Address saved', 'Your address has been saved successfully.');
                    } catch (caught) {
                        error('Could not save address', friendlyError(caught));
                        setErrors(flattenErrors(caught.errors));
                    } finally {
                        setSaving(false);
                    }
                }}
            >
                <h2 className="font-display text-2xl sm:col-span-2">Add address</h2>
                <Input label="Name" autoComplete="name" maxLength={80} value={form.name} error={errors.name} required onChange={(event) => update('name', event.target.value)} />
                <Input type="tel" label="Phone" autoComplete="tel" inputMode="tel" maxLength={20} hint="10-digit Indian mobile if country is IN." value={form.phone} error={errors.phone} onChange={(event) => update('phone', event.target.value)} />
                <Input className="sm:col-span-2" label="Address" autoComplete="street-address" maxLength={255} value={form.line1} error={errors.line1} required onChange={(event) => update('line1', event.target.value)} />
                <Input label="City" autoComplete="address-level2" maxLength={120} value={form.city} error={errors.city} required onChange={(event) => update('city', event.target.value)} />
                <Input label="State" autoComplete="address-level1" maxLength={120} value={form.region} onChange={(event) => update('region', event.target.value)} />
                <Input label="PIN" autoComplete="postal-code" inputMode="numeric" maxLength={12} value={form.postal_code} error={errors.postal_code} required onChange={(event) => update('postal_code', event.target.value)} />
                <Input label="Country" autoComplete="country" maxLength={2} hint="Two-letter code, such as IN." value={form.country} error={errors.country} required onChange={(event) => update('country', event.target.value.toUpperCase())} />
                <Button className="sm:col-span-2" type="submit" loading={saving} loadingLabel="Saving…">Save address</Button>
            </form>
        </AccountShell>
    );
}
