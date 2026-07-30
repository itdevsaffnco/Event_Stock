<?php

namespace App\Exports;

use App\Models\StockLog;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class DashboardSalesExport implements FromQuery, WithHeadings, WithMapping, WithStyles, WithTitle, ShouldAutoSize
{
    private int $index = 0;

    // Dynamic labels handled in map() for pengiriman direction

    public function __construct(
        private readonly ?int    $eventId,
        private readonly ?int    $storeId,
        private readonly ?string $from,
        private readonly ?string $to,
    ) {}

    public function title(): string { return 'Data Transaksi'; }

    public function query()
    {
        return StockLog::query()
            ->whereIn('type', ['penjualan', 'tester', 'pengiriman', 'adjustment'])
            ->when($this->eventId, fn($q) => $q->where('event_id', $this->eventId))
            ->when($this->storeId, fn($q) => $q->where('store_id', $this->storeId))
            ->when($this->from, fn($q) => $q->where('logged_at', '>=', \Carbon\Carbon::parse($this->from)->startOfDay()))
            ->when($this->to,   fn($q) => $q->where('logged_at', '<=', \Carbon\Carbon::parse($this->to)->endOfDay()))
            ->with([
                'store:id,name',
                'user:id,name',
                'eventStock:id,sku_name,sku_code,price',
                'event:id,name,code',
                'toStore:id,name',
            ])
            ->orderBy('logged_at', 'desc');
    }

    public function headings(): array
    {
        return [
            '#', 'Tanggal', 'Jam', 'Tipe', 'Event', 'Store Asal',
            'SKU Code', 'SKU Name', 'Qty', 'Harga Satuan', 'Total',
            'Store Tujuan', 'Referensi', 'Input oleh',
        ];
    }

    public function map($log): array
    {
        $this->index++;
        $qty   = abs($log->qty);
        $price = $log->eventStock?->price ?? 0;

        if ($log->type === 'pengiriman') {
            $typeLabel  = $log->qty < 0 ? 'Kirim Barang (Keluar)' : 'Kirim Barang (Masuk)';
            $storeTujuan = $log->qty < 0 ? ($log->toStore?->name ?? '-') : '-';
        } elseif ($log->type === 'adjustment') {
            $typeLabel   = $log->qty < 0 ? 'Penyesuaian (Kurang)' : 'Penyesuaian (Tambah)';
            $storeTujuan = '-';
        } else {
            $typeLabel   = $log->type === 'penjualan' ? 'Penjualan' : 'Tester';
            $storeTujuan = '-';
        }

        $loggedAt = $log->logged_at?->copy()->timezone('Asia/Jakarta');

        return [
            $this->index,
            $loggedAt?->format('d/m/Y') ?? '-',
            $loggedAt?->format('H:i') ?? '-',
            $typeLabel,
            $log->event?->name          ?? '-',
            $log->store?->name          ?? '-',
            $log->eventStock?->sku_code ?? '-',
            $log->eventStock?->sku_name ?? '-',
            $qty,
            $log->type === 'penjualan' ? $price        : '-',
            $log->type === 'penjualan' ? $qty * $price : '-',
            $storeTujuan,
            $log->reference_no          ?? '-',
            $log->user?->name           ?? '-',
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '4F46E5']],
            ],
        ];
    }
}
