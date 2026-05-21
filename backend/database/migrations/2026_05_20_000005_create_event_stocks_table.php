<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('event_stocks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained();
            $table->string('sku_code')->nullable();
            $table->string('sku_name');
            $table->unsignedInteger('qty_initial')->default(0);
            $table->integer('qty_current')->default(0);
            $table->decimal('price', 12, 2)->nullable();
            $table->timestamps();

            $table->unique(['event_id', 'store_id', 'sku_code']);
            $table->index(['event_id', 'store_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('event_stocks');
    }
};
