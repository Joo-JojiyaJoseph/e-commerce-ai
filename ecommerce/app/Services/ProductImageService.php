<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class ProductImageService
{
    public function store(Product $product, UploadedFile $file, ?int $variantId = null, ?string $altText = null, bool $primary = false): ProductImage
    {
        $path = $file->store('products/'.$product->id, 'public');

        $next = ((int) $product->images()->max('sort_order')) + 1;
        $makePrimary = $primary || $product->images()->doesntExist();

        if ($makePrimary) {
            $product->images()->update(['is_primary' => false]);
        }

        $image = $product->images()->create([
            'variant_id' => $variantId,
            'path' => $path,
            'alt_text' => $altText ?: $product->name,
            'sort_order' => $next,
            'is_primary' => $makePrimary,
        ]);

        $product->syncPrimaryImageUrl();

        return $image;
    }

    public function replace(ProductImage $image, UploadedFile $file): ProductImage
    {
        $this->deleteFile($image->path);

        $image->forceFill([
            'path' => $file->store('products/'.$image->product_id, 'public'),
        ])->save();

        $image->product?->syncPrimaryImageUrl();

        return $image->refresh();
    }

    /**
     * @param  list<int>  $orderedIds
     */
    public function reorder(Product $product, array $orderedIds): void
    {
        foreach ($orderedIds as $index => $id) {
            $product->images()->whereKey($id)->update(['sort_order' => $index]);
        }
    }

    public function setPrimary(ProductImage $image): void
    {
        $image->product?->images()->update(['is_primary' => false]);
        $image->forceFill(['is_primary' => true])->save();
        $image->product?->syncPrimaryImageUrl();
    }

    public function delete(ProductImage $image): void
    {
        $product = $image->product;
        $wasPrimary = $image->is_primary;

        $this->deleteFile($image->path);
        $image->delete();

        if ($product && $wasPrimary) {
            $next = $product->images()->first();
            if ($next) {
                $next->forceFill(['is_primary' => true])->save();
            }
            $product->syncPrimaryImageUrl();
        }
    }

    protected function deleteFile(string $path): void
    {
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return;
        }

        Storage::disk('public')->delete($path);
    }

    public static function safeName(UploadedFile $file): string
    {
        return Str::uuid()->toString().'.'.$file->guessExtension();
    }
}
