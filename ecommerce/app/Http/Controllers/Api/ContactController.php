<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Mail\Message;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

class ContactController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->merge([
            'email' => strtolower((string) $request->input('email')),
            'phone' => $request->filled('phone') ? $request->input('phone') : null,
        ]);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:80', 'regex:/^[\\p{L}\\s.\'-]+$/u'],
            'email' => ['required', 'email:filter', 'max:255'],
            'phone' => ['nullable', 'string', 'max:20', 'regex:/^[+]?[\\d\\s()-]{8,20}$/'],
            'subject' => ['required', 'string', 'max:180'],
            'message' => ['required', 'string', 'min:10', 'max:4000'],
            'website' => ['prohibited'],
        ]);

        Mail::raw(
            "From: {$validated['name']} <{$validated['email']}>".PHP_EOL
            .'Phone: '.($validated['phone'] ?? 'n/a').PHP_EOL.PHP_EOL
            .$validated['message'],
            function (Message $mail) use ($validated): void {
                $mail
                    ->to((string) config('mail.from.address'))
                    ->replyTo($validated['email'], $validated['name'])
                    ->subject('Store contact: '.$validated['subject']);
            },
        );

        Log::info('Contact form submitted', [
            'email' => $validated['email'],
            'subject' => $validated['subject'],
        ]);

        return response()->json([
            'message' => __('Thanks. We received your message and will reply by email.'),
        ], 201);
    }
}
