<?php

namespace Webfolks\CommerceCore;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use InvalidArgumentException;

class Commerce
{
    /**
     * @return class-string<Model>
     */
    public static function modelClass(string $key): string
    {
        $class = config("commerce.models.{$key}");

        if (! is_string($class) || ! is_subclass_of($class, Model::class)) {
            throw new InvalidArgumentException("Invalid commerce model [{$key}].");
        }

        return $class;
    }

    public static function newModel(string $key): Model
    {
        $class = static::modelClass($key);

        return new $class;
    }

    public static function query(string $key): Builder
    {
        return static::modelClass($key)::query();
    }
}
