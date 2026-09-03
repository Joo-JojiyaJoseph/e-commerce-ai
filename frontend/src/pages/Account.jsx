import { useState } from 'react';
import { changePassword, friendlyError, updateProfile } from '../api.js';
import { useAuth } from '../auth.jsx';
import { Button, Input } from '../components/common.jsx';
import { useToast } from '../toast.jsx';
import { confirmPassword, hasErrors, password, personName, pick, required } from '../validate.js';
import { AccountShell } from './AccountShell.jsx';

export default function Account() {
    const { user, signOut, setUser } = useAuth();
    const { success, error } = useToast();
    const [name, setName] = useState(user?.name ?? '');
    const [profileErrors, setProfileErrors] = useState({});
    const [saving, setSaving] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ current_password: '', password: '', password_confirmation: '' });
    const [passwordErrors, setPasswordErrors] = useState({});
    const [savingPassword, setSavingPassword] = useState(false);

    return (
        <AccountShell title="Profile">
            <div className="space-y-6">
                <div className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
                    <h2 className="font-medium">Account details</h2>
                    <p className="mt-1 text-sm text-muted">{user?.email}</p>
                    <form
                        noValidate
                        className="mt-4 max-w-md space-y-3"
                        onSubmit={async (event) => {
                            event.preventDefault();
                            const nextErrors = pick({ name: personName(name) });
                            if (hasErrors(nextErrors)) {
                                setProfileErrors(nextErrors);
                                return;
                            }
                            setSaving(true);
                            setProfileErrors({});
                            try {
                                const { data } = await updateProfile({ name: name.trim() });
                                setUser(data);
                                success('Profile updated', 'Your profile has been updated successfully.');
                            } catch (caught) {
                                error('Could not save profile', friendlyError(caught));
                            } finally {
                                setSaving(false);
                            }
                        }}
                    >
                        <Input label="Name" autoComplete="name" maxLength={80} value={name} error={profileErrors.name} required onChange={(event) => setName(event.target.value)} />
                        <Button type="submit" loading={saving} loadingLabel="Saving…">Save</Button>
                    </form>
                </div>
                <div className="rounded-2xl border border-line bg-paper p-6 shadow-soft">
                    <h2 className="font-medium">Reset password</h2>
                    <p className="mt-1 text-sm text-muted">Enter your current password, then choose a new one.</p>
                    <form
                        noValidate
                        className="mt-4 max-w-md space-y-3"
                        onSubmit={async (event) => {
                            event.preventDefault();
                            const nextErrors = pick({
                                current_password: required(passwordForm.current_password, 'Current password'),
                                password: password(passwordForm.password),
                                password_confirmation: confirmPassword(passwordForm.password_confirmation, passwordForm.password),
                            });
                            if (hasErrors(nextErrors)) {
                                setPasswordErrors(nextErrors);
                                return;
                            }
                            setSavingPassword(true);
                            setPasswordErrors({});
                            try {
                                await changePassword(passwordForm);
                                setPasswordForm({ current_password: '', password: '', password_confirmation: '' });
                                success('Password updated', 'Your password has been updated successfully.');
                            } catch (caught) {
                                error('Could not update password', friendlyError(caught));
                            } finally {
                                setSavingPassword(false);
                            }
                        }}
                    >
                        <Input type="password" label="Current password" autoComplete="current-password" maxLength={72} value={passwordForm.current_password} error={passwordErrors.current_password} required onChange={(event) => setPasswordForm((current) => ({ ...current, current_password: event.target.value }))} />
                        <Input type="password" label="New password" autoComplete="new-password" maxLength={72} hint="At least 8 characters." value={passwordForm.password} error={passwordErrors.password} required onChange={(event) => setPasswordForm((current) => ({ ...current, password: event.target.value }))} />
                        <Input type="password" label="Confirm new password" autoComplete="new-password" maxLength={72} value={passwordForm.password_confirmation} error={passwordErrors.password_confirmation} required onChange={(event) => setPasswordForm((current) => ({ ...current, password_confirmation: event.target.value }))} />
                        <Button type="submit" loading={savingPassword} loadingLabel="Updating…">Update password</Button>
                    </form>
                </div>
                <button type="button" className="text-sm text-danger" onClick={signOut}>Sign out</button>
            </div>
        </AccountShell>
    );
}
