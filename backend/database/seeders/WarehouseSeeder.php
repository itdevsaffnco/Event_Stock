<?php

namespace Database\Seeders;

use App\Models\Store;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;

class WarehouseSeeder extends Seeder
{
    public function run(): void
    {
        $wh1 = Warehouse::create([
            'name'      => 'Gudang Jakarta Pusat',
            'location'  => 'Jakarta Pusat',
            'address'   => 'Jl. Sudirman No. 10, Jakarta Pusat',
            'pic_name'  => 'Budi Santoso',
            'pic_phone' => '081234567890',
        ]);

        Store::insert([
            ['warehouse_id' => $wh1->id, 'name' => 'Toko Sudirman 1', 'created_at' => now(), 'updated_at' => now()],
            ['warehouse_id' => $wh1->id, 'name' => 'Toko Sudirman 2', 'created_at' => now(), 'updated_at' => now()],
            ['warehouse_id' => $wh1->id, 'name' => 'Toko Grand Indonesia', 'created_at' => now(), 'updated_at' => now()],
        ]);

        $wh2 = Warehouse::create([
            'name'      => 'Gudang Bandung',
            'location'  => 'Bandung',
            'address'   => 'Jl. Riau No. 25, Bandung',
            'pic_name'  => 'Sari Dewi',
            'pic_phone' => '082345678901',
        ]);

        Store::insert([
            ['warehouse_id' => $wh2->id, 'name' => 'Toko Paris Van Java', 'created_at' => now(), 'updated_at' => now()],
            ['warehouse_id' => $wh2->id, 'name' => 'Toko BIP Bandung', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
