export function loadScript(src) {
    return new Promise((resolve, reject) => {
        const existing = document.querySelector(`script[src="${src}"]`);

        if (existing) {
            resolve();
            return;
        }

        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Unable to load ${src}`));
        document.body.appendChild(script);
    });
}

export async function completeHostedPayment(order, payment) {
    if (!payment || payment.gateway === 'cod' || payment.gateway === 'fake') {
        return { completed: order.payment_status === 'completed' || order.payment_gateway === 'cod', order };
    }

    if (payment.mode === 'redirect' && payment.checkout_url) {
        window.location.assign(payment.checkout_url);
        return { redirected: true, order };
    }

    if (payment.gateway === 'razorpay') {
        await loadScript('https://checkout.razorpay.com/v1/checkout.js');

        if (!window.Razorpay) {
            throw new Error('Razorpay checkout could not be loaded.');
        }

        const response = await new Promise((resolve, reject) => {
            const checkout = new window.Razorpay({
                key: payment.key,
                amount: payment.amount,
                currency: payment.currency,
                name: payment.name,
                description: payment.description,
                order_id: payment.order_id,
                prefill: payment.prefill,
                handler: resolve,
                modal: {
                    ondismiss: () => reject(new Error('Payment was cancelled.')),
                },
            });

            checkout.open();
        });

        return { razorpay: response, order };
    }

    return { order };
}
