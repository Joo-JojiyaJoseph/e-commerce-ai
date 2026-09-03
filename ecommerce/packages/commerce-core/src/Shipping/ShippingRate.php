<?php

namespace Webfolks\CommerceCore\Shipping;

class ShippingRate
{
    public function __construct(
        public string $code,
        public string $name,
        public string $amount,
    ) {}

    /**
     * @return array{code: string, name: string, amount: string}
     */
    public function toArray(): array
    {
        return [
            'code' => $this->code,
            'name' => $this->name,
            'amount' => $this->amount,
        ];
    }
}
