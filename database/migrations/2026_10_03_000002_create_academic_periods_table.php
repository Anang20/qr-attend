<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use App\Enums\PeriodStatus;
use App\Enums\Semester;

return new class extends Migration
{
    public function up(): void
    {

        Schema::create('academic_periods', function (Blueprint $table) {
            $table->id();
            $table->char('academic_year', 9); // 2026/2027
            $table->enum('semester', Semester::values());
            $table->date('start_date');
            $table->date('end_date');
            $table->enum('status', PeriodStatus::values())->default(PeriodStatus::Upcoming->value)->index();
            $table->timestamps();

            // BR-18: tahun ajaran + semester unik.
            $table->unique(['academic_year', 'semester']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('academic_periods');
    }
};
