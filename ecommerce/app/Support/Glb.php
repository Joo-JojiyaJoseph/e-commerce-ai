<?php

namespace App\Support;

/**
 * Inspects an uploaded .glb (binary glTF 2.0) before it is stored and later served to shoppers' browsers.
 * It checks the container is genuine and self-contained: right magic and version, a declared length that
 * matches the file, a JSON chunk that parses, and no references to external files or sites.
 */
final class Glb
{
    private const MAGIC = 0x46546C67; // "glTF"

    private const CHUNK_JSON = 0x4E4F534A; // "JSON"

    /**
     * @return string|null an error message, or null when the file is acceptable
     */
    public static function problem(string $bytes): ?string
    {
        if (strlen($bytes) < 28) {
            return 'This file is too small to be a 3D model.';
        }

        $header = unpack('Vmagic/Vversion/Vlength', $bytes);

        if ($header === false || $header['magic'] !== self::MAGIC) {
            return 'This is not a .glb file (it does not start with the glTF signature).';
        }

        if ($header['version'] !== 2) {
            return 'Only glTF version 2 models are supported.';
        }

        if ($header['length'] !== strlen($bytes)) {
            return 'This .glb looks damaged (its declared size does not match the file).';
        }

        $chunk = unpack('Vlength/Vtype', substr($bytes, 12, 8));

        if ($chunk === false || $chunk['type'] !== self::CHUNK_JSON || 20 + $chunk['length'] > strlen($bytes)) {
            return 'This .glb looks damaged (its model description is missing).';
        }

        $json = json_decode(substr($bytes, 20, $chunk['length']), true);

        if (! is_array($json) || ! is_array($json['asset'] ?? null) || ! str_starts_with((string) ($json['asset']['version'] ?? ''), '2')) {
            return 'This .glb looks damaged (its model description could not be read).';
        }

        // A model must carry everything inside itself; it must never make a shopper's browser fetch another site.
        foreach (['buffers', 'images'] as $list) {
            foreach ((array) ($json[$list] ?? []) as $entry) {
                $uri = is_array($entry) ? ($entry['uri'] ?? null) : null;

                if (is_string($uri) && ! str_starts_with($uri, 'data:')) {
                    return 'This model points to outside files. Export it as a single self-contained .glb.';
                }
            }
        }

        return null;
    }
}
