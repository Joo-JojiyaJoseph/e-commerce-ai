<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Password;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80', 'regex:/^[\\p{L}\\s.\'-]+$/u'],
            'email' => ['required', 'email:filter', 'max:255', 'lowercase', 'unique:users,email'],
            'password' => ['required', 'confirmed', 'max:72', PasswordRule::defaults()],
        ]);

        $user = User::query()->create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => $validated['password'],
        ]);

        return response()->json([
            'data' => $this->userPayload($user, $user->createToken('storefront')->plainTextToken),
        ], 201);
    }

    public function login(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'email' => ['required', 'email:filter', 'max:255'],
            'password' => ['required', 'string', 'max:72'],
        ]);

        $user = User::query()->where('email', strtolower($validated['email']))->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            Log::warning('Authentication failed', ['email' => $validated['email']]);

            throw ValidationException::withMessages([
                'email' => __('These credentials do not match our records.'),
            ]);
        }

        return response()->json([
            'data' => $this->userPayload($user, $user->createToken('storefront')->plainTextToken),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $request->user()?->currentAccessToken()?->delete();

        return response()->json(['message' => __('Signed out.')]);
    }

    public function me(Request $request): JsonResponse
    {
        return response()->json([
            'data' => $this->userPayload($request->user()),
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80', 'regex:/^[\\p{L}\\s.\'-]+$/u'],
        ]);

        $request->user()->update($validated);

        return response()->json([
            'data' => $this->userPayload($request->user()->refresh()),
        ]);
    }

    public function changePassword(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'current_password' => ['required', 'current_password'],
            'password' => ['required', 'confirmed', 'max:72', PasswordRule::defaults()],
        ]);

        $request->user()->forceFill([
            'password' => $validated['password'],
        ])->save();

        return response()->json([
            'message' => __('Your password has been updated successfully.'),
        ]);
    }

    public function forgotPassword(Request $request): JsonResponse
    {
        $request->merge([
            'email' => strtolower((string) $request->input('email')),
        ]);

        $request->validate([
            'email' => ['required', 'email:filter', 'max:255'],
        ]);

        Password::sendResetLink($request->only('email'));

        return response()->json([
            'message' => __('If that email exists, a reset link was sent.'),
        ]);
    }

    public function resetPassword(Request $request): JsonResponse
    {
        $request->merge([
            'email' => strtolower((string) $request->input('email')),
        ]);

        $request->validate([
            'token' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email:filter', 'max:255'],
            'password' => ['required', 'confirmed', 'max:72', PasswordRule::defaults()],
        ]);

        $status = Password::reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (User $user, string $password): void {
                $user->forceFill([
                    'password' => $password,
                ])->save();

                $user->tokens()->delete();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => [__($status)],
            ]);
        }

        return response()->json([
            'message' => __('Your password has been reset.'),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    protected function userPayload(User $user, ?string $token = null): array
    {
        return array_filter([
            'id' => $user->id,
            'name' => $user->name,
            'email' => $user->email,
            'roles' => $user->getRoleNames()->values()->all(),
            'token' => $token,
        ], fn ($value) => $value !== null);
    }
}
