import { Link } from 'react-router-dom';
import { relativeTime } from '../../format.js';
import { Icon } from '../icons.jsx';

export default function NotificationItem({ item, onRead, onDelete, compact = false }) {
    const unread = !item.is_read;

    return (
        <article
            className={`flex gap-3 border-l-4 px-4 py-3 transition ${
                unread
                    ? 'border-accent bg-accent/[0.06]'
                    : 'border-transparent bg-paper'
            } ${compact ? '' : 'rounded-xl border border-line border-l-4'}`}
        >
            <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${unread ? 'bg-accent' : 'bg-transparent'}`} aria-hidden />
            <Link
                to={item.action_url || '/notifications'}
                className="min-w-0 flex-1"
                onClick={() => {
                    if (unread) {
                        onRead?.(item);
                    }
                }}
            >
                <p className={`text-sm ${unread ? 'font-semibold text-ink' : 'font-medium text-ink/80'}`}>{item.title}</p>
                <p className={`mt-0.5 line-clamp-2 text-sm ${unread ? 'text-ink/80' : 'text-muted'}`}>{item.message}</p>
                <p className="mt-1 text-[11px] text-muted">{relativeTime(item.created_at)}</p>
            </Link>
            {onDelete && (
                <button
                    type="button"
                    className="self-start rounded-md p-1 text-muted hover:text-danger"
                    aria-label="Delete notification"
                    title="Delete"
                    onClick={() => onDelete(item)}
                >
                    <Icon name="trash" className="h-4 w-4" />
                </button>
            )}
        </article>
    );
}
