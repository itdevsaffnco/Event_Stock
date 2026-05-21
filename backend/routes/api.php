<?php

use App\Http\Controllers\API\AuthController;
use App\Http\Controllers\API\Admin\DashboardController;
use App\Http\Controllers\API\Admin\EventController;
use App\Http\Controllers\API\Admin\EventStockController;
use App\Http\Controllers\API\Admin\ExportController;
use App\Http\Controllers\API\Admin\StockLogController;
use App\Http\Controllers\API\Admin\StoreController;
use App\Http\Controllers\API\Admin\UserController;
use App\Http\Controllers\API\Admin\WarehouseController;
use App\Http\Controllers\API\Staff\StaffEventController;
use Illuminate\Support\Facades\Route;

// ─── AUTH ──────────────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('login', [AuthController::class, 'login']);
    Route::middleware('auth:sanctum')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me',      [AuthController::class, 'me']);
    });
});

// ─── ADMIN ─────────────────────────────────────────────────────────────────
Route::prefix('admin')->middleware(['auth:sanctum', 'role:admin'])->group(function () {

    // Dashboard
    Route::prefix('dashboard')->group(function () {
        Route::get('summary',      [DashboardController::class, 'summary']);
        Route::get('sales-chart',  [DashboardController::class, 'salesChart']);
        Route::get('top-skus',     [DashboardController::class, 'topSkus']);
        Route::get('stock-alerts', [DashboardController::class, 'stockAlerts']);
    });

    // Users
    Route::apiResource('users', UserController::class)->except(['show']);

    // Warehouses
    Route::apiResource('warehouses', WarehouseController::class);
    Route::get('warehouses/{warehouse}/stores',         [WarehouseController::class, 'getStores']);
    Route::get('warehouses/{warehouse}/stocks',         [WarehouseController::class, 'getStocks']);
    Route::post('warehouses/{warehouse}/stocks/bulk',   [WarehouseController::class, 'bulkUpdateStocks']);
    Route::delete('warehouses/{warehouse}/stocks/{stock}', [WarehouseController::class, 'destroyStock']);

    // Stores
    Route::apiResource('stores', StoreController::class);

    // Events
    Route::apiResource('events', EventController::class);
    Route::patch('events/{event}/status', [EventController::class, 'updateStatus']);

    // Event Stocks
    Route::prefix('events/{event}/stocks')->group(function () {
        Route::get('/',               [EventStockController::class, 'index']);
        Route::post('bulk',           [EventStockController::class, 'bulkStore']);
        Route::post('import-warehouse', [EventStockController::class, 'importFromWarehouse']);
        Route::put('/{stock}',        [EventStockController::class, 'update']);
        Route::delete('/{stock}',     [EventStockController::class, 'destroy']);
    });

    // Stock Logs
    Route::get('events/{event}/logs', [StockLogController::class, 'index']);
    Route::get('logs/{log}',          [StockLogController::class, 'show']);
    Route::patch('logs/{log}',        [StockLogController::class, 'update']);
    Route::delete('logs/{log}',       [StockLogController::class, 'destroy']);

    // Export
    Route::prefix('export')->group(function () {
        Route::get('events/{event}/stocks', [ExportController::class, 'exportStocks']);
        Route::get('events/{event}/logs',   [ExportController::class, 'exportLogs']);
        Route::get('dashboard/sales',       [ExportController::class, 'exportDashboardSales']);
    });
});

// ─── STAFF ─────────────────────────────────────────────────────────────────
Route::prefix('staff')->middleware(['auth:sanctum', 'role:staff'])->group(function () {
    Route::get('events',                   [StaffEventController::class, 'getActiveEvents']);
    Route::get('events/{event}',           [StaffEventController::class, 'getEventDetail']);
    Route::get('events/{event}/stocks',    [StaffEventController::class, 'getStocks']);
    Route::post('events/{event}/logs',     [StaffEventController::class, 'createLog']);
    Route::get('events/{event}/my-logs',   [StaffEventController::class, 'getMyLogs']);
});
