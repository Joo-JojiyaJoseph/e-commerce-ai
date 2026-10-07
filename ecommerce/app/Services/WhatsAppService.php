<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Throwable;
use Webfolks\CommerceCore\Models\Order;

class WhatsAppService
{
    /**
     * True when WhatsApp Cloud API credentials are present (so messages can be sent automatically).
     */
    public function configured(): bool
    {
        return filled(config('services.whatsapp.token')) && filled(config('services.whatsapp.phone_number_id'));
    }

    /**
     * Normalises a phone number to digits-only international format for wa.me / the Cloud API.
     * Numbers starting with "+" or "00" are treated as international; 10-digit numbers get the
     * configured default country code.
     */
    public function normalizePhone(?string $phone): ?string
    {
        $raw = trim((string) $phone);

        if ($raw === '') {
            return null;
        }

        $international = str_starts_with($raw, '+') || str_starts_with($raw, '00');
        $digits = preg_replace('/\D+/', '', $raw) ?? '';

        if ($international) {
            $digits = preg_replace('/^00/', '', $digits) ?? $digits;
        } else {
            $digits = ltrim($digits, '0');

            if (strlen($digits) <= 10) {
                $digits = config('services.whatsapp.default_country_code', '91').$digits;
            }
        }

        return strlen($digits) >= 8 && strlen($digits) <= 15 ? $digits : null;
    }

    public function link(?string $phone, string $message): ?string
    {
        $number = $this->normalizePhone($phone);

        return $number ? 'https://wa.me/'.$number.'?text='.rawurlencode($message) : null;
    }

    public function orderMessage(Order $order): string
    {
        $name = trim((string) data_get($order->shipping_address, 'name', ''));
        $greeting = $name !== '' ? "Hi {$name}," : 'Hi,';
        $status = str_replace('_', ' ', $order->status->value);

        return "{$greeting} your order {$order->number} is now *{$status}*. "
            .'Thanks for shopping with '.config('app.name').'! Reply here if you need any help.';
    }

    /**
     * Sends a text message through the WhatsApp Cloud API.
     *
     * Note: Meta only allows free-form text inside the 24-hour customer-service window;
     * outside it an approved message template is required.
     *
     * @return array{sent: bool, reason?: string}
     */
    public function send(?string $phone, string $message): array
    {
        if (! $this->configured()) {
            return ['sent' => false, 'reason' => 'not_configured'];
        }

        $number = $this->normalizePhone($phone);

        if (! $number) {
            return ['sent' => false, 'reason' => 'invalid_phone'];
        }

        try {
            $response = Http::withToken((string) config('services.whatsapp.token'))
                ->acceptJson()
                ->timeout(10)
                ->post(sprintf(
                    'https://graph.facebook.com/%s/%s/messages',
                    config('services.whatsapp.api_version'),
                    config('services.whatsapp.phone_number_id'),
                ), [
                    'messaging_product' => 'whatsapp',
                    'to' => $number,
                    'type' => 'text',
                    'text' => ['preview_url' => false, 'body' => mb_substr($message, 0, 1000)],
                ]);

            return $response->successful()
                ? ['sent' => true]
                : ['sent' => false, 'reason' => (string) ($response->json('error.message') ?? 'api_error')];
        } catch (Throwable $exception) {
            report($exception);

            return ['sent' => false, 'reason' => 'request_failed'];
        }
    }
}
