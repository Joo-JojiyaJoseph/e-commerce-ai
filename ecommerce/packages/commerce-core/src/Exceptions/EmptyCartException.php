<?php

namespace Webfolks\CommerceCore\Exceptions;

class EmptyCartException extends CommerceException
{
    public static function make(): self
    {
        return new self('The cart has no items.');
    }
}
