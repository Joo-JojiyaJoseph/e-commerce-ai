<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#eef0ff">
    <title>{{ config('app.name', 'Laravel') }} · API</title>

    <link rel="icon" href="/favicon.ico" sizes="any">
    <link rel="icon" href="/favicon.svg" type="image/svg+xml">
    <link rel="apple-touch-icon" href="/apple-touch-icon.png">
    <link rel="preconnect" href="https://fonts.bunny.net">
    <link href="https://fonts.bunny.net/css?family=inter:400,500,600|plus-jakarta-sans:600,700,800" rel="stylesheet">

    <style>
        :root {
            --ink: #0b1020;
            --muted: #566079;
            --accent: #6d4aff;
            --glass: rgb(255 255 255 / .58);
            --glass-strong: rgb(255 255 255 / .8);
            --border: rgb(255 255 255 / .75);
            --brand: linear-gradient(135deg, #6d4aff, #8b5cf6 45%, #d946ef);
            --ease: cubic-bezier(.22, 1, .36, 1);
        }
        *, *::before, *::after { box-sizing: border-box; margin: 0; }
        html { -webkit-text-size-adjust: 100%; }
        body {
            min-height: 100vh;
            font-family: 'Inter', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', sans-serif;
            color: var(--ink);
            background: #eef0ff;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }
        h1, h2, h3 { font-family: 'Plus Jakarta Sans', 'Inter', sans-serif; letter-spacing: -.03em; }

        /* aurora */
        .aurora { position: fixed; inset: -25%; z-index: -1; pointer-events: none; filter: blur(20px);
            background:
                radial-gradient(38% 38% at 14% 18%, rgb(124 92 255 / .45), transparent 70%),
                radial-gradient(34% 34% at 86% 12%, rgb(56 189 248 / .38), transparent 70%),
                radial-gradient(40% 40% at 72% 88%, rgb(244 114 182 / .32), transparent 70%),
                radial-gradient(34% 34% at 8% 86%, rgb(45 212 191 / .28), transparent 70%);
            animation: drift 28s ease-in-out infinite alternate; }
        @keyframes drift {
            0% { transform: translate3d(0, 0, 0) rotate(0) scale(1); }
            50% { transform: translate3d(3%, -2%, 0) rotate(6deg) scale(1.08); }
            100% { transform: translate3d(-3%, 3%, 0) rotate(-4deg) scale(1.02); }
        }

        .wrap { width: min(72rem, 100% - 2rem); margin-inline: auto; padding: 1rem 0 4rem; }

        .glass {
            background: var(--glass);
            border: 1px solid var(--border);
            -webkit-backdrop-filter: blur(22px) saturate(180%);
            backdrop-filter: blur(22px) saturate(180%);
            box-shadow: 0 1px 0 rgb(255 255 255 / .9) inset, 0 20px 50px -14px rgb(76 56 180 / .28);
        }

        /* nav */
        nav { display: flex; align-items: center; justify-content: space-between; gap: 1rem;
            border-radius: 1.25rem; padding: .65rem .9rem; margin-top: .75rem;
            animation: rise .7s var(--ease) both; }
        .brand { display: flex; align-items: center; gap: .65rem; font: 800 1.25rem 'Plus Jakarta Sans', sans-serif; letter-spacing: -.03em; }
        .logo { display: grid; place-items: center; width: 2.25rem; height: 2.25rem; border-radius: .8rem; color: #fff;
            background: var(--brand); box-shadow: 0 8px 18px -4px rgb(109 74 255 / .7); font-weight: 800; }
        .pill { display: inline-flex; align-items: center; gap: .5rem; border-radius: 999px; padding: .4rem .85rem;
            font-size: .78rem; font-weight: 600; background: rgb(255 255 255 / .6); border: 1px solid var(--border); }
        .dot { position: relative; width: .5rem; height: .5rem; border-radius: 50%; background: #10b981; }
        .dot::after { content: ''; position: absolute; inset: 0; border-radius: 50%; background: #10b981; animation: ping 1.8s ease-out infinite; }
        @keyframes ping { to { transform: scale(3.2); opacity: 0; } }

        /* hero */
        .hero { position: relative; overflow: hidden; margin-top: 1.25rem; padding: clamp(2rem, 6vw, 4.5rem);
            border-radius: 2rem; animation: rise .8s .08s var(--ease) both; }
        .hero h1 { font-size: clamp(2.2rem, 5.5vw, 4rem); font-weight: 800; line-height: 1.05; max-width: 14ch; }
        .grad { background: var(--brand); background-size: 200% 200%; -webkit-background-clip: text; background-clip: text;
            color: transparent; animation: pan 8s ease infinite; }
        @keyframes pan { 0%, 100% { background-position: 0 50%; } 50% { background-position: 100% 50%; } }
        .hero p { margin-top: 1.1rem; max-width: 36rem; color: var(--muted); line-height: 1.7; }
        .orb { position: absolute; border-radius: 50%; filter: blur(60px); opacity: .6; pointer-events: none; animation: float 11s ease-in-out infinite; }
        @keyframes float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(8px, -16px); } }

        .actions { display: flex; flex-wrap: wrap; gap: .75rem; margin-top: 1.75rem; }
        .btn { position: relative; overflow: hidden; display: inline-flex; align-items: center; gap: .5rem; border-radius: .9rem;
            padding: .8rem 1.2rem; font: 600 .9rem 'Inter', sans-serif; text-decoration: none; color: #fff;
            background: var(--brand); box-shadow: 0 12px 26px -8px rgb(109 74 255 / .7);
            transition: transform .35s var(--ease), box-shadow .35s ease; }
        .btn::after { content: ''; position: absolute; inset: 0; transform: translateX(-120%);
            background: linear-gradient(110deg, transparent 30%, rgb(255 255 255 / .45) 50%, transparent 70%);
            transition: transform .7s var(--ease); }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 18px 34px -8px rgb(109 74 255 / .75); }
        .btn:hover::after { transform: translateX(120%); }
        .btn.ghost { color: var(--ink); background: rgb(255 255 255 / .6); border: 1px solid var(--border); box-shadow: none; }

        /* stats */
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr)); gap: 1rem; margin-top: 1.25rem; }
        .stat { border-radius: 1.5rem; padding: 1.25rem; animation: rise .8s var(--ease) both;
            transition: transform .4s var(--ease), box-shadow .4s ease; }
        .stat:hover, .card:hover { transform: translateY(-6px); box-shadow: 0 1px 0 rgb(255 255 255 / .9) inset, 0 28px 56px -14px rgb(76 56 180 / .38); }
        .stat small { display: block; color: var(--muted); font-size: .72rem; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; }
        .stat strong { display: block; margin-top: .5rem; font: 800 1.6rem 'Plus Jakarta Sans', sans-serif; letter-spacing: -.03em; }

        /* endpoint groups */
        h2.section { margin: 2.5rem 0 1rem; font-size: 1.6rem; font-weight: 800; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(17rem, 1fr)); gap: 1rem; }
        .card { border-radius: 1.5rem; padding: 1.4rem; animation: rise .8s var(--ease) both;
            transition: transform .4s var(--ease), box-shadow .4s ease; }
        .card .icon { display: grid; place-items: center; width: 2.6rem; height: 2.6rem; border-radius: .9rem; font-size: 1.15rem;
            background: rgb(109 74 255 / .1); border: 1px solid var(--border); }
        .card h3 { margin-top: 1rem; font-size: 1.1rem; font-weight: 700; }
        .card p { margin-top: .35rem; color: var(--muted); font-size: .88rem; line-height: 1.6; }
        code { display: inline-block; margin-top: .85rem; padding: .3rem .6rem; border-radius: .6rem; font: 500 .78rem ui-monospace, SFMono-Regular, Menlo, monospace;
            color: #4b2bd6; background: rgb(109 74 255 / .09); }

        footer { margin-top: 2.5rem; text-align: center; color: var(--muted); font-size: .8rem; }

        @keyframes rise { from { opacity: 0; transform: translateY(22px); } to { opacity: 1; transform: none; } }
        .grid .card:nth-child(2) { animation-delay: .06s; } .grid .card:nth-child(3) { animation-delay: .12s; }
        .grid .card:nth-child(4) { animation-delay: .18s; } .grid .card:nth-child(5) { animation-delay: .24s; } .grid .card:nth-child(6) { animation-delay: .3s; }
        .stats .stat:nth-child(2) { animation-delay: .05s; } .stats .stat:nth-child(3) { animation-delay: .1s; } .stats .stat:nth-child(4) { animation-delay: .15s; }

        @media (max-width: 40rem) { .pill.hide-sm { display: none; } }
        @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; } }
    </style>
</head>
<body>
    <div class="aurora" aria-hidden="true"></div>

    <div class="wrap">
        <nav class="glass">
            <div class="brand"><span class="logo">{{ strtoupper(substr(config('app.name', 'W'), 0, 1)) }}</span> {{ config('app.name') }}</div>
            <div style="display:flex;gap:.5rem;align-items:center">
                <span class="pill hide-sm">{{ ucfirst(app()->environment()) }}</span>
                <span class="pill"><span class="dot"></span> All systems operational</span>
            </div>
        </nav>

        <section class="hero glass">
            <div class="orb" style="width:18rem;height:18rem;left:-4rem;top:-5rem;background:#8b5cf6"></div>
            <div class="orb" style="width:16rem;height:16rem;right:-3rem;bottom:-5rem;background:#f472b6;animation-delay:-4s"></div>
            <div style="position:relative">
                <h1>Commerce API, <span class="grad">built to scale.</span></h1>
                <p>Catalogue, cart, checkout, payments and admin — one secure JSON API powering the storefront and the admin console.</p>
                <div class="actions">
                    <a class="btn" href="{{ url('/api/commerce/home') }}">Explore the API →</a>
                    <a class="btn ghost" href="{{ config('app.frontend_url') }}">Open storefront</a>
                </div>
            </div>
        </section>

        <div class="stats">
            <div class="stat glass"><small>Laravel</small><strong>v{{ app()->version() }}</strong></div>
            <div class="stat glass"><small>PHP</small><strong>{{ PHP_VERSION }}</strong></div>
            <div class="stat glass"><small>Auth</small><strong>Sanctum</strong></div>
            <div class="stat glass"><small>Payments</small><strong>Stripe · Razorpay · PayPal · COD</strong></div>
        </div>

        <h2 class="section">Endpoints</h2>
        <div class="grid">
            <article class="card glass"><div class="icon">🛍️</div><h3>Catalogue</h3><p>Home feed, shop filters, live search suggestions, categories and brands.</p><code>GET /api/commerce/shop</code></article>
            <article class="card glass"><div class="icon">🛒</div><h3>Cart &amp; checkout</h3><p>Token-based carts, discounts, shipping rates and server-verified checkout.</p><code>POST /api/commerce/checkout</code></article>
            <article class="card glass"><div class="icon">🔐</div><h3>Authentication</h3><p>Register, sign in, password reset and profile management with throttling.</p><code>POST /api/auth/login</code></article>
            <article class="card glass"><div class="icon">👤</div><h3>Account</h3><p>Orders, addresses, wishlist, reviews and notification preferences.</p><code>GET /api/commerce/account/orders</code></article>
            <article class="card glass"><div class="icon">💳</div><h3>Payments</h3><p>Gateway methods, confirmation and signed webhooks for every provider.</p><code>GET /api/commerce/payments/methods</code></article>
            <article class="card glass"><div class="icon">📊</div><h3>Admin</h3><p>Dashboard, products, inventory, orders, reviews, customers and coupons.</p><code>GET /api/admin/dashboard</code></article>
        </div>

        <footer>© {{ date('Y') }} {{ config('app.name') }} · Requests to this API are rate-limited and logged.</footer>
    </div>
</body>
</html>
