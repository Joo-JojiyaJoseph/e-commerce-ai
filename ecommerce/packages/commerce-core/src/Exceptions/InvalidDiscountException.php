<?php

namespace Webfolks\CommerceCore\Exceptions;

class InvalidDiscountException extends CommerceException
{
    public static function code(string $code): self
    {
        return new self("Discount code [{$code}] is not valid.");
    }
}
