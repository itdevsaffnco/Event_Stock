<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (Schema::hasColumn('events', 'warehouse_id')) {
            Schema::table('events', function (Blueprint $table) {
                // Drop foreign key constraint first, then the column
                try { $table->dropForeign(['warehouse_id']); } catch (\Throwable) {}
                $table->dropColumn('warehouse_id');
            });
        }
    }

    public function down(): void
    {
        Schema::table('events', function (Blueprint $table) {
            $table->foreignId('warehouse_id')->nullable()->constrained();
        });
    }
};
