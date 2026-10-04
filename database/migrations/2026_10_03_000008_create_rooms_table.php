<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\ActiveStatus;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('rooms', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique();
            $table->string('name', 50)->unique();
            $table->foreignId('building_id')->constrained()->restrictOnDelete();
            $table->unsignedTinyInteger('floor');
            $table->unsignedSmallInteger('capacity');
            // Titik presensi; kosong = "Belum ada titik".
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->unsignedSmallInteger('radius_m')->default(5);
            $table->decimal('point_accuracy_m', 5, 1)->nullable();
            $table->timestamp('point_set_at')->nullable();
            $table->foreignId('point_set_by')->nullable()->constrained('users')->nullOnDelete();
            $table->enum('status', ActiveStatus::values())->default(ActiveStatus::Active->value);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('rooms');
    }
};
