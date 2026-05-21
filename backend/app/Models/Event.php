<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Collection;

class Event extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'code', 'created_by',
        'description', 'start_date', 'end_date', 'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date'   => 'date',
        ];
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Many-to-many: event bisa melibatkan banyak gudang
    public function warehouses(): BelongsToMany
    {
        return $this->belongsToMany(Warehouse::class, 'event_warehouses')->withTimestamps();
    }

    public function eventStocks(): HasMany
    {
        return $this->hasMany(EventStock::class);
    }

    public function stockLogs(): HasMany
    {
        return $this->hasMany(StockLog::class);
    }

    // Store yang tersedia = gabungan dari semua warehouse yang terlibat
    public function availableStores(): Collection
    {
        $warehouseIds = $this->warehouses()->pluck('warehouses.id');

        return Store::whereIn('warehouse_id', $warehouseIds)
                    ->where('status', 'active')
                    ->with('warehouse:id,name')
                    ->get();
    }

    // Warehouse IDs yang terlibat di event ini
    public function warehouseIds(): array
    {
        return $this->warehouses()->pluck('warehouses.id')->toArray();
    }

    protected static function booted(): void
    {
        static::creating(function (Event $event) {
            if (empty($event->code)) {
                $date = now()->format('Ymd');
                // Include soft-deleted records so codes are never reused
                $count = static::withTrashed()->whereDate('created_at', today())->count() + 1;
                $event->code = 'EVT-' . $date . '-' . str_pad($count, 3, '0', STR_PAD_LEFT);
            }
        });
    }
}
