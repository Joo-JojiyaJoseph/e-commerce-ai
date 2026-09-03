import { Link } from 'react-router-dom';
import { AccountShell } from './AccountShell.jsx';

export default function AccountReviews() {
    return (
        <AccountShell title="Reviews">
            <p className="text-sm leading-6 text-muted">
                Reviews are written on each product page after you sign in. Verified purchase is marked when the product appears on a paid order.
            </p>
            <Link to="/shop" className="mt-4 inline-block text-sm underline">Go to shop</Link>
        </AccountShell>
    );
}

export function AccountSecurity() {
    return (
        <AccountShell title="Security">
            <p className="text-sm leading-6 text-muted">
                Change your password from your profile. You can also use the email reset link if you cannot sign in.
            </p>
            <div className="mt-4 flex gap-4 text-sm">
                <Link to="/account" className="underline">Reset password on profile</Link>
                <Link to="/forgot-password" className="underline">Email reset link</Link>
            </div>
        </AccountShell>
    );
}
