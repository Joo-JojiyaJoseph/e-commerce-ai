import { Link } from 'react-router-dom';
import { Button, EmptyState } from '../components/common.jsx';

export default function NotFound() {
    return (
        <EmptyState
            title="This page is not on the floor."
            body="The link may be old. Search or return to shop."
            action={<Button as={Link} to="/shop">Go to shop</Button>}
        />
    );
}
