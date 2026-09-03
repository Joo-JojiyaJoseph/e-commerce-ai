<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->foreignId('brand_id')->nullable()->after('id')->constrained()->nullOnDelete();
            $table->string('image_url')->nullable()->after('description');
            $table->index(['status', 'brand_id']);
        });

        Schema::table('product_variants', function (Blueprint $table) {
            $table->decimal('compare_at_price', 12, 2)->nullable()->after('price');
        });
    }

    public function down(): void
    {
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn('compare_at_price');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex(['status', 'brand_id']);
            $table->dropConstrainedForeignId('brand_id');
            $table->dropColumn('image_url');
        });
    }
};
