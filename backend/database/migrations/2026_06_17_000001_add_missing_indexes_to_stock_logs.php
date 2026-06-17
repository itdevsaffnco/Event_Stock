<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stock_logs', function (Blueprint $table) {
            $table->index('user_id',     'stock_logs_user_id_index');
            $table->index('to_store_id', 'stock_logs_to_store_id_index');
            $table->index('logged_at',   'stock_logs_logged_at_index');
        });
    }

    public function down(): void
    {
        Schema::table('stock_logs', function (Blueprint $table) {
            $table->dropIndex('stock_logs_user_id_index');
            $table->dropIndex('stock_logs_to_store_id_index');
            $table->dropIndex('stock_logs_logged_at_index');
        });
    }
};
