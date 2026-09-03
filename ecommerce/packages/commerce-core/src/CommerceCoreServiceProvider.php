<?php

namespace Webfolks\CommerceCore;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Contracts\Debug\ExceptionHandler;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Webfolks\CommerceCore\Contracts\InventoryAllocator;
use Webfolks\CommerceCore\Contracts\PaymentGateway;
use Webfolks\CommerceCore\Contracts\PricingEngine;
use Webfolks\CommerceCore\Contracts\ShippingRateProvider;
use Webfolks\CommerceCore\Exceptions\CommerceException;
use Webfolks\CommerceCore\Exceptions\EmptyCartException;
use Webfolks\CommerceCore\Exceptions\InsufficientInventoryException;
use Webfolks\CommerceCore\Exceptions\InvalidDiscountException;
use Webfolks\CommerceCore\Exceptions\InvalidOrderStateException;
use Webfolks\CommerceCore\Inventory\SimpleInventoryAllocator;
use Webfolks\CommerceCore\Payments\FakeGateway;
use Webfolks\CommerceCore\Payments\StripeGateway;
use Webfolks\CommerceCore\Pricing\DefaultPricingEngine;
use Webfolks\CommerceCore\Shipping\FlatRateProvider;

class CommerceCoreServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        $this->mergeConfigFrom(__DIR__.'/../config/commerce.php', 'commerce');

        $this->app->bind(PaymentGateway::class, fn () => $this->app->make($this->implementation('payments.gateway')));
        $this->app->bind(ShippingRateProvider::class, fn () => $this->app->make($this->implementation('shipping.provider')));
        $this->app->bind(PricingEngine::class, fn () => $this->app->make($this->implementation('pricing.engine')));
        $this->app->bind(InventoryAllocator::class, fn () => $this->app->make($this->implementation('inventory.allocator')));
    }

    public function boot(): void
    {
        $this->loadMigrationsFrom(__DIR__.'/../database/migrations');
        $this->loadRoutesFrom(__DIR__.'/../routes/api.php');

        $this->publishes([
            __DIR__.'/../config/commerce.php' => config_path('commerce.php'),
        ], 'commerce-config');

        $this->publishes([
            __DIR__.'/../database/migrations' => database_path('migrations'),
        ], 'commerce-migrations');

        $this->configureRateLimiting();
        $this->configureExceptionRendering();
        $this->configureRouteBinding();
    }

    /**
     * @return class-string
     */
    protected function implementation(string $key): string
    {
        $class = config("commerce.{$key}");

        $aliases = [
            'stripe' => StripeGateway::class,
            'fake' => FakeGateway::class,
            'flat' => FlatRateProvider::class,
            'default' => DefaultPricingEngine::class,
            'simple' => SimpleInventoryAllocator::class,
        ];

        if (is_string($class) && isset($aliases[$class])) {
            return $aliases[$class];
        }

        if (! is_string($class) || $class === '' || ! class_exists($class)) {
            throw new \InvalidArgumentException("Commerce config [{$key}] must be a class name.");
        }

        return $class;
    }

    protected function configureRateLimiting(): void
    {
        RateLimiter::for('commerce-checkout', function (Request $request) {
            return Limit::perMinute(10)->by((string) ($request->user()?->getAuthIdentifier() ?: $request->ip()));
        });
    }

    protected function configureExceptionRendering(): void
    {
        $this->app->make(ExceptionHandler::class)->renderable(function (CommerceException $exception, Request $request) {
            if (! $request->is('api/*') && ! $request->expectsJson()) {
                return null;
            }

            $status = match (true) {
                $exception instanceof EmptyCartException,
                $exception instanceof InvalidDiscountException => 422,
                $exception instanceof InsufficientInventoryException,
                $exception instanceof InvalidOrderStateException => 409,
                default => 400,
            };

            return response()->json([
                'message' => $exception->getMessage(),
            ], $status);
        });
    }

    protected function configureRouteBinding(): void
    {
        $this->app['router']->model('cartItem', Commerce::modelClass('cart_item'));
    }
}
