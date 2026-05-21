<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('stock_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_stock_id')->constrained()->cascadeOnDelete();
            $table->foreignId('event_id')->constrained()->cascadeOnDelete();
            $table->foreignId('store_id')->constrained();
            $table->foreignId('user_id')->constrained();
            // Sumber pengiriman — wajib diisi jika type = pengiriman
            $table->foreignId('from_warehouse_id')->nullable()->constrained('warehouses')->nullOnDelete();
            $table->enum('type', ['initial', 'penjualan', 'tester', 'pengiriman', 'adjustment']);
            $table->integer('qty');
            $table->decimal('price_per_unit', 12, 2)->nullable();
            $table->text('notes')->nullable();
            $table->string('reference_no')->nullable();
            $table->timestamp('logged_at');
            $table->timestamps();

            $table->index(['event_id', 'type', 'logged_at']);
            $table->index(['event_stock_id', 'logged_at']);
            $table->index(['store_id', 'logged_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('stock_logs');
    }
};
