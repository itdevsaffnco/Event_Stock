<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\StockLog;
use Illuminate\Http\Request;

class StockLogController extends Controller
{
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
        $data = $request->validate([
            'qty'   => 'required|integer',
            'notes' => 'nullable|string',
            'type'  => 'in:adjustment',
        ]);

        $log->update($data);
        $log->eventStock->recalculateQty();

        return response()->json(['data' => $log, 'message' => 'Log berhasil diupdate.']);
    }

    public function destroy(StockLog $log)
    {
        if ($log->type === 'initial') {
            return response()->json(['message' => 'Log initial tidak bisa dihapus.'], 422);
        }

        $eventStock = $log->eventStock;
        $log->delete();
        $eventStock->recalculateQty();

        return response()->json(['message' => 'Log berhasil dihapus.']);
    }
}
