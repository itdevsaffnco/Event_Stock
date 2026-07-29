<?php

namespace App\Exports;

use App\Models\Event;
use App\Models\StockLog;
use Maatwebsite\Excel\Concerns\FromQuery;
use Maatwebsite\Excel\Concerns\ShouldAutoSize;
use Maatwebsite\Excel\Concerns\WithHeadings;
use Maatwebsite\Excel\Concerns\WithMapping;
use Maatwebsite\Excel\Concerns\WithStyles;
use Maatwebsite\Excel\Concerns\WithTitle;
use PhpOffice\PhpSpreadsheet\Style\Fill;
use PhpOffice\PhpSpreadsheet\Worksheet\Worksheet;

class EventSalesLogExport implements FromQuery, WithHeadings, WithMapping, WithStyles, WithTitle, ShouldAutoSize
{
    private int $index = 0;

    public function __construct(
        private readonly Event $event,
        private readonly ?string $type = null
    ) {}

    public function title(): string
    {
        return $this->type ? ucfirst($this->type) . ' Log' : 'All Logs';
    }

    public function query()
    {
        return StockLog::query()
            ->where('event_id', $this->event->id)
            ->when($this->type, fn($q) => $q->where('type', $this->type))
            ->with(['store:id,name', 'user:id,name', 'eventStock:id,sku_name,sku_code'])
            ->orderBy('logged_at', 'desc');
    }

    public function headings(): array
    {
        return ['#', 'Tanggal', 'Jam', 'Store', 'SKU Code', 'SKU Name', 'Tipe', 'Qty', 'No. Referensi', 'Catatan', 'Input oleh'];
    }

    public function map($log): array
    {
        $this->index++;
        $loggedAt = $log->logged_at?->copy()->timezone('Asia/Jakarta');
        return [
            $this->index,
            $loggedAt?->format('d/m/Y') ?? '-',
            $loggedAt?->format('H:i') ?? '-',
            $log->store->name,
            $log->eventStock?->sku_code ?? '-',
            $log->eventStock?->sku_name ?? '-',
            strtoupper($log->type),
            abs($log->qty),
            $log->reference_no ?? '-',
            $log->notes ?? '-',
            $log->user->name,
        ];
    }

    public function styles(Worksheet $sheet): array
    {
        return [
            1 => [
                'font' => ['bold' => true, 'color' => ['rgb' => 'FFFFFF'], 'size' => 11],
                'fill' => ['fillType' => Fill::FILL_SOLID, 'startColor' => ['rgb' => '0F172A']],
            ],
        ];
    }
}
