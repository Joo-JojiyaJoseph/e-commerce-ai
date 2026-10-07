<?php

namespace App\Support;

use Illuminate\Validation\Rule;

/**
 * The optional "experience" settings stored in a product's `meta` JSON: 3D/AR model links,
 * AR placement and real-world size, and the virtual try-on image. One place defines the keys,
 * their validation, and how they are read back, so admin and storefront can't drift apart.
 */
final class ProductExperience
{
    /** @var list<string> */
    public const FIELDS = [
        'model_url', 'model_ios_url',
        'ar_placement', 'width_cm', 'height_cm', 'depth_cm',
        'tryon_url', 'tryon_type',
    ];

    private const NUMERIC = ['width_cm', 'height_cm', 'depth_cm'];

    /**
     * @return array<string, array<int, mixed>>
     */
    public static function rules(): array
    {
        // Only https links or same-site paths: a stored value can never become a script or data: URL.
        $link = ['nullable', 'string', 'max:2048', 'regex:/^(https:\/\/|\/)[^\s]+$/i'];
        $size = ['nullable', 'numeric', 'min:1', 'max:10000'];

        return [
            'model_url' => $link,
            'model_ios_url' => $link,
            'tryon_url' => $link,
            'tryon_type' => ['nullable', Rule::in(['top', 'bottom', 'dress'])],
            'ar_placement' => ['nullable', Rule::in(['floor', 'wall'])],
            'width_cm' => $size,
            'height_cm' => $size,
            'depth_cm' => $size,
        ];
    }

    /**
     * Human-friendly field names for validation messages ("The try-on image link field…", not "tryon url").
     *
     * @return array<string, string>
     */
    public static function attributes(): array
    {
        return [
            'model_url' => '3D model link',
            'model_ios_url' => 'iPhone AR link',
            'tryon_url' => 'try-on image link',
            'tryon_type' => 'garment type',
            'ar_placement' => 'AR placement',
            'width_cm' => 'width',
            'height_cm' => 'height',
            'depth_cm' => 'depth',
        ];
    }

    /**
     * Reads every field from a meta array, with null for anything unset (sizes as numbers).
     *
     * @param  array<string, mixed>|null  $meta
     * @return array<string, mixed>
     */
    public static function fromMeta(?array $meta): array
    {
        $out = [];

        foreach (self::FIELDS as $field) {
            $value = $meta[$field] ?? null;
            $out[$field] = in_array($field, self::NUMERIC, true) ? (is_numeric($value) ? $value + 0 : null) : $value;
        }

        return $out;
    }

    /**
     * The submitted experience fields, or null when the request didn't touch any of them
     * (so a partial update never wipes settings it didn't mention).
     *
     * @param  array<string, mixed>  $validated
     * @return array<string, mixed>|null
     */
    public static function pick(array $validated): ?array
    {
        if (array_intersect(self::FIELDS, array_keys($validated)) === []) {
            return null;
        }

        $picked = [];

        foreach (self::FIELDS as $field) {
            $picked[$field] = $validated[$field] ?? null;
        }

        return $picked;
    }
}
