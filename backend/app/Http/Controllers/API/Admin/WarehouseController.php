<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\EventStock;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
use App\Services\EventStockSync;
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
            ->with('openEvents:events.id,events.name,events.code,events.status')
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

            // Tidak ada UI untuk kelola store — 1 warehouse = 1 store. Tanpa store ini,
            // stock gudang tidak bisa di-import ke event dan staff tidak punya pilihan store.
            $wh->stores()->create([
                'name'      => $wh->name,
                'pic_name'  => $wh->pic_name,
                'pic_phone' => $wh->pic_phone,
                'status'    => 'active',
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
            'stocks.*.id'           => 'nullable|integer',
            'stocks.*.qty_original' => 'nullable|integer|min:0',
            'stocks.*.sku_name'     => 'required|string|max:255|distinct',
            'stocks.*.sku_code'     => 'nullable|string|max:100',
            'stocks.*.qty_available'=> 'required|integer|min:0',
            'stocks.*.price'        => 'nullable|numeric|min:0',
        ], [
            'stocks.*.sku_name.distinct' => 'Nama SKU ":input" muncul lebih dari sekali.',
        ]);

        DB::transaction(function () use ($validated, $warehouse) {
            // Update baris yang sudah ada (bukan hapus + insert ulang) dan dikunci,
            // supaya transaksi staff yang masuk bersamaan tidak hilang.
            $existing = $warehouse->warehouseStocks()->lockForUpdate()->get()->keyBy('id');

            // Pasangkan baris kiriman ke baris DB: berdasarkan id dulu, lalu nama SKU
            // (untuk import CSV yang tidak membawa id).
            $claimed = [];
            $matches = [];
            foreach ($validated['stocks'] as $i => $row) {
                if (!empty($row['id']) && $existing->has($row['id'])) {
                    $matches[$i] = $existing[$row['id']];
                    $claimed[$row['id']] = true;
                }
            }
            foreach ($validated['stocks'] as $i => $row) {
                if (isset($matches[$i])) continue;
                $byName = $existing->first(fn($s) => !isset($claimed[$s->id]) && $s->sku_name === $row['sku_name']);
                if ($byName) {
                    $matches[$i] = $byName;
                    $claimed[$byName->id] = true;
                }
            }

            $renames = [];
            foreach ($validated['stocks'] as $i => $row) {
                $stock = $matches[$i] ?? null;

                if (!$stock) {
                    $stock = $warehouse->warehouseStocks()->create([
                        'sku_code'      => $row['sku_code'] ?? null,
                        'sku_name'      => $row['sku_name'],
                        'qty_available' => $row['qty_available'],
                        'price'         => $row['price'] ?? null,
                    ]);
                    continue;
                }

                // Kalau admin tidak mengubah qty, qty terbaru di DB yang dipakai (bisa saja
                // sudah berkurang karena penjualan sejak halaman dibuka). Kalau diubah,
                // hanya selisih perubahan admin yang diterapkan di atas qty terbaru.
                $qty = isset($row['qty_original'])
                    ? max(0, $stock->qty_available + ($row['qty_available'] - $row['qty_original']))
                    : $row['qty_available'];

                if ($stock->sku_name !== $row['sku_name']) {
                    $renames[$stock->sku_name] = $row['sku_name'];
                }

                $stock->update([
                    'sku_code'      => $row['sku_code'] ?? null,
                    'sku_name'      => $row['sku_name'],
                    'qty_available' => $qty,
                    'price'         => $row['price'] ?? null,
                ]);
            }

            // Baris yang tidak dikirim lagi = dihapus admin.
            foreach ($existing as $stock) {
                if (!isset($claimed[$stock->id])) {
                    $stock->delete();
                }
            }

            // Rename SKU ikut diterapkan ke EventStock event yang belum ditutup, supaya
            // SKU tetap tersambung ke gudang (pencocokan memakai sku_name).
            foreach ($renames as $oldName => $newName) {
                EventStock::where('sku_name', $oldName)
                    ->whereHas('store', fn($q) => $q->where('warehouse_id', $warehouse->id))
                    ->whereHas('event', fn($q) => $q->whereIn('status', ['draft', 'active']))
                    ->each(function (EventStock $es) use ($newName) {
                        $taken = EventStock::where('event_id', $es->event_id)
                            ->where('store_id', $es->store_id)
                            ->where('sku_name', $newName)
                            ->exists();
                        if (!$taken) {
                            $es->update(['sku_name' => $newName]);
                        }
                    });
            }

            // Stock event yang memakai warehouse ini ikut disamakan: SKU baru otomatis
            // masuk, qty disetel sama dengan gudang, SKU yang dihapus jadi 0.
            EventStockSync::syncWarehouse($warehouse);
        }, 3); // ulangi otomatis kalau bentrok lock dengan transaksi staff

        return response()->json([
            'message' => 'Stock gudang berhasil diupdate.',
            'data'    => $warehouse->warehouseStocks()->orderBy('sku_name')->get(),
        ]);
    }

    public function destroyStock(Warehouse $warehouse, WarehouseStock $stock)
    {
        abort_if($stock->warehouse_id !== $warehouse->id, 404);
        DB::transaction(function () use ($warehouse, $stock) {
            $stock->delete();
            EventStockSync::syncWarehouse($warehouse);
        }, 3);
        return response()->json(['message' => 'Stock berhasil dihapus.']);
    }
}
