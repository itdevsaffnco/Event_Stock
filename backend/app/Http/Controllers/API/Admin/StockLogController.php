<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\EventStock;
use App\Models\StockLog;
use App\Services\WarehouseSync;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class StockLogController extends Controller
{
    // Hitung ulang qty_current dari StockLog, lalu terapkan selisihnya (delta) ke
    // WarehouseStock terkait - supaya koreksi transaksi tetap konsisten dengan gudang.
    private function recalculateAndSync(EventStock $stock): void
    {
        $before = $stock->qty_current;
        $stock->recalculateQty();
        $delta = $stock->qty_current - $before;
        if ($delta !== 0) {
            WarehouseSync::applyDelta($stock->store->warehouse_id, $stock->sku_name, $delta);
        }
    }

    public function index(Request $request, Event $event)
    {
        $logs = StockLog::query()
            ->where('event_id', $event->id)
            ->with('store:id,name', 'user:id,name', 'eventStock:id,sku_name,sku_code')
            ->when($request->type, fn($q, $t) => $q->where('type', $t))
            ->when($request->store_id, fn($q, $id) => $q->where('store_id', $id))
            ->when($request->date, fn($q, $d) => $q->whereDate('logged_at', $d))
            ->when($request->date_from, fn($q, $d) => $q->where('logged_at', '>=', $d))
            ->when($request->date_to, fn($q, $d) => $q->where('logged_at', '<=', $d . ' 23:59:59'))
            ->orderByDesc('logged_at')
            ->paginate(20);

        return response()->json($logs);
    }

    public function show(StockLog $log)
    {
        $log->load('store:id,name', 'user:id,name', 'eventStock:id,sku_name,sku_code', 'event:id,name,code');
        return response()->json(['data' => $log]);
    }

    public function update(Request $request, StockLog $log)
    {
        if ($log->type === 'initial') {
            return response()->json(['message' => 'Log initial tidak bisa diedit.'], 422);
        }

        // Pengiriman: only metadata editable (editing qty would break the paired leg)
        if ($log->type === 'pengiriman') {
            $data = $request->validate([
                'notes'        => 'nullable|string|max:500',
                'reference_no' => 'nullable|string|max:100',
                'logged_at'    => 'nullable|date',
            ]);
        } else {
            $data = $request->validate([
                'qty'          => 'required|integer|not_in:0',
                'notes'        => 'nullable|string|max:500',
                'reference_no' => 'nullable|string|max:100',
                'logged_at'    => 'nullable|date',
            ]);
            // Penjualan/tester selalu mengurangi stok - qty disimpan negatif.
            // Adjustment boleh plus atau minus (tanda yang diinput admin dipertahankan apa adanya).
            if (isset($data['qty']) && in_array($log->type, ['penjualan', 'tester'])) {
                $data['qty'] = -abs($data['qty']);
            }
        }

        $log->update($data);

        if ($log->eventStock) {
            $this->recalculateAndSync($log->eventStock);
        }

        $log->load('store:id,name', 'user:id,name', 'eventStock:id,sku_name,sku_code', 'event:id,name');
        return response()->json(['data' => $log, 'message' => 'Transaksi berhasil diupdate.']);
    }

    public function destroy(StockLog $log)
    {
        if ($log->type === 'initial') {
            return response()->json(['message' => 'Log initial tidak bisa dihapus.'], 422);
        }

        $eventStock = $log->eventStock;

        if ($log->type === 'pengiriman') {
            // Match by pair_id (exact); fall back to old heuristic for legacy logs without pair_id
            $paired = $log->pair_id
                ? StockLog::where('pair_id', $log->pair_id)->where('id', '!=', $log->id)->first()
                : StockLog::where('event_id', $log->event_id)
                    ->where('type', 'pengiriman')
                    ->where('id', '!=', $log->id)
                    ->whereRaw('ABS(qty) = ?', [abs($log->qty)])
                    ->where('logged_at', $log->logged_at)
                    ->first();

            DB::transaction(function () use ($log, $eventStock, $paired) {
                $log->delete();
                if ($eventStock) $this->recalculateAndSync($eventStock);

                if ($paired) {
                    $pairedStock = $paired->eventStock;
                    $paired->delete();
                    if ($pairedStock) $this->recalculateAndSync($pairedStock);
                }
            });
        } else {
            $log->delete();
            if ($eventStock) $this->recalculateAndSync($eventStock);
        }

        return response()->json(['message' => 'Log berhasil dihapus.']);
    }
}
