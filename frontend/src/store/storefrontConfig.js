import { useEffect, useState } from 'react';
import { getStorefrontConfig } from '../api.js';

let pending = null;

/** Public store settings (WhatsApp number etc.), fetched once and shared. Fails closed: features stay hidden. */
export function useStorefrontConfig() {
    const [config, setConfig] = useState({ whatsapp_number: null, assistant: false });

    useEffect(() => {
        let cancelled = false;
        pending ??= getStorefrontConfig().then(({ data }) => data).catch(() => {
            pending = null;
            return null;
        });
        pending.then((data) => data && !cancelled && setConfig(data));
        return () => { cancelled = true; };
    }, []);

    return config;
}
