<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_logs', 'to_store_id')) {
                $table->foreignId('to_store_id')
                      ->nullable()
                      ->after('from_warehouse_id')
                      ->constrained('stores')
                      ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_logs', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Store::class, 'to_store_id');
            $table->dropColumn('to_store_id');
        });
    }
};
