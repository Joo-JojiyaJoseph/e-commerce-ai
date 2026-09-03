<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Models\ProductImage;
use App\Services\ProductImageService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Webfolks\CommerceCore\Enums\ProductStatus;
use Webfolks\CommerceCore\Models\ProductVariant;

class ProductController extends Controller
{
    public function __construct(protected ProductImageService $images) {}

    public function index(Request $request): JsonResponse
    {
        $query = Product::query()->with(['brand', 'categories', 'variants', 'images']);

        if ($request->boolean('trashed')) {
            $query->onlyTrashed();
        }

        if ($search = $request->string('q')->toString()) {
            $like = '%'.$search.'%';
            $query->where(function ($builder) use ($like): void {
                $builder->where('name', 'like', $like)->orWhere('slug', 'like', $like);
            });
        }

        if ($status = $request->string('status')->toString()) {
            $query->where('status', $status);
        }

        $sort = $request->string('sort')->toString();
        match ($sort) {
            'name' => $query->orderBy('name'),
            'oldest' => $query->orderBy('id'),
            default => $query->latest('id'),
        };

        return response()->json($query->paginate(20));
    }

    public function show(int $product): JsonResponse
    {
        $model = Product::withTrashed()->with(['brand', 'categories', 'variants', 'images'])->findOrFail($product);

        return response()->json(['data' => $this->payload($model)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->rules($request);
        $product = Product::query()->create($this->productAttributes($validated));
        $this->syncRelations($product, $validated, $request);

        return response()->json(['data' => $this->payload($product->fresh(['brand', 'categories', 'variants', 'images']))], 201);
    }

    public function update(Request $request, int $product): JsonResponse
    {
        $model = Product::withTrashed()->findOrFail($product);
        $validated = $this->rules($request, $model->id);
        $model->fill($this->productAttributes($validated))->save();
        $this->syncRelations($model, $validated, $request);

        return response()->json(['data' => $this->payload($model->fresh(['brand', 'categories', 'variants', 'images']))]);
    }

    public function destroy(int $product): JsonResponse
    {
        Product::query()->findOrFail($product)->delete();

        return response()->json(['message' => 'Product archived.']);
    }

    public function restore(int $product): JsonResponse
    {
        $model = Product::onlyTrashed()->findOrFail($product);
        $model->restore();

        return response()->json(['data' => $this->payload($model->fresh(['brand', 'categories', 'variants', 'images']))]);
    }

    public function bulkStatus(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
            'status' => ['required', Rule::enum(ProductStatus::class)],
        ]);

        Product::query()->whereIn('id', $validated['ids'])->update(['status' => $validated['status']]);

        return response()->json(['message' => 'Products updated.']);
    }

    public function storeImage(Request $request, int $product): JsonResponse
    {
        $model = Product::query()->findOrFail($product);
        $validated = $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp,gif', 'max:5120'],
            'variant_id' => ['nullable', 'integer', 'exists:product_variants,id'],
            'alt_text' => ['nullable', 'string', 'max:255'],
            'is_primary' => ['sometimes', 'boolean'],
        ]);

        $file = $validated['image'];
        abort_unless($file instanceof UploadedFile, 422);

        $image = $this->images->store(
            $model,
            $file,
            isset($validated['variant_id']) ? (int) $validated['variant_id'] : null,
            $validated['alt_text'] ?? null,
            $request->boolean('is_primary'),
        );

        return response()->json(['data' => $this->imagePayload($image)], 201);
    }

    public function replaceImage(Request $request, int $product, ProductImage $image): JsonResponse
    {
        abort_unless($image->product_id === $product, 404);
        $validated = $request->validate([
            'image' => ['required', 'file', 'image', 'mimes:jpeg,jpg,png,webp,gif', 'max:5120'],
        ]);

        $file = $validated['image'];
        abort_unless($file instanceof UploadedFile, 422);

        return response()->json(['data' => $this->imagePayload($this->images->replace($image, $file))]);
    }

    public function reorderImages(Request $request, int $product): JsonResponse
    {
        $model = Product::query()->findOrFail($product);
        $validated = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['integer'],
        ]);

        $this->images->reorder($model, $validated['ids']);

        return response()->json(['data' => $model->fresh('images')?->images->map(fn ($image) => $this->imagePayload($image))->values()]);
    }

    public function primaryImage(int $product, ProductImage $image): JsonResponse
    {
        abort_unless($image->product_id === $product, 404);
        $this->images->setPrimary($image);

        return response()->json(['data' => $this->imagePayload($image->refresh())]);
    }

    public function destroyImage(int $product, ProductImage $image): JsonResponse
    {
        abort_unless($image->product_id === $product, 404);
        $this->images->delete($image);

        return response()->json(['message' => 'Image removed.']);
    }

    /**
     * @return array<string, mixed>
     */
    protected function rules(Request $request, ?int $productId = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('products', 'slug')->ignore($productId)],
            'description' => ['nullable', 'string'],
            'status' => ['required', Rule::enum(ProductStatus::class)],
            'brand_id' => ['nullable', 'integer', 'exists:brands,id'],
            'category_ids' => ['nullable', 'array'],
            'category_ids.*' => ['integer', 'exists:categories,id'],
            'variants' => ['nullable', 'array'],
            'variants.*.id' => ['nullable', 'integer'],
            'variants.*.sku' => ['required', 'string', 'max:120'],
            'variants.*.price' => ['required', 'numeric', 'min:0'],
            'variants.*.compare_at_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.stock' => ['required', 'integer', 'min:0'],
            'variants.*.attributes' => ['nullable', 'array'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function productAttributes(array $validated): array
    {
        return [
            'name' => $validated['name'],
            'slug' => ($validated['slug'] ?? '') ?: Str::slug($validated['name']),
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'brand_id' => $validated['brand_id'] ?? null,
        ];
    }

    /**
     * @param  array<string, mixed>  $validated
     */
    protected function syncRelations(Product $product, array $validated, Request $request): void
    {
        $product->categories()->sync($validated['category_ids'] ?? []);

        foreach ($validated['variants'] ?? [] as $row) {
            $variant = isset($row['id'])
                ? ProductVariant::query()->where('product_id', $product->id)->whereKey($row['id'])->first()
                : ProductVariant::query()->where('sku', $row['sku'])->first();

            $payload = [
                'product_id' => $product->id,
                'sku' => $row['sku'],
                'price' => $row['price'],
                'stock' => $row['stock'],
                'attributes' => $row['attributes'] ?? [],
            ];

            $variant = $variant
                ? tap($variant)->update($payload)
                : ProductVariant::query()->create($payload);

            $variant->forceFill([
                'compare_at_price' => $row['compare_at_price'] ?? null,
            ])->save();
        }

        if ($request->hasFile('images')) {
            $uploads = $request->file('images');
            $files = is_array($uploads) ? $uploads : [$uploads];

            foreach ($files as $file) {
                if ($file instanceof UploadedFile) {
                    $this->images->store($product, $file);
                }
            }
        }
    }

    /**
     * @return array<string, mixed>
     */
    protected function payload(Product $product): array
    {
        return [
            'id' => $product->id,
            'name' => $product->name,
            'slug' => $product->slug,
            'description' => $product->description,
            'status' => $product->status,
            'brand' => $product->brand,
            'categories' => $product->categories,
            'variants' => $product->variants,
            'images' => $product->images->map(fn (ProductImage $image) => $this->imagePayload($image))->values(),
            'image_url' => $product->image_url,
            'deleted_at' => $product->deleted_at,
            'created_at' => $product->created_at,
            'updated_at' => $product->updated_at,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    protected function imagePayload(ProductImage $image): array
    {
        return [
            'id' => $image->id,
            'product_id' => $image->product_id,
            'variant_id' => $image->variant_id,
            'url' => $image->url(),
            'alt_text' => $image->alt_text,
            'sort_order' => $image->sort_order,
            'is_primary' => $image->is_primary,
        ];
    }
}
