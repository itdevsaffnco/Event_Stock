<?php

use App\Models\Warehouse;
use Illuminate\Database\Migrations\Migration;

// Warehouse yang dibuat sebelum WarehouseController otomatis membuat store
// tidak punya store sama sekali, sehingga event tidak bisa import stock dan
// staff tidak punya pilihan store. Buatkan 1 store default untuk masing-masing.
return new class extends Migration
{
    public function up(): void
    {
        Warehouse::doesntHave('stores')->each(function (Warehouse $wh) {
            $wh->stores()->create([
                'name'      => $wh->name,
                'pic_name'  => $wh->pic_name,
                'pic_phone' => $wh->pic_phone,
                'status'    => 'active',
            ]);
        });
    }

    public function down(): void
    {
        // Data backfill — tidak di-rollback.
    }
};
