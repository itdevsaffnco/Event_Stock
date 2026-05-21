<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Store;
use Illuminate\Http\Request;

class StoreController extends Controller
{
    public function index(Request $request)
    {
        $query = Store::query()
            ->with('warehouse:id,name')
            ->when($request->warehouse_id, fn($q, $id) => $q->where('warehouse_id', $id))
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%{$s}%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->when($request->event_id, function ($q, $eventId) {
                $warehouseIds = \App\Models\Event::find($eventId)?->warehouseIds() ?? [];
                $q->whereIn('warehouse_id', $warehouseIds);
            })
            ->latest();

        if ($request->boolean('all')) {
            return response()->json(['data' => $query->get()]);
        }

        return response()->json($query->paginate(20));
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'warehouse_id' => 'required|exists:warehouses,id',
            'name'         => 'required|string|max:255',
            'pic_name'     => 'nullable|string|max:255',
            'pic_phone'    => 'nullable|string|max:20',
            'status'       => 'in:active,inactive',
        ]);

        $store = Store::create($data);
        $store->load('warehouse:id,name');

        return response()->json(['data' => $store, 'message' => 'Store berhasil dibuat.'], 201);
    }

    public function show(Store $store)
    {
        $store->load('warehouse:id,name');
        return response()->json(['data' => $store]);
    }

    public function update(Request $request, Store $store)
    {
        $data = $request->validate([
            'warehouse_id' => 'sometimes|exists:warehouses,id',
            'name'         => 'sometimes|required|string|max:255',
            'pic_name'     => 'nullable|string|max:255',
            'pic_phone'    => 'nullable|string|max:20',
            'status'       => 'in:active,inactive',
        ]);

        $store->update($data);
        return response()->json(['data' => $store, 'message' => 'Store berhasil diupdate.']);
    }

    public function destroy(Store $store)
    {
        $store->delete();
        return response()->json(['message' => 'Store berhasil dihapus.']);
    }
}
