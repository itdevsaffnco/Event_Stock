<?php

namespace Tests\Feature;

use App\Models\Event;
use App\Models\EventStock;
use App\Models\StockLog;
use App\Models\User;
use App\Models\Warehouse;
use App\Models\WarehouseStock;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class StockConsistencyTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $staff;
    private Warehouse $wh;
    private Event $event;
    private $store;

    protected function setUp(): void
    {
        parent::setUp();
        $this->admin = User::create(['name' => 'A', 'email' => 'a@x', 'password' => 'x', 'role' => 'admin', 'is_active' => 1]);
        $this->staff = User::create(['name' => 'S', 'email' => 's@x', 'password' => 'x', 'role' => 'staff', 'is_active' => 1]);

        $res = $this->actingAs($this->admin)->postJson('/api/admin/warehouses', [
            'name' => 'WH', 'stocks' => [
                ['sku_name' => 'Lipstik', 'qty_available' => 10],
                ['sku_name' => 'Bedak', 'qty_available' => 5],
            ],
        ])->assertCreated();
        $this->wh = Warehouse::find($res->json('data.id'));
        $this->store = $this->wh->stores()->first();
        $this->assertNotNull($this->store, 'store auto-created');

        $ev = $this->postJson('/api/admin/events', ['name' => 'E', 'warehouse_ids' => [$this->wh->id], 'start_date' => '2026-10-16'])->assertCreated();
        $this->event = Event::find($ev->json('data.id'));
        // Tidak ada import manual — SKU gudang langsung masuk ke event saat dibuat
        $this->assertSame(10, $this->es('Lipstik')->qty_initial);
        $this->assertSame(5, $this->es('Bedak')->qty_current);
        $this->patchJson("/api/admin/events/{$this->event->id}/status", ['status' => 'active'])->assertOk();
    }

    private function es(string $name): EventStock
    {
        return EventStock::where('event_id', $this->event->id)->where('sku_name', $name)->first();
    }

    private function ws(string $name): ?WarehouseStock
    {
        return WarehouseStock::where('warehouse_id', $this->wh->id)->where('sku_name', $name)->first();
    }

    public function test_admin_save_does_not_overwrite_staff_sale(): void
    {
        $loaded = $this->actingAs($this->admin)->getJson("/api/admin/warehouses/{$this->wh->id}/stocks")->json('data');

        $this->actingAs($this->staff)->postJson("/api/staff/events/{$this->event->id}/logs", [
            'event_stock_id' => $this->es('Lipstik')->id, 'type' => 'penjualan', 'qty' => 3,
        ])->assertCreated();
        $this->assertSame(7, $this->ws('Lipstik')->qty_available);

        // Admin saves with stale page: Lipstik unchanged (10), Bedak edited 5 -> 8
        $rows = collect($loaded)->map(fn($s) => [
            'id' => $s['id'], 'qty_original' => $s['qty_available'], 'sku_name' => $s['sku_name'],
            'qty_available' => $s['sku_name'] === 'Bedak' ? 8 : $s['qty_available'],
        ])->all();
        $this->actingAs($this->admin)->postJson("/api/admin/warehouses/{$this->wh->id}/stocks/bulk", ['stocks' => $rows])->assertOk();

        $this->assertSame(7, $this->ws('Lipstik')->qty_available);
        $this->assertSame(7, $this->es('Lipstik')->qty_current);
        $this->assertSame(8, $this->ws('Bedak')->qty_available);
        $this->assertSame(8, $this->es('Bedak')->qty_current);
    }

    public function test_rename_keeps_event_stock(): void
    {
        $loaded = $this->actingAs($this->admin)->getJson("/api/admin/warehouses/{$this->wh->id}/stocks")->json('data');
        $rows = collect($loaded)->map(fn($s) => [
            'id' => $s['id'], 'qty_original' => $s['qty_available'], 'qty_available' => $s['qty_available'],
            'sku_name' => $s['sku_name'] === 'Lipstik' ? 'Lipstik Merah' : $s['sku_name'],
        ])->all();
        $this->postJson("/api/admin/warehouses/{$this->wh->id}/stocks/bulk", ['stocks' => $rows])->assertOk();

        $this->assertNull($this->ws('Lipstik'));
        $this->assertSame(10, $this->ws('Lipstik Merah')->qty_available);
        $this->assertSame(10, $this->es('Lipstik Merah')->qty_current);
        $this->assertSame(0, StockLog::where('type', 'adjustment')->count());
    }

    public function test_removed_sku_still_zeroes_event_and_csv_import_sets_absolute(): void
    {
        $this->actingAs($this->admin)->postJson("/api/admin/warehouses/{$this->wh->id}/stocks/bulk", ['stocks' => [
            ['sku_name' => 'Lipstik', 'qty_available' => 4],
        ]])->assertOk();
        $this->assertSame(4, $this->es('Lipstik')->qty_current);
        $this->assertSame(0, $this->es('Bedak')->qty_current);
        $this->assertNull($this->ws('Bedak'));
    }

    public function test_bulk_log_rolls_back_entirely_on_error(): void
    {
        $this->actingAs($this->staff)->postJson("/api/staff/events/{$this->event->id}/logs/bulk", [
            'type' => 'penjualan', 'store_id' => $this->store->id, 'items' => [
                ['event_stock_id' => $this->es('Lipstik')->id, 'qty' => 2],
                ['event_stock_id' => $this->es('Bedak')->id, 'qty' => 99],
            ],
        ])->assertStatus(422)->assertJsonFragment(['message' => 'Stok Bedak tidak mencukupi (tersisa 5 pcs).']);

        $this->assertSame(10, $this->es('Lipstik')->qty_current);
        $this->assertSame(10, $this->ws('Lipstik')->qty_available);
        $this->assertSame(0, StockLog::where('type', 'penjualan')->count());
    }

    public function test_single_log_insufficient_stock(): void
    {
        $this->actingAs($this->staff)->postJson("/api/staff/events/{$this->event->id}/logs", [
            'event_stock_id' => $this->es('Bedak')->id, 'type' => 'tester', 'qty' => 6,
        ])->assertStatus(422)->assertJsonFragment(['message' => 'Stok tidak mencukupi. Tersisa 5 pcs.']);
        $this->assertSame(5, $this->es('Bedak')->qty_current);
    }

    public function test_new_warehouse_product_appears_in_active_event(): void
    {
        $loaded = $this->actingAs($this->admin)->getJson("/api/admin/warehouses/{$this->wh->id}/stocks")->json('data');
        $rows = collect($loaded)->map(fn($s) => [
            'id' => $s['id'], 'qty_original' => $s['qty_available'], 'sku_name' => $s['sku_name'], 'qty_available' => $s['qty_available'],
        ])->push(['sku_name' => 'Parfum', 'qty_available' => 12, 'price' => 50000])->all();
        $this->postJson("/api/admin/warehouses/{$this->wh->id}/stocks/bulk", ['stocks' => $rows])->assertOk();

        $es = $this->es('Parfum');
        $this->assertSame(12, $es->qty_initial);
        $this->assertSame(12, $es->qty_current);
        $this->assertSame(1, StockLog::where('event_stock_id', $es->id)->where('type', 'initial')->count());
        $this->assertSame(0, StockLog::where('type', 'adjustment')->count());

        // Staff can sell it right away; warehouse follows
        $this->actingAs($this->staff)->postJson("/api/staff/events/{$this->event->id}/logs", [
            'event_stock_id' => $es->id, 'type' => 'penjualan', 'qty' => 2,
        ])->assertCreated();
        $this->assertSame(10, $this->ws('Parfum')->qty_available);
    }

    public function test_draft_event_mirrors_warehouse_exactly(): void
    {
        $this->patchJson("/api/admin/events/{$this->event->id}/status", ['status' => 'closed'])->assertOk();
        $draft = Event::find($this->postJson('/api/admin/events', ['name' => 'D', 'warehouse_ids' => [$this->wh->id], 'start_date' => '2026-10-16'])
            ->assertCreated()->json('data.id'));

        $this->postJson("/api/admin/warehouses/{$this->wh->id}/stocks/bulk", ['stocks' => [
            ['sku_name' => 'Lipstik', 'qty_available' => 3],
        ]])->assertOk();

        $stocks = EventStock::where('event_id', $draft->id)->get();
        $this->assertCount(1, $stocks);
        $this->assertSame(3, $stocks[0]->qty_initial);
        $this->assertSame(3, (int) StockLog::where('event_stock_id', $stocks[0]->id)->where('type', 'initial')->value('qty'));
    }

    public function test_warehouse_cannot_be_used_by_two_open_events(): void
    {
        $this->actingAs($this->admin)
            ->postJson('/api/admin/events', ['name' => 'E2', 'warehouse_ids' => [$this->wh->id], 'start_date' => '2026-10-16'])
            ->assertStatus(422);

        // Legacy data: draft event already linked before the rule existed -> cannot be activated
        $legacy = Event::create(['name' => 'Legacy', 'start_date' => '2026-10-16', 'created_by' => $this->admin->id]);
        $legacy->warehouses()->sync([$this->wh->id]);
        $this->patchJson("/api/admin/events/{$legacy->id}/status", ['status' => 'active'])->assertStatus(422);
        $legacy->forceDelete();

        $picker = collect($this->getJson('/api/admin/warehouses?status=active')->json('data'))->firstWhere('id', $this->wh->id);
        $this->assertSame('E', $picker['open_events'][0]['name']);

        // Once closed, the warehouse is free again; updating the event's own warehouses is fine too
        $this->putJson("/api/admin/events/{$this->event->id}", ['warehouse_ids' => [$this->wh->id]])->assertOk();
        $this->patchJson("/api/admin/events/{$this->event->id}/status", ['status' => 'closed'])->assertOk();
        $this->postJson('/api/admin/events', ['name' => 'E3', 'warehouse_ids' => [$this->wh->id], 'start_date' => '2026-10-16'])
            ->assertCreated();
    }

    public function test_search_does_not_leak_other_events(): void
    {
        $other = Event::create(['name' => 'Other', 'start_date' => '2026-10-16', 'created_by' => $this->admin->id]);
        EventStock::create(['event_id' => $other->id, 'store_id' => $this->store->id, 'sku_name' => 'X', 'sku_code' => 'LIP-1', 'qty_initial' => 1, 'qty_current' => 1]);

        $data = $this->actingAs($this->admin)->getJson("/api/admin/events/{$this->event->id}/stocks?search=LIP")->json('data');
        $this->assertCount(0, collect($data)->where('sku_name', 'X'));

        $list = $this->getJson('/api/admin/events?search=Other&status=active')->json('data');
        $this->assertCount(0, $list);
    }
}
