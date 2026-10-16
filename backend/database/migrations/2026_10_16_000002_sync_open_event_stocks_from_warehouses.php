<?php

use App\Models\Event;
use App\Services\EventStockSync;
use Illuminate\Database\Migrations\Migration;

// Stock event sekarang otomatis mengikuti stok gudang (tanpa import manual).
// Saat deploy, tambahkan SKU gudang yang belum ada di event terbuka (event yang masih
// 0 SKU langsung terisi). Qty SKU yang sudah berjalan sengaja TIDAK diubah di sini.
return new class extends Migration
{
    public function up(): void
    {
        Event::whereIn('status', ['draft', 'active'])->each(fn(Event $event) => EventStockSync::syncEvent($event, onlyAddMissing: true));
    }

    public function down(): void
    {
        // Data backfill — tidak di-rollback.
    }
};
