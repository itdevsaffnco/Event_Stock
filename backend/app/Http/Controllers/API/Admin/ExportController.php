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
    // Laporan selalu dibuat dari data terkini - jangan biarkan browser/proxy
    // menyajikan file lama untuk request dengan parameter (tanggal/filter) yang sama.
    private const NO_CACHE_HEADERS = [
        'Cache-Control' => 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma'        => 'no-cache',
        'Expires'       => '0',
    ];

    public function exportStocks(Event $event)
    {
        $filename = "stock_{$event->code}_" . now()->format('Ymd_His') . ".xlsx";
        $response = Excel::download(new EventStockExport($event), $filename);
        $response->headers->add(self::NO_CACHE_HEADERS);
        return $response;
    }

    public function exportLogs(Event $event)
    {
        $type     = request('type');
        $filename = "logs_{$event->code}" . ($type ? "_{$type}" : '') . "_" . now()->format('Ymd_His') . ".xlsx";
        $response = Excel::download(new EventSalesLogExport($event, $type), $filename);
        $response->headers->add(self::NO_CACHE_HEADERS);
        return $response;
    }

    public function exportDashboardSales(Request $request)
    {
        $eventId = $request->integer('event_id') ?: null;
        $storeId = $request->integer('store_id') ?: null;
        $from    = $request->get('from');
        $to      = $request->get('to');
        $suffix  = ($from && $to) ? "_{$from}_sd_{$to}" : '_' . now()->format('Ymd');
        $filename = "data_transaksi{$suffix}.xlsx";
        $response = Excel::download(new DashboardSalesExport($eventId, $storeId, $from, $to), $filename);
        $response->headers->add(self::NO_CACHE_HEADERS);
        return $response;
    }
}
