<?php

namespace Webfolks\CommerceCore\Exceptions;

class InvalidOrderStateException extends CommerceException
{
    public static function cannotCancel(string $status): self
    {
        return new self("An order with status [{$status}] cannot be cancelled.");
    }
}
