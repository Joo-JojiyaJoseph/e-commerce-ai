<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Concerns\FiltersAdminLists;
use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class CategoryController extends Controller
{
    use FiltersAdminLists;

    public function index(Request $request): JsonResponse
    {
        $query = Category::query()->with('parent:id,name,slug')->withCount(['children', 'products']);

        if ($request->boolean('trashed')) {
            $query->onlyTrashed();
        }

        if ($search = $request->string('q')->toString()) {
            $query->where('name', 'like', '%'.$search.'%');
        }

        if ($request->filled('parent_id')) {
            $parent = $request->string('parent_id')->toString();
            $parent === 'root' ? $query->whereNull('parent_id') : $query->where('parent_id', (int) $parent);
        }

        if ($request->filled('active')) {
            $query->where('is_active', $request->boolean('active'));
        }

        $this->applyDateRange($query, $request);

        return response()->json($query->orderBy('sort_order')->orderBy('id')->paginate($this->perPage($request, 30)));
    }

    public function show(int $category): JsonResponse
    {
        return response()->json([
            'data' => Category::withTrashed()->with(['parent', 'children'])->findOrFail($category),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $this->rules($request);
        $category = Category::query()->create($this->attributes($validated));

        return response()->json(['data' => $category], 201);
    }

    public function update(Request $request, int $category): JsonResponse
    {
        $model = Category::withTrashed()->findOrFail($category);
        $validated = $this->rules($request, $model->id);
        $model->fill($this->attributes($validated))->save();

        return response()->json(['data' => $model->refresh()]);
    }

    public function destroy(int $category): JsonResponse
    {
        Category::query()->findOrFail($category)->delete();

        return response()->json(['message' => 'Category archived.']);
    }

    public function restore(int $category): JsonResponse
    {
        $model = Category::onlyTrashed()->findOrFail($category);
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
            'slug' => ['nullable', 'string', 'max:255', Rule::unique('categories', 'slug')->ignore($ignore)],
            'parent_id' => [
                'nullable', 'integer', 'exists:categories,id',
                // A category can't be its own parent, or sit under one of its own descendants.
                function (string $attribute, mixed $value, \Closure $fail) use ($ignore): void {
                    if ($ignore !== null && in_array((int) $value, Category::descendantIdsOf([$ignore]), true)) {
                        $fail('A category cannot be placed under itself or one of its own subcategories.');
                    }
                },
            ],
            'image_url' => ['nullable', 'string', 'max:2048'],
            'sort_order' => ['nullable', 'integer', 'min:0'],
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
            'parent_id' => $validated['parent_id'] ?? null,
            'image_url' => $validated['image_url'] ?? null,
            'sort_order' => $validated['sort_order'] ?? 0,
            'is_active' => $validated['is_active'],
        ];
    }
}
