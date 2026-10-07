<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\FiltersAdminLists;
use App\Http\Controllers\Controller;
use App\Models\Brand;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class BrandController extends Controller
{
    use FiltersAdminLists;

    public function index(Request $request): JsonResponse
    {
        $query = Brand::query();

        if ($request->boolean('trashed')) {
            $query->onlyTrashed();
        }

        if ($search = $request->string('q')->toString()) {
            $query->where('name', 'like', '%'.$search.'%');
        }

        return response()->json($query->orderBy('name')->paginate($this->perPage($request, 30)));
    }

    public function show(int $brand): JsonResponse
    {
        return response()->json(['data' => Brand::withTrashed()->findOrFail($brand)]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->rules($request);
        $brand = Brand::query()->create($this->attributes($validated));

        return response()->json(['data' => $brand], 201);
    }

    public function update(Request $request, int $brand): JsonResponse
    {
        $model = Brand::withTrashed()->findOrFail($brand);
        $validated = $this->rules($request, $model->id);
        $model->fill($this->attributes($validated))->save();

        return response()->json(['data' => $model->refresh()]);
    }

    public function destroy(int $brand): JsonResponse
    {
        Brand::query()->findOrFail($brand)->delete();

        return response()->json(['message' => 'Brand archived.']);
    }

    public function restore(int $brand): JsonResponse
    {
        $model = Brand::onlyTrashed()->findOrFail($brand);
        $model->restore();

        return response()->json(['data' => $model]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function rules(Request $request, ?int $ignore = null): array
    {
        return $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('brands', 'slug')->ignore($ignore)],
            'logo_url' => ['nullable', 'string', 'max:2048'],
            'is_active' => ['required', 'boolean'],
        ]);
    }

    /**
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>
     */
    protected function attributes(array $validated): array
    {
        return [
            'name' => $validated['name'],
            'slug' => ($validated['slug'] ?? '') ?: Str::slug($validated['name']),
            'logo_url' => $validated['logo_url'] ?? null,
            'is_active' => $validated['is_active'],
        ];
    }
}
