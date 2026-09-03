<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained()->cascadeOnDelete();
            $table->foreignId('variant_id')->nullable()->constrained('product_variants')->nullOnDelete();
            $table->string('path');
            $table->string('alt_text')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_primary')->default(false);
            $table->timestamps();

            $table->index(['product_id', 'sort_order']);
            $table->index(['product_id', 'is_primary']);
        });

        Schema::table('reviews', function (Blueprint $table) {
            $table->string('status', 20)->default('pending')->after('is_verified');
            $table->index(['product_id', 'status']);
        });

        DB::table('reviews')->update(['status' => 'approved']);

        Schema::create('store_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('type', 64);
            $table->string('title');
            $table->text('message');
            $table->json('data')->nullable();
            $table->string('action_url')->nullable();
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['user_id', 'is_read']);
            $table->index(['user_id', 'created_at']);
            $table->index(['user_id', 'type']);
        });

        Schema::create('notification_preferences', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->boolean('orders')->default(true);
            $table->boolean('payments')->default(true);
            $table->boolean('reviews')->default(true);
            $table->boolean('offers')->default(true);
            $table->boolean('security')->default(true);
            $table->timestamps();

            $table->unique('user_id');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->softDeletes();
        });

        Schema::table('brands', function (Blueprint $table) {
            $table->boolean('is_active')->default(true)->after('logo_url');
            $table->softDeletes();
        });

        $now = now();
        $products = DB::table('products')->whereNotNull('image_url')->orderBy('id')->get();

        foreach ($products as $product) {
            $exists = DB::table('product_images')->where('product_id', $product->id)->exists();

            if ($exists || ! is_string($product->image_url) || $product->image_url === '') {
                continue;
            }

            DB::table('product_images')->insert([
                'product_id' => $product->id,
                'variant_id' => null,
                'path' => $product->image_url,
                'alt_text' => $product->name,
                'sort_order' => 0,
                'is_primary' => true,
                'created_at' => $now,
                'updated_at' => $now,
            ]);
        }
    }

    public function down(): void
    {
        Schema::table('brands', function (Blueprint $table) {
            $table->dropSoftDeletes();
            $table->dropColumn('is_active');
        });

        Schema::table('categories', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropSoftDeletes();
        });

        Schema::dropIfExists('notification_preferences');
        Schema::dropIfExists('store_notifications');

        Schema::table('reviews', function (Blueprint $table) {
            $table->dropIndex(['product_id', 'status']);
            $table->dropColumn('status');
        });

        Schema::dropIfExists('product_images');
    }
};
