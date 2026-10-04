<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\LeaveType;
use App\Enums\RequestStatus;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('leave_requests', function (Blueprint $table) {
            $table->id();
            $table->uuid('batch_id')->index();
            $table->foreignId('student_id')->constrained()->restrictOnDelete();
            $table->foreignId('attendance_session_id')->constrained()->restrictOnDelete();
            $table->enum('type', LeaveType::values());
            $table->string('reason', 300);
            $table->string('attachment_path')->nullable();
            $table->enum('status', RequestStatus::values())->default(RequestStatus::Pending->value);
            $table->foreignId('reviewed_by')->nullable()->constrained('lecturers')->nullOnDelete();
            $table->dateTime('reviewed_at')->nullable();
            $table->string('review_note', 300)->nullable();
            $table->timestamps();

            // BR-14: satu pengajuan aktif per mahasiswa per pertemuan.
            // MySQL tidak punya partial unique index, jadi dipakai kolom generated.
            $table->string('active_key', 41)->nullable()->storedAs(
                "IF(`status` IN ('pending','approved'), CONCAT(`student_id`, '-', `attendance_session_id`), NULL)"
            )->unique();
            $table->index(['student_id', 'attendance_session_id', 'status'], 'leave_lookup_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_requests');
    }
};
