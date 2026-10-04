<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\ActiveStatus;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('lecturers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->unique()->constrained()->restrictOnDelete();
            $table->char('nidn', 10)->unique();
            $table->foreignId('study_program_id')->constrained()->restrictOnDelete();
            $table->string('functional_position', 50)->nullable();
            $table->enum('status', ActiveStatus::values())->default(ActiveStatus::Active->value);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lecturers');
    }
};
