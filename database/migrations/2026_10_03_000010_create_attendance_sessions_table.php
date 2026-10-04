<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\SessionStatus;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('attendance_sessions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('class_schedule_id')->constrained()->cascadeOnDelete();
            $table->unsignedTinyInteger('meeting_no'); // 1..16
            $table->date('session_date');
            $table->dateTime('opened_at')->nullable();
            $table->dateTime('expires_at')->nullable();
            $table->dateTime('closed_at')->nullable();
            $table->enum('status', SessionStatus::values())->default(SessionStatus::Scheduled->value);
            $table->char('qr_token_hash', 64)->nullable()->unique();
            $table->foreignId('opened_by')->nullable()->constrained('users')->nullOnDelete();
            // Snapshot titik ruang saat sesi dibuka (audit).
            $table->decimal('room_latitude', 10, 7)->nullable();
            $table->decimal('room_longitude', 10, 7)->nullable();
            $table->unsignedSmallInteger('room_radius_m')->nullable();
            $table->timestamps();

            $table->unique(['class_schedule_id', 'meeting_no']);
            $table->index(['session_date', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_sessions');
    }
};
