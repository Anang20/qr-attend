<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {

        // Pemetaan Kelas: sumber tunggal jadwal (BR-19).
        Schema::create('class_schedules', function (Blueprint $table) {
            $table->id();
            $table->foreignId('academic_period_id')->constrained()->restrictOnDelete();
            $table->foreignId('class_group_id')->constrained()->restrictOnDelete();
            $table->foreignId('course_id')->constrained()->restrictOnDelete();
            $table->foreignId('lecturer_id')->constrained()->restrictOnDelete();
            $table->foreignId('room_id')->constrained()->restrictOnDelete();
            $table->unsignedTinyInteger('day_of_week'); // 1 = Senin
            $table->time('start_time');
            $table->time('end_time');
            $table->unsignedTinyInteger('total_meetings')->default(16);
            $table->timestamps();

            $table->unique(['academic_period_id', 'class_group_id', 'course_id'], 'schedule_unique_course');
            // Indeks untuk cek bentrok (BR-20).
            $table->index(['academic_period_id', 'day_of_week', 'room_id'], 'schedule_room_idx');
            $table->index(['academic_period_id', 'day_of_week', 'lecturer_id'], 'schedule_lecturer_idx');
            $table->index(['academic_period_id', 'day_of_week', 'class_group_id'], 'schedule_class_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_schedules');
    }
};
