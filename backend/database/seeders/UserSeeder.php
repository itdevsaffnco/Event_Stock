<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        User::create([
            'name'     => 'Admin Utama',
            'email'    => 'admin@eventstock.com',
            'password' => Hash::make('password'),
            'role'     => 'admin',
        ]);

        $wh1 = Warehouse::where('name', 'like', '%Jakarta%')->first();
        $wh2 = Warehouse::where('name', 'like', '%Bandung%')->first();

        User::create([
            'name'         => 'Staff Jakarta',
            'email'        => 'staff.jkt@eventstock.com',
            'password'     => Hash::make('password'),
            'role'         => 'staff',
            'warehouse_id' => $wh1?->id,
        ]);

        User::create([
            'name'         => 'Staff Bandung',
            'email'        => 'staff.bdg@eventstock.com',
            'password'     => Hash::make('password'),
            'role'         => 'staff',
            'warehouse_id' => $wh2?->id,
        ]);
    }
}
