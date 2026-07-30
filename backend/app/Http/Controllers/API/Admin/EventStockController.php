<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventStock;
use App\Models\StockLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventStockController extends Controller
{
    public function index(Request $request, Event $event)
    {
        $stocks = EventStock::query()
            ->where('event_id', $event->id)
            ->with('store:id,name,warehouse_id', 'store.warehouse:id,name')
            ->when($request->store_id, fn($q, $id) => $q->where('store_id', $id))
            ->when($request->warehouse_id, fn($q, $id) => $q->whereHas('store', fn($sq) => $sq->where('warehouse_id', $id)))
            ->when($request->search, fn($q, $s) => $q->where('sku_name', 'like', "%{$s}%")->orWhere('sku_code', 'like', "%{$s}%"))
            ->orderBy('store_id')
            ->orderBy('sku_name')
            ->get()
            ->map(fn($s) => [
                'id'          => $s->id,
                'store_id'    => $s->store_id,
                'store'       => $s->store,
                'sku_code'    => $s->sku_code,
                'sku_name'    => $s->sku_name,
                'qty_initial' => $s->qty_initial,
                'qty_current' => $s->qty_current,
                'qty_sold'    => abs($s->logs()->where('type', 'penjualan')->sum('qty')),
                'qty_tester'  => abs($s->logs()->where('type', 'tester')->sum('qty')),
                'price'       => $s->price,
            ]);

        return response()->json(['data' => $stocks]);
    }

    public function bulkStore(Request $request, Event $event)
    {
        $validated = $request->validate([
            'stocks'                => 'required|array|min:1',
            'stocks.*.store_id'     => 'required|exists:stores,id',
            'stocks.*.sku_name'     => 'required|string|max:255',
            'stocks.*.sku_code'     => 'nullable|string|max:100',
            'stocks.*.qty_initial'  => 'required|integer|min:0',
            'stocks.*.price'        => 'nullable|numeric|min:0',
        ]);

        // Validasi: store harus dari warehouse yang terlibat di event
        $validStoreIds = $event->availableStores()->pluck('id')->toArray();
        foreach ($validated['stocks'] as $idx => $s) {
            if (!in_array($s['store_id'], $validStoreIds)) {
                return response()->json([
                    'message' => "Baris " . ($idx + 1) . ": Store tidak termasuk dalam warehouse event ini.",
                ], 422);
            }
        }

        DB::transaction(function () use ($validated, $event) {
            foreach ($validated['stocks'] as $stockData) {
                $eventStock = EventStock::updateOrCreate(
                    [
                        'event_id' => $event->id,
                        'store_id' => $stockData['store_id'],
                        'sku_name' => $stockData['sku_name'],
                    ],
                    [
                        'sku_code'    => $stockData['sku_code'] ?? null,
                        'qty_initial' => $stockData['qty_initial'],
                        'qty_current' => $stockData['qty_initial'],
                        'price'       => $stockData['price'] ?? null,
                    ]
                );

                StockLog::updateOrCreate(
                    ['event_stock_id' => $eventStock->id, 'type' => 'initial'],
                    [
                        'event_id'  => $event->id,
                        'store_id'  => $stockData['store_id'],
                        'user_id'   => auth()->id(),
                        'qty'       => $stockData['qty_initial'],
                        'logged_at' => now(),
                    ]
                );
            }
        });

        return response()->json([
            'message' => count($validated['stocks']) . ' stock awal berhasil disimpan.',
        ], 201);
    }

    public function update(Request $request, Event $event, EventStock $stock)
    {
        $data = $request->validate([
            'sku_name'    => 'sometimes|required|string|max:255',
            'qty_initial' => 'sometimes|integer|min:0',
            'price'       => 'nullable|numeric|min:0',
        ]);

        $stock->update($data);

        if (isset($data['qty_initial'])) {
            StockLog::where(['event_stock_id' => $stock->id, 'type' => 'initial'])
                    ->update(['qty' => $data['qty_initial']]);
            $stock->recalculateQty();
        }

        return response()->json(['data' => $stock, 'message' => 'Stock berhasil diupdate.']);
    }

    // Menyesuaikan qty_current SKU yang SUDAH ADA di event aktif - dipakai saat stok
    // gudang bertambah/berkurang setelah SKU tsb diimpor ke event (EventStock adalah
    // salinan sekali-jalan, tidak sync otomatis dengan WarehouseStock). Dicatat sebagai
    // StockLog type=adjustment supaya ada jejak audit, bukan overwrite diam-diam.
    public function adjust(Request $request, Event $event, EventStock $stock)
    {
        if ($stock->event_id !== $event->id) {
            return response()->json(['message' => 'Stock tidak valid untuk event ini.'], 422);
        }

        if ($event->status === 'closed') {
            return response()->json(['message' => 'Event sudah ditutup, stok tidak bisa disesuaikan.'], 422);
        }

        $data = $request->validate([
            'qty'   => 'required|integer|not_in:0',
            'notes' => 'nullable|string|max:500',
        ]);

        if ($stock->qty_current + $data['qty'] < 0) {
            return response()->json([
                'message' => "Penyesuaian akan membuat stok negatif. Stok saat ini {$stock->qty_current} pcs.",
            ], 422);
        }

        DB::transaction(function () use ($data, $event, $stock) {
            StockLog::create([
                'event_stock_id' => $stock->id,
                'event_id'       => $event->id,
                'store_id'       => $stock->store_id,
                'user_id'        => auth()->id(),
                'type'           => 'adjustment',
                'qty'            => $data['qty'],
                'notes'          => $data['notes'] ?? null,
                'logged_at'      => now(),
            ]);
            $stock->increment('qty_current', $data['qty']);
        });

        return response()->json(['data' => $stock->fresh(), 'message' => 'Stok berhasil disesuaikan.']);
    }

    public function destroy(Event $event, EventStock $stock)
    {
        if ($stock->logs()->where('type', '!=', 'initial')->exists()) {
            return response()->json(['message' => 'Tidak bisa dihapus karena sudah ada transaksi.'], 422);
        }

        $stock->logs()->delete();
        $stock->delete();
        return response()->json(['message' => 'Stock berhasil dihapus.']);
    }

    // Import dari warehouse stocks sebagai template
    public function importFromWarehouse(Request $request, Event $event)
    {
        $data = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'store_id'     => 'required|exists:stores,id',
        ]);

        // Validasi warehouse terlibat di event
        if (!in_array($data['warehouse_id'], $event->warehouseIds())) {
            return response()->json(['message' => 'Warehouse tidak terlibat dalam event ini.'], 422);
        }

        $stocks = \App\Models\WarehouseStock::where('warehouse_id', $data['warehouse_id'])->get();

        return response()->json([
            'data'    => $stocks,
            'message' => count($stocks) . ' item ditemukan.',
        ]);
    }
}
