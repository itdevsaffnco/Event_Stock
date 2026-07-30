<?php

namespace App\Http\Controllers\API\Staff;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventStock;
use App\Models\StockLog;
use App\Services\WarehouseSync;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class StaffEventController extends Controller
{
    public function getActiveEvents()
    {
        $events = Event::query()
            ->with('warehouses:id,name')
            ->where('status', 'active')
            ->latest()
            ->get(['id', 'name', 'code', 'status', 'start_date', 'end_date']);

        return response()->json(['data' => $events]);
    }

    public function getEventDetail(Event $event)
    {
        if ($event->status !== 'active') {
            return response()->json(['message' => 'Event tidak aktif.'], 422);
        }

        $event->load('warehouses:id,name,location');
        $stores     = $event->availableStores();
        $warehouses = $event->warehouses()->get(['warehouses.id', 'warehouses.name']);

        return response()->json([
            'data'       => $event,
            'stores'     => $stores,
            'warehouses' => $warehouses,   // Dipakai saat input pengiriman
        ]);
    }

    public function getStocks(Request $request, Event $event)
    {
        $request->validate(['store_id' => 'required|exists:stores,id']);

        // Validasi store ada di salah satu warehouse event
        $validStoreIds = $event->availableStores()->pluck('id')->toArray();
        if (!in_array($request->store_id, $validStoreIds)) {
            return response()->json(['message' => 'Store tidak valid untuk event ini.'], 422);
        }

        $stocks = EventStock::query()
            ->where('event_id', $event->id)
            ->where('store_id', $request->store_id)
            ->orderBy('sku_name')
            ->get(['id', 'sku_code', 'sku_name', 'qty_current', 'price']);

        return response()->json(['data' => $stocks]);
    }

    public function createLog(Request $request, Event $event)
    {
        if ($event->status !== 'active') {
            return response()->json(['message' => 'Event tidak aktif.'], 422);
        }

        $data = $request->validate([
            'event_stock_id' => 'required|exists:event_stocks,id',
            'type'           => 'required|in:penjualan,tester,pengiriman',
            'qty'            => 'required|integer|min:1',
            'to_store_id'    => 'required_if:type,pengiriman|nullable|exists:stores,id',
            'notes'          => 'nullable|string|max:500',
            'reference_no'   => 'nullable|string|max:100',
            'logged_at'      => 'nullable|date',
        ]);

        $eventStock = EventStock::findOrFail($data['event_stock_id']);

        if ($eventStock->event_id !== $event->id) {
            return response()->json(['message' => 'Stock tidak valid.'], 422);
        }

        $validStoreIds = $event->availableStores()->pluck('id')->toArray();
        if (!in_array($eventStock->store_id, $validStoreIds)) {
            return response()->json(['message' => 'Store tidak termasuk dalam warehouse event.'], 422);
        }

        // If only a date string (YYYY-MM-DD) was submitted, attach the current time
        $loggedAt = isset($data['logged_at'])
            ? \Carbon\Carbon::parse($data['logged_at'])->setTimeFrom(now())
            : now();

        // ── Penjualan / Tester: kurangi stok ─────────────────────────────────
        if (in_array($data['type'], ['penjualan', 'tester'])) {
            if ($eventStock->qty_current === 0) {
                return response()->json(['message' => 'Stok produk ini sudah habis.'], 422);
            }
            if ($eventStock->qty_current < $data['qty']) {
                return response()->json(['message' => "Stok tidak mencukupi. Tersisa {$eventStock->qty_current} pcs."], 422);
            }

            DB::transaction(function () use ($data, $event, $eventStock, $loggedAt) {
                StockLog::create([
                    'event_stock_id' => $eventStock->id,
                    'event_id'       => $event->id,
                    'store_id'       => $eventStock->store_id,
                    'user_id'        => auth()->id(),
                    'type'           => $data['type'],
                    'qty'            => -abs($data['qty']),
                    'notes'          => $data['notes'] ?? null,
                    'reference_no'   => $data['reference_no'] ?? null,
                    'logged_at'      => $loggedAt,
                ]);
                $eventStock->decrement('qty_current', abs($data['qty']));
                WarehouseSync::applyDelta($eventStock->store->warehouse_id, $eventStock->sku_name, -abs($data['qty']));
            });

            return response()->json([
                'message'     => 'Transaksi berhasil dicatat.',
                'qty_current' => $eventStock->fresh()->qty_current,
            ], 201);
        }

        // ── Pengiriman: transfer antar store ──────────────────────────────────
        if (!in_array($data['to_store_id'], $validStoreIds)) {
            return response()->json(['message' => 'Store tujuan tidak valid untuk event ini.'], 422);
        }

        if ($data['to_store_id'] === $eventStock->store_id) {
            return response()->json(['message' => 'Store asal dan tujuan tidak boleh sama.'], 422);
        }

        $destStock = EventStock::where([
            'event_id' => $event->id,
            'store_id' => $data['to_store_id'],
            'sku_name' => $eventStock->sku_name,
        ])->first();

        if (!$destStock) {
            return response()->json([
                'message' => 'Produk "' . $eventStock->sku_name . '" tidak ditemukan di store tujuan.',
            ], 422);
        }

        if ($eventStock->qty_current === 0) {
            return response()->json(['message' => 'Stok produk ini sudah habis di store asal.'], 422);
        }
        if ($eventStock->qty_current < $data['qty']) {
            return response()->json(['message' => "Stok tidak mencukupi di store asal. Tersisa {$eventStock->qty_current} pcs."], 422);
        }

        DB::transaction(function () use ($data, $event, $eventStock, $destStock, $loggedAt) {
            $qty    = abs($data['qty']);
            $userId = auth()->id();
            $pairId = Str::uuid()->toString();

            // Kurangi store asal
            StockLog::create([
                'event_stock_id' => $eventStock->id,
                'event_id'       => $event->id,
                'store_id'       => $eventStock->store_id,
                'user_id'        => $userId,
                'to_store_id'    => $data['to_store_id'],
                'pair_id'        => $pairId,
                'type'           => 'pengiriman',
                'qty'            => -$qty,
                'notes'          => $data['notes'] ?? null,
                'reference_no'   => $data['reference_no'] ?? null,
                'logged_at'      => $loggedAt,
            ]);
            $eventStock->decrement('qty_current', $qty);
            WarehouseSync::applyDelta($eventStock->store->warehouse_id, $eventStock->sku_name, -$qty);

            // Tambah store tujuan
            StockLog::create([
                'event_stock_id' => $destStock->id,
                'event_id'       => $event->id,
                'store_id'       => $destStock->store_id,
                'user_id'        => $userId,
                'pair_id'        => $pairId,
                'type'           => 'pengiriman',
                'qty'            => $qty,
                'notes'          => $data['notes'] ?? null,
                'reference_no'   => $data['reference_no'] ?? null,
                'logged_at'      => $loggedAt,
            ]);
            $destStock->increment('qty_current', $qty);
            WarehouseSync::applyDelta($destStock->store->warehouse_id, $destStock->sku_name, $qty);
        });

        return response()->json([
            'message'     => 'Pengiriman berhasil dicatat.',
            'qty_current' => $eventStock->fresh()->qty_current,
        ], 201);
    }

    public function createBulkLog(Request $request, Event $event)
    {
        if ($event->status !== 'active') {
            return response()->json(['message' => 'Event tidak aktif.'], 422);
        }

        $data = $request->validate([
            'type'                   => 'required|in:penjualan,tester',
            'store_id'               => 'required|exists:stores,id',
            'logged_at'              => 'nullable|date',
            'notes'                  => 'nullable|string|max:500',
            'items'                  => 'required|array|min:1',
            'items.*.event_stock_id' => 'required|exists:event_stocks,id',
            'items.*.qty'            => 'required|integer|min:1',
        ]);

        $loggedAt = isset($data['logged_at'])
            ? \Carbon\Carbon::parse($data['logged_at'])->setTimeFrom(now())
            : now();

        $validStoreIds = $event->availableStores()->pluck('id')->toArray();
        if (!in_array($data['store_id'], $validStoreIds)) {
            return response()->json(['message' => 'Store tidak valid untuk event ini.'], 422);
        }

        // Validate item ownership before entering transaction
        $itemMap = [];
        foreach ($data['items'] as $i => $item) {
            $stock = EventStock::find($item['event_stock_id']);
            if (!$stock || $stock->event_id !== $event->id || $stock->store_id !== (int) $data['store_id']) {
                return response()->json(['message' => 'Item #' . ($i + 1) . ': Produk tidak valid untuk store ini.'], 422);
            }
            $itemMap[] = ['id' => $stock->id, 'qty' => $item['qty'], 'name' => $stock->sku_name];
        }

        // Validate & write inside one transaction with row-level locks
        $error = null;
        DB::transaction(function () use ($data, $event, $itemMap, $loggedAt, &$error) {
            foreach ($itemMap as $item) {
                $stock = EventStock::lockForUpdate()->find($item['id']);

                if ($stock->qty_current === 0) {
                    $error = "Stok {$item['name']} sudah habis.";
                    return;
                }
                if ($stock->qty_current < $item['qty']) {
                    $error = "Stok {$item['name']} tidak mencukupi (tersisa {$stock->qty_current} pcs).";
                    return;
                }

                StockLog::create([
                    'event_stock_id' => $stock->id,
                    'event_id'       => $event->id,
                    'store_id'       => $data['store_id'],
                    'user_id'        => auth()->id(),
                    'type'           => $data['type'],
                    'qty'            => -abs($item['qty']),
                    'notes'          => $data['notes'] ?? null,
                    'logged_at'      => $loggedAt,
                ]);
                $stock->decrement('qty_current', $item['qty']);
                WarehouseSync::applyDelta($stock->store->warehouse_id, $stock->sku_name, -$item['qty']);
            }
        });

        if ($error) {
            return response()->json(['message' => $error], 422);
        }

        return response()->json(['message' => 'Semua transaksi berhasil dicatat.'], 201);
    }

    public function getMyLogs(Request $request, Event $event)
    {
        $logs = StockLog::query()
            ->where('event_id', $event->id)
            ->where('user_id', auth()->id())
            ->with('eventStock:id,sku_name,sku_code', 'store:id,name', 'fromWarehouse:id,name')
            ->when($request->date, fn($q, $d) => $q->whereDate('logged_at', $d),
                   fn($q) => $q->whereDate('logged_at', today()))
            ->orderByDesc('logged_at')
            ->paginate(30);

        return response()->json($logs);
    }
}
