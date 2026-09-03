<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Support\DemoCatalog;
use Illuminate\Database\Seeder;
use Webfolks\CommerceCore\Enums\DiscountType;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\Discount;
use Webfolks\CommerceCore\Models\ProductVariant;

class CommerceSeeder extends Seeder
{
    public function run(): void
    {
        $brands = [
            ['name' => 'Northloom', 'slug' => 'northloom'],
            ['name' => 'Field & Oak', 'slug' => 'field-oak'],
            ['name' => 'Harbor Thread', 'slug' => 'harbor-thread'],
        ];

        foreach ($brands as $brand) {
            $record = Brand::query()->updateOrCreate(
                ['slug' => $brand['slug']],
                [...$brand, 'is_active' => true],
            );

            if (blank($record->logo_url)) {
                $record->forceFill([
                    'logo_url' => DemoCatalog::brandImage($brand['slug']),
                ])->save();
            }
        }

        $categories = [
            ['name' => 'Shirts', 'slug' => 'shirts', 'sort_order' => 1],
            ['name' => 'Bags', 'slug' => 'bags', 'sort_order' => 2],
            ['name' => 'Accessories', 'slug' => 'accessories', 'sort_order' => 3],
            ['name' => 'Knitwear', 'slug' => 'knitwear', 'sort_order' => 4],
        ];

        foreach ($categories as $category) {
            $record = Category::query()->updateOrCreate(
                ['slug' => $category['slug']],
                [...$category, 'is_active' => true],
            );

            if (blank($record->image_url)) {
                $record->forceFill([
                    'image_url' => DemoCatalog::categoryImage($category['slug']),
                ])->save();
            }
        }

        $catalog = [
            [
                'name' => 'Linen Overshirt',
                'slug' => 'linen-overshirt',
                'description' => 'A lightweight overshirt cut from washed linen. Works as a layer or a shirt on warm evenings.',
                'price' => '2499.00',
                'compare_at_price' => '3299.00',
                'stock' => 18,
                'sku' => 'LINEN-OVR-01',
                'brand' => 'northloom',
                'categories' => ['shirts'],
                'image_url' => 'https://images.unsplash.com/photo-1594938291221-94d38d3c2864?auto=format&fit=crop&w=900&q=80',
                'gallery' => [
                    'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80',
                    'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'name' => 'Canvas Tote',
                'slug' => 'canvas-tote',
                'description' => 'Heavyweight canvas tote with an interior pocket and reinforced straps for daily carry.',
                'price' => '1299.00',
                'compare_at_price' => null,
                'stock' => 40,
                'sku' => 'CANVAS-TOTE-01',
                'brand' => 'field-oak',
                'categories' => ['bags'],
                'image_url' => 'https://images.unsplash.com/photo-1544816155-12df9643f23b?auto=format&fit=crop&w=900&q=80',
                'gallery' => [
                    'https://images.unsplash.com/photo-1590874103328-eac38a94180c?auto=format&fit=crop&w=900&q=80',
                ],
            ],
            [
                'name' => 'Merino Beanie',
                'slug' => 'merino-beanie',
                'description' => 'Fine merino rib beanie with a clean, unmarked cuff. Packs flat and holds its shape.',
                'price' => '899.00',
                'compare_at_price' => '1199.00',
                'stock' => 32,
                'sku' => 'MERINO-BN-01',
                'brand' => 'harbor-thread',
                'categories' => ['accessories', 'knitwear'],
                'image_url' => 'https://images.unsplash.com/photo-1576871337622-98d48d1cf531?auto=format&fit=crop&w=900&q=80',
            ],
            [
                'name' => 'Indigo Work Shirt',
                'slug' => 'indigo-work-shirt',
                'description' => 'A sturdy indigo cotton shirt with a relaxed shoulder and corozo buttons.',
                'price' => '2799.00',
                'compare_at_price' => null,
                'stock' => 14,
                'sku' => 'INDIGO-WK-01',
                'brand' => 'northloom',
                'categories' => ['shirts'],
                'image_url' => 'https://images.unsplash.com/photo-1596755094514-f87e34085b2c?auto=format&fit=crop&w=900&q=80',
            ],
            [
                'name' => 'Leather Card Holder',
                'slug' => 'leather-card-holder',
                'description' => 'Vegetable-tanned leather card holder that softens and darkens with use.',
                'price' => '1499.00',
                'compare_at_price' => '1899.00',
                'stock' => 26,
                'sku' => 'LEATH-CARD-01',
                'brand' => 'field-oak',
                'categories' => ['accessories'],
                'image_url' => 'https://images.unsplash.com/photo-1627123424574-724758594e93?auto=format&fit=crop&w=900&q=80',
            ],
            [
                'name' => 'Cashmere Crew',
                'slug' => 'cashmere-crew',
                'description' => 'A midweight cashmere crewneck with a quiet drape and set-in sleeves.',
                'price' => '6499.00',
                'compare_at_price' => '7999.00',
                'stock' => 8,
                'sku' => 'CASH-CREW-01',
                'brand' => 'harbor-thread',
                'categories' => ['knitwear'],
                'image_url' => 'https://images.unsplash.com/photo-1631541909061-71e349d1f203?auto=format&fit=crop&w=900&q=80',
            ],
        ];

        foreach ($catalog as $item) {
            $product = Product::query()->updateOrCreate(
                ['slug' => $item['slug']],
                [
                    'name' => $item['name'],
                    'description' => $item['description'],
                    'status' => ProductStatus::Active,
                    'brand_id' => Brand::query()->where('slug', $item['brand'])->value('id'),
                    'image_url' => $item['image_url'],
                ],
            );

            $product->categories()->sync(
                Category::query()->whereIn('slug', $item['categories'])->pluck('id'),
            );

            $variant = ProductVariant::query()->updateOrCreate(
                ['sku' => $item['sku']],
                [
                    'product_id' => $product->id,
                    'price' => $item['price'],
                    'stock' => $item['stock'],
                    'attributes' => ['color' => 'natural'],
                ],
            );

            $variant->forceFill([
                'compare_at_price' => $item['compare_at_price'],
            ])->save();

            $product->images()->updateOrCreate(
                ['path' => $item['image_url']],
                [
                    'is_primary' => true,
                    'sort_order' => 0,
                    'alt_text' => $item['name'],
                ],
            );

            foreach ($item['gallery'] ?? [] as $index => $url) {
                $product->images()->updateOrCreate(
                    ['path' => $url],
                    [
                        'is_primary' => false,
                        'sort_order' => $index + 1,
                        'alt_text' => $item['name'],
                    ],
                );
            }
        }

        Discount::query()->updateOrCreate(
            ['code' => 'WELCOME10'],
            [
                'name' => 'Welcome 10%',
                'type' => DiscountType::Percentage,
                'value' => 10,
                'is_active' => true,
                'starts_at' => now()->subDay(),
                'ends_at' => now()->addYear(),
            ],
        );
    }
}
