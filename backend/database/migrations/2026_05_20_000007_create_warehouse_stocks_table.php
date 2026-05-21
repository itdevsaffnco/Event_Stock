<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Master catalog / inventory per gudang
        Schema::create('warehouse_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('warehouse_id')->constrained()->cascadeOnDelete();
            $table->string('sku_code')->nullable();
            $table->string('sku_name');
            $table->unsignedInteger('qty_available')->default(0);
            $table->decimal('price', 12, 2)->nullable();
            $table->timestamps();

            $table->index(['warehouse_id', 'sku_name']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('warehouse_stocks');
    }
};
