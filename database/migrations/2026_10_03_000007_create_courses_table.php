<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\ActiveStatus;
use App\Enums\CourseType;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->string('code', 10)->unique(); // IF-305
            $table->string('name', 100);
            $table->unsignedTinyInteger('credits'); // SKS
            $table->unsignedTinyInteger('semester');
            $table->enum('type', CourseType::values())->default(CourseType::Wajib->value);
            $table->foreignId('study_program_id')->constrained()->restrictOnDelete();
            $table->enum('status', ActiveStatus::values())->default(ActiveStatus::Active->value);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
