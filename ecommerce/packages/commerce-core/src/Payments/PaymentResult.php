<?php

namespace Webfolks\CommerceCore\Payments;

class PaymentResult
{
    public function __construct(
        public bool $success,
        public ?string $reference = null,
        public ?string $message = null,
        public bool $captured = true,
        public ?string $gateway = null,
        /** @var array<string, mixed> */
        public array $clientPayload = [],
    ) {}

    public static function ok(?string $reference = null, ?string $gateway = null): self
    {
        return new self(true, $reference, null, true, $gateway);
    }

    /**
     * @param  array<string, mixed>  $clientPayload
     */
    public static function pendingCapture(?string $reference = null, ?string $gateway = null, array $clientPayload = []): self
    {
        return new self(true, $reference, null, false, $gateway, $clientPayload);
    }

    public static function failed(string $message, ?string $reference = null, ?string $gateway = null): self
    {
        return new self(false, $reference, $message, false, $gateway);
    }

    public function successful(): bool
    {
        return $this->success;
    }

    public function captured(): bool
    {
        return $this->success && $this->captured;
    }

    public function message(): string
    {
        return $this->message ?? '';
    }
}
