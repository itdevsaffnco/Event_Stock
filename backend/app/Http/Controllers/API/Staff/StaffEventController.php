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
            try {
                DB::transaction(function () use ($data, $event, $eventStock, $loggedAt) {
                    // Cek stok di dalam transaksi + lock, supaya 2 staff yang input
                    // bersamaan tidak bisa membuat stok minus.
                    $eventStock = EventStock::lockForUpdate()->find($eventStock->id);
                    if ($eventStock->qty_current === 0) {
                        throw new \DomainException('Stok produk ini sudah habis.');
                    }
                    if ($eventStock->qty_current < $data['qty']) {
                        throw new \DomainException("Stok tidak mencukupi. Tersisa {$eventStock->qty_current} pcs.");
                    }

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
                }, 3); // ulangi otomatis kalau bentrok lock (deadlock / database is locked)
            } catch (\DomainException $e) {
                return response()->json(['message' => $e->getMessage()], 422);
            }

            return response()->json([
                'message'     => 'Transaksi berhasil dicatat.',
                'qty_current' => $eventStock->fresh()->qty_current,
            ], 201);
        }

        // ── Pengiriman: transfer antar store ──────────────────────────────────
        if (!in_array($data['to_store_id'], $validStoreIds)) {
            return response()->json(['message' => 'Store tujuan tidak valid untuk event ini.'], 422);
        }

        if ((int) $data['to_store_id'] === $eventStock->store_id) {
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

        try {
            DB::transaction(function () use ($data, $event, $eventStock, $destStock, $loggedAt) {
                $eventStock = EventStock::lockForUpdate()->find($eventStock->id);
                if ($eventStock->qty_current === 0) {
                    throw new \DomainException('Stok produk ini sudah habis di store asal.');
                }
                if ($eventStock->qty_current < $data['qty']) {
                    throw new \DomainException("Stok tidak mencukupi di store asal. Tersisa {$eventStock->qty_current} pcs.");
                }

                $this->writePengiriman($data, $event, $eventStock, $destStock, $loggedAt);
            }, 3);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json([
            'message'     => 'Pengiriman berhasil dicatat.',
            'qty_current' => $eventStock->fresh()->qty_current,
        ], 201);
    }

    private function writePengiriman(array $data, Event $event, EventStock $eventStock, EventStock $destStock, $loggedAt): void
    {
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

        // Validate & write inside one transaction with row-level locks. Error dilempar
        // sebagai exception supaya SELURUH item di-rollback — kalau hanya `return`,
        // item yang sudah ditulis sebelumnya ikut ter-commit dan tercatat dobel saat staff kirim ulang.
        try {
            DB::transaction(function () use ($data, $event, $itemMap, $loggedAt) {
                foreach ($itemMap as $item) {
                    $stock = EventStock::lockForUpdate()->find($item['id']);

                    if ($stock->qty_current === 0) {
                        throw new \DomainException("Stok {$item['name']} sudah habis.");
                    }
                    if ($stock->qty_current < $item['qty']) {
                        throw new \DomainException("Stok {$item['name']} tidak mencukupi (tersisa {$stock->qty_current} pcs).");
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
            }, 3);
        } catch (\DomainException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
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
