<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\ActiveStatus;

return new class extends Migration
{
    public function up(): void
    {

        // Nama tabel class_groups karena `Class` adalah kata kunci PHP.
        Schema::create('class_groups', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique(); // SI-5A
            $table->foreignId('study_program_id')->constrained()->restrictOnDelete();
            $table->year('cohort_year');
            $table->foreignId('advisor_lecturer_id')->nullable()->constrained('lecturers')->nullOnDelete();
            $table->unsignedSmallInteger('capacity')->default(40);
            $table->enum('status', ActiveStatus::values())->default(ActiveStatus::Active->value);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('class_groups');
    }
};
