<?php

namespace App\Http\Controllers\API\Admin;

use App\Http\Controllers\Controller;
use App\Models\Event;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class EventController extends Controller
{
    public function index(Request $request)
    {
        $events = Event::query()
            ->with('warehouses:id,name', 'creator:id,name')
            ->withCount('eventStocks')
            ->when($request->search, fn($q, $s) => $q->where('name', 'like', "%{$s}%")
                                                      ->orWhere('code', 'like', "%{$s}%"))
            ->when($request->status, fn($q, $s) => $q->where('status', $s))
            ->latest()
            ->paginate(15);

        return response()->json($events);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'name'          => 'required|string|max:255',
            'warehouse_ids' => 'required|array|min:1',
            'warehouse_ids.*' => 'exists:warehouses,id',
            'description'   => 'nullable|string',
            'start_date'    => 'required|date',
            'end_date'      => 'nullable|date|after_or_equal:start_date',
        ]);

        $event = DB::transaction(function () use ($data) {
            $ev = Event::create([
                'name'        => $data['name'],
                'description' => $data['description'] ?? null,
                'start_date'  => $data['start_date'],
                'end_date'    => $data['end_date'] ?? null,
                'created_by'  => auth()->id(),
            ]);

            $ev->warehouses()->sync($data['warehouse_ids']);
            return $ev;
        });

        $event->load('warehouses:id,name,location', 'creator:id,name');

        return response()->json(['data' => $event, 'message' => 'Event berhasil dibuat.'], 201);
    }

    public function show(Event $event)
    {
        $event->load('warehouses:id,name,location', 'creator:id,name');
        $event->loadCount('eventStocks', 'stockLogs');

        $summary = [
            'total_skus'        => $event->eventStocks()->count(),
            'total_sold'        => abs($event->stockLogs()->where('type', 'penjualan')->sum('qty')),
            'total_tester'      => abs($event->stockLogs()->where('type', 'tester')->sum('qty')),
            'total_stock_value' => $event->eventStocks()
                ->selectRaw('COALESCE(SUM(qty_current * price), 0) as total')
                ->value('total') ?? 0,
        ];

        $stores = $event->availableStores();

        return response()->json([
            'data'      => $event,
            'summary'   => $summary,
            'stores'    => $stores,
            'warehouses'=> $event->warehouses()->get(['warehouses.id', 'warehouses.name', 'warehouses.location']),
        ]);
    }

    public function update(Request $request, Event $event)
    {
        if ($event->status === 'closed') {
            return response()->json(['message' => 'Event yang sudah ditutup tidak bisa diedit.'], 422);
        }

        $data = $request->validate([
            'name'          => 'sometimes|required|string|max:255',
            'warehouse_ids' => 'sometimes|array|min:1',
            'warehouse_ids.*' => 'exists:warehouses,id',
            'description'   => 'nullable|string',
            'start_date'    => 'sometimes|date',
            'end_date'      => 'nullable|date|after_or_equal:start_date',
        ]);

        DB::transaction(function () use ($data, $event) {
            $event->update(collect($data)->except('warehouse_ids')->toArray());

            if (!empty($data['warehouse_ids'])) {
                $event->warehouses()->sync($data['warehouse_ids']);
            }
        });

        return response()->json(['data' => $event->load('warehouses:id,name'), 'message' => 'Event berhasil diupdate.']);
    }

    public function destroy(Event $event)
    {
        if ($event->status === 'active') {
            return response()->json(['message' => 'Event aktif tidak bisa dihapus.'], 422);
        }

        $event->delete();
        return response()->json(['message' => 'Event berhasil dihapus.']);
    }

    public function updateStatus(Request $request, Event $event)
    {
        $data = $request->validate(['status' => 'required|in:draft,active,closed']);

        $transitions = ['draft' => ['active'], 'active' => ['closed'], 'closed' => []];

        if (!in_array($data['status'], $transitions[$event->status])) {
            return response()->json([
                'message' => "Status tidak bisa berubah dari '{$event->status}' ke '{$data['status']}'.",
            ], 422);
        }

        $event->update(['status' => $data['status']]);
        return response()->json(['data' => $event, 'message' => "Status diubah ke {$data['status']}."]);
    }
}
