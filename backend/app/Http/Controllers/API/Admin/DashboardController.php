<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use App\Models\StockLog;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function summary()
    {
        return response()->json([
            'total_events_active' => Event::where('status', 'active')->count(),
            'total_events'        => Event::count(),
            'sales_today'         => abs(StockLog::where('type', 'penjualan')
                                        ->whereDate('logged_at', today())->sum('qty')),
            'sales_this_month'    => abs(StockLog::where('type', 'penjualan')
                                        ->whereMonth('logged_at', now()->month)
                                        ->whereYear('logged_at', now()->year)->sum('qty')),
        ]);
    }

    public function salesChart(Request $request)
    {
        $eventId = $request->get('event_id');

        if ($request->filled('from') && $request->filled('to')) {
            $from = \Carbon\Carbon::parse($request->get('from'))->startOfDay();
            $to   = \Carbon\Carbon::parse($request->get('to'))->endOfDay();
        } else {
            $days = $request->get('range', '7d') === '30d' ? 30 : 7;
            $from = now()->subDays($days - 1)->startOfDay();
            $to   = now()->endOfDay();
        }

        $storeId = $request->get('store_id');

        // Only count outgoing movements (qty < 0) to avoid double-counting pengiriman
        $data = StockLog::query()
            ->selectRaw('DATE(logged_at) as date, type, SUM(ABS(qty)) as total_qty')
            ->whereIn('type', ['penjualan', 'tester', 'pengiriman'])
            ->where('qty', '<', 0)
            ->when($eventId, fn($q) => $q->where('event_id', $eventId))
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->whereBetween('logged_at', [$from, $to])
            ->groupBy('date', 'type')
            ->orderBy('date')
            ->get()
            ->groupBy('date');

        $filled = collect();
        $cursor = $from->copy()->startOfDay();
        while ($cursor->lte($to)) {
            $date  = $cursor->format('Y-m-d');
            $byType = $data->get($date, collect())->keyBy('type');
            $filled->push([
                'date'        => $date,
                'penjualan'   => (int) ($byType->get('penjualan')?->total_qty   ?? 0),
                'tester'      => (int) ($byType->get('tester')?->total_qty      ?? 0),
                'pengiriman'  => (int) ($byType->get('pengiriman')?->total_qty  ?? 0),
            ]);
            $cursor->addDay();
        }

        return response()->json(['data' => $filled]);
    }

    public function topSkus(Request $request)
    {
        $eventId = $request->get('event_id');
        $storeId = $request->get('store_id');

        $skus = StockLog::query()
            ->selectRaw('event_stock_id, SUM(ABS(qty)) as total_sold')
            ->where('type', 'penjualan')
            ->when($eventId, fn($q) => $q->where('event_id', $eventId))
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->when($request->filled('from'), fn($q) => $q->where('logged_at', '>=', \Carbon\Carbon::parse($request->get('from'))->startOfDay()))
            ->when($request->filled('to'),   fn($q) => $q->where('logged_at', '<=', \Carbon\Carbon::parse($request->get('to'))->endOfDay()))
            ->groupBy('event_stock_id')
            ->orderByDesc('total_sold')
            ->limit(10)
            ->with('eventStock:id,sku_name,sku_code,price')
            ->get()
            ->map(fn($log) => [
                'sku_name'    => $log->eventStock?->sku_name,
                'sku_code'    => $log->eventStock?->sku_code,
                'total_sold'  => $log->total_sold,
                'total_value' => $log->total_sold * ($log->eventStock?->price ?? 0),
            ]);

        return response()->json(['data' => $skus]);
    }

    public function recentLogs(Request $request)
    {
        $logs = StockLog::query()
            ->with([
                'store:id,name',
                'user:id,name',
                'eventStock:id,sku_name,sku_code',
                'event:id,name',
                'toStore:id,name',
            ])
            ->whereIn('type', ['penjualan', 'tester', 'pengiriman'])
            ->when($request->get('event_id'), fn($q) => $q->where('event_id', $request->get('event_id')))
            ->when($request->get('store_id'), fn($q) => $q->where('store_id', $request->get('store_id')))
            ->when($request->filled('from'), fn($q) => $q->where('logged_at', '>=', \Carbon\Carbon::parse($request->get('from'))->startOfDay()))
            ->when($request->filled('to'),   fn($q) => $q->where('logged_at', '<=', \Carbon\Carbon::parse($request->get('to'))->endOfDay()))
            ->orderByDesc('logged_at')
            ->paginate($request->get('per_page', 10));

        return response()->json($logs);
    }

    public function stockAlerts(Request $request)
    {
        $eventId   = $request->get('event_id');
        $storeId   = $request->get('store_id');
        $threshold = $request->get('threshold', 50);

        $alerts = \App\Models\EventStock::query()
            ->with('store:id,name', 'event:id,name,code')
            ->where('qty_current', '<=', $threshold)
            ->when($eventId, fn($q) => $q->where('event_id', $eventId))
            ->when($storeId, fn($q) => $q->where('store_id', $storeId))
            ->whereHas('event', fn($q) => $q->where('status', 'active'))
            ->orderBy('qty_current')
            ->get(['id', 'event_id', 'store_id', 'sku_name', 'sku_code', 'qty_current']);

        return response()->json(['data' => $alerts]);
    }
}
