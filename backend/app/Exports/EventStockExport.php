<?php

namespace App\Exports;

use App\Models\Event;
use Maatwebsite\Excel\Concerns\FromCollection;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EventStockExport implements FromCollection, WithHeadings, WithMapping, WithStyles, WithTitle, ShouldAutoSize
{
    private int $index = 0;

    public function __construct(private readonly Event $event) {}

    public function title(): string
    {
        return 'Stock Summary';
    }

    public function collection()
    {
        return $this->event->eventStocks()
            ->with('store:id,name')
            ->withSum(['logs as qty_sold'     => fn($q) => $q->where('type', 'penjualan')], 'qty')
            ->withSum(['logs as qty_tester'   => fn($q) => $q->where('type', 'tester')], 'qty')
            ->withSum(['logs as qty_incoming' => fn($q) => $q->where('type', 'pengiriman')->where('qty', '>', 0)], 'qty')
            ->orderBy('store_id')
            ->orderBy('sku_name')
            ->get();
    }

    public function headings(): array
    {
        return [
            '#', 'Nama Store', 'SKU Code', 'Nama SKU',
            'Qty Awal', 'Penjualan', 'Tester', 'Pengiriman Masuk',
            'Qty Saat Ini', 'Harga Satuan (Rp)', 'Total Penjualan (Rp)',
        ];
    }

    public function map($stock): array
    {
        $this->index++;
        $sold     = abs((int) ($stock->qty_sold     ?? 0));
        $tester   = abs((int) ($stock->qty_tester   ?? 0));
        $incoming =    (int) ($stock->qty_incoming  ?? 0);

        return [
            $this->index,
            $stock->store->name,
            $stock->sku_code ?? '-',
            $stock->sku_name,
            $stock->qty_initial,
            $sold,
            $tester,
            $incoming,
            $stock->qty_current,
            number_format((float) ($stock->price ?? 0), 0, ',', '.'),
            number_format((float) (($stock->price ?? 0) * $sold), 0, ',', '.'),
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
