<?php

test('returns a successful response', function () {
    $this->getJson('/')
        ->assertOk()
        ->assertJsonPath('name', config('app.name'));
});
