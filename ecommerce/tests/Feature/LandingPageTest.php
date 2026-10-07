<?php

test('browsers get the API status page', function () {
    $this->get('/')->assertOk()->assertSee('Commerce API', false)->assertSee('/api/commerce/home', false);
});

test('API clients asking for JSON still get JSON', function () {
    $this->getJson('/')->assertOk()->assertJsonStructure(['name', 'api']);
});
