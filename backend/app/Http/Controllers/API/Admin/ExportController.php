<?php

namespace App\Http\Controllers\API\Admin;

use App\Exports\DashboardSalesExport;
use App\Exports\EventSalesLogExport;
use App\Exports\EventStockExport;
use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Maatwebsite\Excel\Facades\Excel;

class ExportController extends Controller
{
    public function exportStocks(Event $event)
    {
        $filename = "stock_{$event->code}_" . now()->format('Ymd_His') . ".xlsx";
        return Excel::download(new EventStockExport($event), $filename);
    }

    public function exportLogs(Event $event)
    {
        $type     = request('type');
        $filename = "logs_{$event->code}" . ($type ? "_{$type}" : '') . "_" . now()->format('Ymd_His') . ".xlsx";
        return Excel::download(new EventSalesLogExport($event, $type), $filename);
    }

    public function exportDashboardSales(Request $request)
    {
        $eventId = $request->integer('event_id') ?: null;
        $storeId = $request->integer('store_id') ?: null;
        $from    = $request->get('from');
        $to      = $request->get('to');
        $suffix  = ($from && $to) ? "_{$from}_sd_{$to}" : '_' . now()->format('Ymd');
        $filename = "data_transaksi{$suffix}.xlsx";
        return Excel::download(new DashboardSalesExport($eventId, $storeId, $from, $to), $filename);
    }
}
