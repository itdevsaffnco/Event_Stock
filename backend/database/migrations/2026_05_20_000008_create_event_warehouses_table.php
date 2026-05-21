<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Pivot: event bisa melibatkan banyak gudang
        Schema::create('event_warehouses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['event_id', 'warehouse_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_warehouses');
    }
};
