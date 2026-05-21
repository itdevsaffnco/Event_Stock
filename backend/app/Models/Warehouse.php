<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Warehouse extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name', 'location', 'address', 'pic_name', 'pic_phone', 'status',
    ];

    public function stores(): HasMany
    {
        return $this->hasMany(Store::class);
    }

    public function activeStores(): HasMany
    {
        return $this->hasMany(Store::class)->where('status', 'active');
    }

    public function warehouseStocks(): HasMany
    {
        return $this->hasMany(WarehouseStock::class);
    }

    public function events(): BelongsToMany
    {
        return $this->belongsToMany(Event::class, 'event_warehouses');
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
