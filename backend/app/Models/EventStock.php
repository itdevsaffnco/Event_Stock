<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EventStock extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_id', 'store_id', 'sku_code', 'sku_name',
        'qty_initial', 'qty_current', 'price',
    ];

    protected function casts(): array
    {
        return [
            'qty_initial' => 'integer',
            'qty_current' => 'integer',
            'price'       => 'decimal:2',
        ];
    }

    public function event(): BelongsTo
    {
        return $this->belongsTo(Event::class);
    }

    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    public function logs(): HasMany
    {
        return $this->hasMany(StockLog::class);
    }

    public function recalculateQty(): void
    {
        $this->qty_current = $this->logs()
            ->whereIn('type', ['initial', 'penjualan', 'tester', 'pengiriman', 'adjustment'])
            ->sum('qty');
        $this->save();
    }

    public function getQtySoldAttribute(): int
    {
        return abs($this->logs()->where('type', 'penjualan')->sum('qty'));
    }

    public function getQtyTesterAttribute(): int
    {
        return abs($this->logs()->where('type', 'tester')->sum('qty'));
    }
}
