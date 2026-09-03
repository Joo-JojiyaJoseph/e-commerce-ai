<?php

namespace App\Providers;

use App\Listeners\NotifyOrderPlaced;
use App\Listeners\NotifyPaymentCompleted;
use App\Listeners\RecordOrderPlacedHistory;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Payments\CodGateway;
use App\Payments\PaypalGateway;
use App\Payments\RazorpayGateway;
use App\Payments\RoutingGateway;
use App\Payments\StripeCheckoutGateway;
use Carbon\CarbonImmutable;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Date;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Event;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Validation\Rules\Password;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Events\OrderPlaced;
use Webfolks\CommerceCore\Events\PaymentCompleted;
use Webfolks\CommerceCore\Payments\FakeGateway;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->bind(PaymentGateway::class, function ($app): PaymentGateway {
            $online = blank(config('commerce.payments.stripe.secret'))
                ? $app->make(FakeGateway::class)
                : $app->make(StripeCheckoutGateway::class);

            return new RoutingGateway(
                $online,
                $app->make(CodGateway::class),
                $app->make(RazorpayGateway::class),
                $app->make(PaypalGateway::class),
                $app->make(StripeCheckoutGateway::class),
            );
        });
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        $this->configureDefaults();

        Event::listen(OrderPlaced::class, RecordOrderPlacedHistory::class);
        Event::listen(OrderPlaced::class, NotifyOrderPlaced::class);
        Event::listen(PaymentCompleted::class, NotifyPaymentCompleted::class);

        ResetPassword::createUrlUsing(function (User $notifiable, string $token): string {
            return rtrim((string) config('app.frontend_url'), '/').'/reset-password?'.http_build_query([
                'token' => $token,
                'email' => $notifiable->getEmailForPasswordReset(),
            ]);
        });

        RateLimiter::for('auth', fn (Request $request) => Limit::perMinute(8)->by((string) $request->ip()));

        Product::saved(function (): void {
            Cache::forget('commerce.homepage');
            Cache::forget('commerce.categories');
        });
        Category::saved(fn () => Cache::forget('commerce.categories'));
        Brand::saved(fn () => Cache::forget('commerce.brands'));
    }

    /**
     * Configure default behaviors for production-ready applications.
     */
    protected function configureDefaults(): void
    {
        Date::use(CarbonImmutable::class);

        DB::prohibitDestructiveCommands(
            app()->isProduction(),
        );

        Password::defaults(fn (): ?Password => app()->isProduction()
            ? Password::min(12)
                ->mixedCase()
                ->letters()
                ->numbers()
                ->symbols()
                ->uncompromised()
            : null,
        );
    }
}
