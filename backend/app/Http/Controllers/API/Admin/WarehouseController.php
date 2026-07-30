<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\EventStock;
use App\Models\StockLog;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $warehouses = Warehouse::query()
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->withCount(['stores', 'warehouseStocks'])
            ->latest()
            ->paginate(15);

        return response()->json($warehouses);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'      => 'required|string|max:255',
            'location'  => 'nullable|string|max:255',
            'address'   => 'nullable|string',
            'pic_name'  => 'nullable|string|max:255',
            'pic_phone' => 'nullable|string|max:20',
            'status'    => 'in:active,inactive',
            // Stocks opsional saat buat gudang
            'stocks'                => 'nullable|array',
            'stocks.*.sku_name'     => 'required_with:stocks|string|max:255',
            'stocks.*.sku_code'     => 'nullable|string|max:100',
            'stocks.*.qty_available'=> 'required_with:stocks|integer|min:0',
            'stocks.*.price'        => 'nullable|numeric|min:0',
        ]);

        $warehouse = DB::transaction(function () use ($data) {
            $wh = Warehouse::create([
                'name'      => $data['name'],
                'location'  => $data['location']  ?? null,
                'address'   => $data['address']   ?? null,
                'pic_name'  => $data['pic_name']  ?? null,
                'pic_phone' => $data['pic_phone'] ?? null,
                'status'    => $data['status']    ?? 'active',
            ]);

            if (!empty($data['stocks'])) {
                $stocks = array_map(fn($s) => [
                    'warehouse_id'  => $wh->id,
                    'sku_code'      => $s['sku_code'] ?? null,
                    'sku_name'      => $s['sku_name'],
                    'qty_available' => $s['qty_available'],
                    'price'         => $s['price'] ?? null,
                    'created_at'    => now(),
                    'updated_at'    => now(),
                ], $data['stocks']);

                WarehouseStock::insert($stocks);
            }

            return $wh->loadCount('stores')->load('warehouseStocks');
        });

        return response()->json([
            'data'    => $warehouse,
            'message' => 'Warehouse berhasil dibuat.',
        ], 201);
    }

    public function show(Warehouse $warehouse)
    {
        $warehouse->loadCount('stores')->load('warehouseStocks', 'stores');
        return response()->json(['data' => $warehouse]);
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $data = $request->validate([
            'name'      => 'sometimes|required|string|max:255',
            'location'  => 'nullable|string|max:255',
            'address'   => 'nullable|string',
            'pic_name'  => 'nullable|string|max:255',
            'pic_phone' => 'nullable|string|max:20',
            'status'    => 'in:active,inactive',
        ]);

        $warehouse->update($data);

        // Warehouse dengan tepat 1 store dianggap merepresentasikan store itu,
        // jadi nama store ikut disamakan. Kalau lebih dari 1, ambigu — tidak disentuh.
        if (!empty($data['name']) && $warehouse->stores()->count() === 1) {
            $warehouse->stores()->update(['name' => $data['name']]);
        }

        return response()->json(['data' => $warehouse, 'message' => 'Warehouse berhasil diupdate.']);
    }

    public function destroy(Warehouse $warehouse)
    {
        if ($warehouse->events()->exists()) {
            return response()->json([
                'message' => 'Warehouse tidak bisa dihapus karena terlibat dalam event.',
            ], 422);
        }

        $warehouse->delete();
        return response()->json(['message' => 'Warehouse berhasil dihapus.']);
    }

    public function getStores(Warehouse $warehouse)
    {
        $stores = $warehouse->stores()->where('status', 'active')->get(['id', 'name', 'pic_name', 'pic_phone']);
        return response()->json(['data' => $stores]);
    }

    // ── Warehouse Stock endpoints ──────────────────────────────────────────

    public function getStocks(Warehouse $warehouse)
    {
        return response()->json(['data' => $warehouse->warehouseStocks()->orderBy('sku_name')->get()]);
    }

    public function bulkUpdateStocks(Request $request, Warehouse $warehouse)
    {
        $validated = $request->validate([
            'stocks'                => 'required|array|min:1',
            'stocks.*.sku_name'     => 'required|string|max:255',
            'stocks.*.sku_code'     => 'nullable|string|max:100',
            'stocks.*.qty_available'=> 'required|integer|min:0',
            'stocks.*.price'        => 'nullable|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated, $warehouse) {
            // Simpan qty lama per SKU dulu, untuk menghitung selisih yang perlu
            // disinkronkan ke EventStock event aktif setelah stock gudang diganti.
            $oldQtyBySku = $warehouse->warehouseStocks()->pluck('qty_available', 'sku_name');

            // Replace all stocks dengan yang baru
            $warehouse->warehouseStocks()->delete();

            $stocks = array_map(fn($s) => [
                'warehouse_id'  => $warehouse->id,
                'sku_code'      => $s['sku_code'] ?? null,
                'sku_name'      => $s['sku_name'],
                'qty_available' => $s['qty_available'],
                'price'         => $s['price'] ?? null,
                'created_at'    => now(),
                'updated_at'    => now(),
            ], $validated['stocks']);

            WarehouseStock::insert($stocks);

            // Warehouse adalah sumber kebenaran - EventStock event AKTIF yang memakai
            // warehouse & SKU ini di-SET supaya PERSIS SAMA dengan qty warehouse yang
            // baru. Dicek per-baris EventStock (bukan dilewati hanya karena qty
            // warehouse-nya sendiri kebetulan tidak berubah di save ini) supaya drift
            // lama di event tetap ikut terkoreksi kapan pun "Simpan Stock" ditekan.
            // Tetap tercatat sebagai StockLog type=adjustment untuk jejak audit.
            $newQtyBySku = collect($validated['stocks'])->pluck('qty_available', 'sku_name');
            $allSkuNames = $oldQtyBySku->keys()->merge($newQtyBySku->keys())->unique();

            foreach ($allSkuNames as $skuName) {
                $newQty = (int) ($newQtyBySku[$skuName] ?? 0);

                EventStock::where('sku_name', $skuName)
                    ->whereHas('store', fn($q) => $q->where('warehouse_id', $warehouse->id))
                    ->whereHas('event', fn($q) => $q->where('status', 'active'))
                    ->each(function (EventStock $es) use ($newQty) {
                        $delta = $newQty - $es->qty_current;
                        if ($delta === 0) {
                            return;
                        }

                        $es->qty_current = $newQty;
                        $es->save();

                        StockLog::create([
                            'event_stock_id' => $es->id,
                            'event_id'       => $es->event_id,
                            'store_id'       => $es->store_id,
                            'user_id'        => auth()->id(),
                            'type'           => 'adjustment',
                            'qty'            => $delta,
                            'notes'          => 'Sinkron otomatis dari perubahan stok gudang',
                            'logged_at'      => now(),
                        ]);
                    });
            }
        });

        return response()->json([
            'message' => 'Stock gudang berhasil diupdate.',
            'data'    => $warehouse->warehouseStocks()->get(),
        ]);
    }

    public function destroyStock(Warehouse $warehouse, WarehouseStock $stock)
    {
        abort_if($stock->warehouse_id !== $warehouse->id, 404);
        $stock->delete();
        return response()->json(['message' => 'Stock berhasil dihapus.']);
    }
}
