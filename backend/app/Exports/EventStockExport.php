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
            ->with(['store:id,name', 'logs'])
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
        $sold     = abs($stock->logs->where('type', 'penjualan')->sum('qty'));
        $tester   = abs($stock->logs->where('type', 'tester')->sum('qty'));
        $incoming = $stock->logs->where('type', 'pengiriman')->sum('qty');

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
