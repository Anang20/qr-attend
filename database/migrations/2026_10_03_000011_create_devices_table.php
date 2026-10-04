<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\DeviceStatus;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->char('fingerprint_hash', 64);
            $table->string('device_name', 100)->nullable();
            $table->string('platform', 50)->nullable();
            $table->dateTime('bound_at');
            $table->dateTime('revoked_at')->nullable();
            $table->enum('status', DeviceStatus::values())->default(DeviceStatus::Active->value);
            $table->timestamps();

            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('devices');
    }
};
