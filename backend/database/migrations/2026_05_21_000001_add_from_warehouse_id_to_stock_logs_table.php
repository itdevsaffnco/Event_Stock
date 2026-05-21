<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_logs', function (Blueprint $table) {
            if (!Schema::hasColumn('stock_logs', 'from_warehouse_id')) {
                $table->foreignId('from_warehouse_id')
                      ->nullable()
                      ->after('user_id')
                      ->constrained('warehouses')
                      ->nullOnDelete();
            }
        });
    }

    public function down(): void
    {
        Schema::table('stock_logs', function (Blueprint $table) {
            $table->dropForeignIdFor(\App\Models\Warehouse::class, 'from_warehouse_id');
            $table->dropColumn('from_warehouse_id');
        });
    }
};
