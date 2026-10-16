<?php

namespace App\Services;

use App\Models\Event;
use App\Models\EventStock;
use App\Models\StockLog;
use App\Models\Warehouse;

/**
 * Stock event adalah cerminan Kelola Stock Gudang — tidak ada langkah import manual.
 * Untuk setiap event yang belum ditutup (draft/active) dan setiap store aktif di warehouse-nya:
 *   - SKU baru di gudang  -> otomatis dibuat di event (qty awal = qty gudang).
 *   - SKU yang sudah ada  -> draft: qty awal di-set ulang; active: qty_current di-set sama
 *                            dengan gudang (dicatat sebagai log adjustment).
 *   - SKU hilang di gudang -> draft: dihapus dari event; active: qty jadi 0 (riwayat tetap ada).
 * Satu warehouse hanya dipakai satu event terbuka (lihat EventController), jadi aman.
 */
class EventStockSync
{
    public static function syncWarehouse(Warehouse $warehouse): void
    {
        $warehouse->openEvents()->get()->each(fn(Event $event) => self::syncEventWarehouse($event, $warehouse));
    }

    // $onlyAddMissing: hanya tambahkan SKU yang belum ada, jangan ubah qty yang sudah berjalan
    public static function syncEvent(Event $event, bool $onlyAddMissing = false): void
    {
        $event = $event->fresh(); // event baru belum memuat default status 'draft' dari DB
        if (!in_array($event->status, ['draft', 'active'])) {
            return;
        }
        $event->warehouses()->get()->each(fn(Warehouse $wh) => self::syncEventWarehouse($event, $wh, $onlyAddMissing));
    }

    private static function syncEventWarehouse(Event $event, Warehouse $warehouse, bool $onlyAddMissing = false): void
    {
        $whStocks = $warehouse->warehouseStocks()->get()->keyBy('sku_name');
        $userId   = auth()->id() ?? $event->created_by;
        $isDraft  = $event->status === 'draft';

        foreach ($warehouse->activeStores()->get() as $store) {
            $existing = EventStock::where('event_id', $event->id)
                ->where('store_id', $store->id)
                ->get()
                ->keyBy('sku_name');
            $usedCodes = $existing->pluck('sku_code')->filter()->flip();

            foreach ($whStocks as $name => $ws) {
                $es = $existing->get($name);

                if (!$es) {
                    // sku_code unik per event+store — kalau bentrok, simpan tanpa kode
                    $code = $ws->sku_code && !$usedCodes->has($ws->sku_code) ? $ws->sku_code : null;
                    if ($code) $usedCodes[$code] = true;

                    $es = EventStock::create([
                        'event_id'    => $event->id,
                        'store_id'    => $store->id,
                        'sku_code'    => $code,
                        'sku_name'    => $name,
                        'qty_initial' => $ws->qty_available,
                        'qty_current' => $ws->qty_available,
                        'price'       => $ws->price,
                    ]);
                    StockLog::create([
                        'event_stock_id' => $es->id,
                        'event_id'       => $event->id,
                        'store_id'       => $store->id,
                        'user_id'        => $userId,
                        'type'           => 'initial',
                        'qty'            => $ws->qty_available,
                        'logged_at'      => now(),
                    ]);
                    continue;
                }

                if ($onlyAddMissing) continue;

                $es->price = $ws->price;

                if ($isDraft) {
                    // Belum ada transaksi di draft — qty awal cukup disamakan.
                    $es->qty_initial = $ws->qty_available;
                    $es->qty_current = $ws->qty_available;
                    $es->save();
                    StockLog::where(['event_stock_id' => $es->id, 'type' => 'initial'])
                        ->update(['qty' => $ws->qty_available]);
                    continue;
                }

                $delta = $ws->qty_available - $es->qty_current;
                if ($delta !== 0) {
                    $es->qty_current = $ws->qty_available;
                    StockLog::create([
                        'event_stock_id' => $es->id,
                        'event_id'       => $event->id,
                        'store_id'       => $store->id,
                        'user_id'        => $userId,
                        'type'           => 'adjustment',
                        'qty'            => $delta,
                        'notes'          => 'Sinkron otomatis dari perubahan stok gudang',
                        'logged_at'      => now(),
                    ]);
                }
                $es->save();
            }

            if ($onlyAddMissing) continue;

            // SKU yang sudah tidak ada di gudang
            foreach ($existing as $name => $es) {
                if ($whStocks->has($name)) continue;

                $hasTransactions = $es->logs()->where('type', '!=', 'initial')->exists();
                if ($isDraft && !$hasTransactions) {
                    $es->logs()->delete();
                    $es->delete();
                    continue;
                }

                if ($es->qty_current !== 0) {
                    StockLog::create([
                        'event_stock_id' => $es->id,
                        'event_id'       => $event->id,
                        'store_id'       => $store->id,
                        'user_id'        => $userId,
                        'type'           => 'adjustment',
                        'qty'            => -$es->qty_current,
                        'notes'          => 'Sinkron otomatis: SKU dihapus dari stok gudang',
                        'logged_at'      => now(),
                    ]);
                    $es->update(['qty_current' => 0]);
                }
            }
        }
    }
}
