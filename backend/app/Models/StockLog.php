<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class StockLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'event_stock_id', 'event_id', 'store_id', 'user_id',
        'from_warehouse_id', 'to_store_id',
        'type', 'qty', 'price_per_unit', 'notes', 'reference_no', 'logged_at',
    ];

    protected function casts(): array
    {
        return [
            'qty'            => 'integer',
            'price_per_unit' => 'decimal:2',
            'logged_at'      => 'datetime',
        ];
    }

    public function eventStock(): BelongsTo  { return $this->belongsTo(EventStock::class); }
    public function event(): BelongsTo       { return $this->belongsTo(Event::class); }
    public function store(): BelongsTo       { return $this->belongsTo(Store::class); }
    public function user(): BelongsTo        { return $this->belongsTo(User::class); }
    public function fromWarehouse(): BelongsTo
    {
        return $this->belongsTo(Warehouse::class, 'from_warehouse_id');
    }

    public function toStore(): BelongsTo
    {
        return $this->belongsTo(Store::class, 'to_store_id');
    }
}
