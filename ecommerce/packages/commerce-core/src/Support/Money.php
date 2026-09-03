<?php

namespace Webfolks\CommerceCore\Support;

class Money
{
    public static function of(mixed $amount): string
    {
        return number_format((float) $amount, 2, '.', '');
    }

    public static function add(string ...$amounts): string
    {
        $total = '0.00';

        foreach ($amounts as $amount) {
            $total = bcadd($total, $amount, 2);
        }

        return $total;
    }

    public static function subtract(string $left, string $right): string
    {
        return bcsub($left, $right, 2);
    }

    public static function multiply(string $amount, int|string $multiplier): string
    {
        return bcmul($amount, (string) $multiplier, 2);
    }

    public static function percent(string $amount, string $percent): string
    {
        return bcmul($amount, bcdiv($percent, '100', 4), 2);
    }

    public static function min(string $left, string $right): string
    {
        return bccomp($left, $right, 2) <= 0 ? $left : $right;
    }

    public static function toCents(string $amount): int
    {
        return (int) bcmul($amount, '100', 0);
    }

    public static function isGreaterThan(string $left, string $right): bool
    {
        return bccomp($left, $right, 2) === 1;
    }
}
