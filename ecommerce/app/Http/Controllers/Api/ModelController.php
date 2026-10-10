<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Support\Glb;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

/**
 * 3D models for the product AR viewer. Admins upload a .glb (built in the admin's model builder or made elsewhere);
 * shoppers' browsers fetch it from here. Serving it through the API (rather than a public folder) means the CORS
 * rules apply, so the viewer can load it from the storefront's origin, and no `storage:link` is needed.
 */
class ModelController extends Controller
{
    private const DISK = 'local';

    public function store(Request $request): JsonResponse
    {
        $request->validate(['model' => ['required', 'file', 'max:15360']], [
            'model.max' => 'The model is larger than 15 MB.',
        ]);

        $path = $request->file('model')?->getRealPath();
        $bytes = $path !== null && $path !== false ? file_get_contents($path) : false;

        if ($bytes === false || ($problem = Glb::problem($bytes)) !== null) {
            throw ValidationException::withMessages(['model' => [$problem ?? 'The file could not be read.']]);
        }

        $name = Str::uuid()->toString().'.glb';
        Storage::disk(self::DISK)->put("models/{$name}", $bytes);

        return response()->json(['data' => [
            'url' => "/api/commerce/models/{$name}",
            'size' => strlen($bytes),
        ]], 201);
    }

    public function show(string $name): BinaryFileResponse
    {
        $disk = Storage::disk(self::DISK);
        abort_unless($disk->exists("models/{$name}"), 404);

        return response()->file($disk->path("models/{$name}"), [
            'Content-Type' => 'model/gltf-binary',
            'X-Content-Type-Options' => 'nosniff',
            // The name is a random id that never changes content, so browsers can cache it for good.
            'Cache-Control' => 'public, max-age=31536000, immutable',
        ]);
    }
}
