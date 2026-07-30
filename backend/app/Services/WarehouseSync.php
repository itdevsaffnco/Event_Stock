<?php

namespace App\Services;

use App\Models\WarehouseStock;

/**
 * Warehouse (Kelola Stock Gudang) adalah satu-satunya sumber kebenaran untuk qty.
 * EventStock.qty_current SELALU mencerminkan WarehouseStock.qty_available milik
 * warehouse tempat store itu berada - keduanya harus berubah bersamaan:
 *   - Transaksi di Event (penjualan/tester/pengiriman/koreksi log) -> ikut ubah Warehouse.
 *   - Edit qty di Kelola Stock Gudang -> ikut ubah semua EventStock event aktif yang
 *     memakai warehouse & SKU tsb (lihat WarehouseController::bulkUpdateStocks).
 */
class WarehouseSync
{
    public static function applyDelta(?int $warehouseId, string $skuName, int $delta): void
    {
        if (!$warehouseId || $delta === 0) {
            return;
        }

        $stock = WarehouseStock::where('warehouse_id', $warehouseId)
            ->where('sku_name', $skuName)
            ->first();

        if (!$stock) {
            return;
        }

        $stock->qty_available = max(0, $stock->qty_available + $delta);
        $stock->save();
    }
}
