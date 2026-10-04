<?php

namespace App\Http\Requests\Admin;

use App\Enums\ActiveStatus;
use App\Enums\PeriodStatus;
use App\Models\AcademicPeriod;
use App\Models\ClassSchedule;
use App\Models\Room;
use App\Models\Student;
use App\Services\ScheduleConflicts;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ClassScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $schedule = $this->route('schedule');
        $active = ActiveStatus::Active->value;

        return [
            'academic_period_id' => ['required', 'integer', 'exists:academic_periods,id'],
            'class_group_id' => ['required', 'integer', Rule::exists('class_groups', 'id')->where('status', $active)],
            'course_id' => [
                'required', 'integer', Rule::exists('courses', 'id')->where('status', $active),
                Rule::unique('class_schedules')
                    ->where('academic_period_id', $this->input('academic_period_id'))
                    ->where('class_group_id', $this->input('class_group_id'))
                    ->ignore($schedule instanceof ClassSchedule ? $schedule->id : null),
            ],
            'lecturer_id' => ['required', 'integer', Rule::exists('lecturers', 'id')->where('status', $active)],
            // BR-22: ruang Nonaktif tidak bisa dipetakan.
            'room_id' => ['required', 'integer', Rule::exists('rooms', 'id')->where('status', $active)],
            'day_of_week' => ['required', 'integer', 'between:1,6'],
            'start_time' => ['required', 'date_format:H:i'],
            'end_time' => ['required', 'date_format:H:i', 'after:start_time'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'course_id.unique' => 'Mata kuliah ini sudah dipetakan ke kelas tersebut pada periode ini.',
            'room_id.exists' => 'Ruang tidak ditemukan atau berstatus Nonaktif.',
            'end_time.after' => 'Jam selesai harus setelah jam mulai.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return [
            'academic_period_id' => 'periode',
            'course_id' => 'mata kuliah',
            'lecturer_id' => 'dosen',
            'room_id' => 'ruang',
            'day_of_week' => 'hari',
            'start_time' => 'jam mulai',
            'end_time' => 'jam selesai',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                // BR-21: periode Selesai tidak bisa diubah.
                $period = AcademicPeriod::query()->find($this->integer('academic_period_id'));
                if ($period?->status === PeriodStatus::Finished) {
                    $validator->errors()->add('academic_period_id', 'Periode '.$period->label().' sudah Selesai, pemetaannya hanya bisa dilihat.');

                    return;
                }

                $schedule = $this->route('schedule');
                $conflicts = ScheduleConflicts::find([
                    'academic_period_id' => $this->integer('academic_period_id'),
                    'class_group_id' => $this->integer('class_group_id'),
                    'lecturer_id' => $this->integer('lecturer_id'),
                    'room_id' => $this->integer('room_id'),
                    'day_of_week' => $this->integer('day_of_week'),
                    'start_time' => $this->string('start_time')->toString(),
                    'end_time' => $this->string('end_time')->toString(),
                ], $schedule instanceof ClassSchedule ? $schedule->id : null);

                if ($conflicts['class']) {
                    $validator->errors()->add('start_time', 'Kelas sudah ada kuliah di jam ini: '.$conflicts['class'].'.');
                }
                if ($conflicts['lecturer']) {
                    $validator->errors()->add('lecturer_id', 'Dosen sudah mengajar di jam ini: '.$conflicts['lecturer'].'.');
                }
                if ($conflicts['room']) {
                    $validator->errors()->add('room_id', 'Ruang sudah dipakai di jam ini: '.$conflicts['room'].'.');
                }

                if ($schedule instanceof ClassSchedule && $schedule->sessions()->whereNotNull('opened_at')->exists()
                    && ((int) $schedule->class_group_id !== $this->integer('class_group_id') || (int) $schedule->course_id !== $this->integer('course_id'))) {
                    $validator->errors()->add('course_id', 'Kelas dan mata kuliah tidak bisa diganti karena sesi presensi sudah berjalan.');
                }
            },
        ];
    }

    /** Peringatan yang tidak memblokir simpan. @return list<string> */
    public function warnings(): array
    {
        $room = Room::query()->find($this->integer('room_id'));
        $warnings = [];

        if ($room !== null && ! $room->hasPoint()) {
            $warnings[] = $room->name.' belum punya titik presensi; sesi QR belum bisa dibuka.';
        }

        $students = Student::query()->where('class_group_id', $this->integer('class_group_id'))->count();
        if ($room !== null && $students > $room->capacity) {
            $warnings[] = "Kapasitas {$room->name} ({$room->capacity}) lebih kecil dari jumlah mahasiswa ({$students}).";
        }

        return $warnings;
    }
}
