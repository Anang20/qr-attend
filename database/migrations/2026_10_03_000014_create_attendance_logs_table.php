<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\AttendanceMethod;
use App\Enums\AttendanceStatus;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('attendance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('attendance_id')->constrained()->cascadeOnDelete();
            $table->enum('old_status', AttendanceStatus::values())->nullable();
            $table->enum('new_status', AttendanceStatus::values());
            $table->enum('method', AttendanceMethod::values());
            $table->foreignId('changed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('reason', 300)->nullable();
            $table->timestamp('created_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attendance_logs');
    }
};
