<?php

namespace App\Support;

class DemoCatalog
{
    /**
     * Demo photography used by the commerce seeder and storefront fallbacks.
     *
     * @return array<string, string>
     */
    public static function categoryImages(): array
    {
        return [
            'shirts' => 'https://images.unsplash.com/photo-1594938291221-94d38d3c2864?auto=format&fit=crop&w=1200&q=80',
            'bags' => 'https://images.unsplash.com/photo-1544816155-12df9643f23b?auto=format&fit=crop&w=1200&q=80',
            'accessories' => 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=1200&q=80',
            'knitwear' => 'https://images.unsplash.com/photo-1434389677669-e08b4cac3105?auto=format&fit=crop&w=1200&q=80',
        ];
    }

    /**
     * @return array<string, string>
     */
    public static function brandImages(): array
    {
        return [
            'northloom' => 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=800&q=80',
            'field-oak' => 'https://images.unsplash.com/photo-1590874103328-eac38a94180c?auto=format&fit=crop&w=800&q=80',
            'harbor-thread' => 'https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&w=800&q=80',
        ];
    }

    public static function categoryImage(?string $slug, ?string $current = null): ?string
    {
        if (filled($current)) {
            return $current;
        }

        return self::categoryImages()[$slug ?? ''] ?? null;
    }

    public static function brandImage(?string $slug, ?string $current = null): ?string
    {
        if (filled($current)) {
            return $current;
        }

        return self::brandImages()[$slug ?? ''] ?? null;
    }
}
