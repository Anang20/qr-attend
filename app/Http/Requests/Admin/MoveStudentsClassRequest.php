<?php

namespace App\Http\Requests\Admin;

use App\Enums\ActiveStatus;
use App\Enums\SessionStatus;
use App\Models\AttendanceSession;
use App\Models\ClassGroup;
use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Pindah kelas massal. Pengaman: kelas tujuan sesuai prodi & angkatan, tidak melebihi kapasitas,
 * dan tidak ada sesi yang sedang dibuka di kelas terkait.
 */
class MoveStudentsClassRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'student_ids' => ['required', 'array', 'min:1', 'max:500'],
            'student_ids.*' => ['integer', 'distinct', 'exists:students,id'],
            'class_group_id' => ['required', 'integer', Rule::exists('class_groups', 'id')->where('status', ActiveStatus::Active)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'student_ids.required' => 'Pilih minimal satu mahasiswa.',
            'student_ids.min' => 'Pilih minimal satu mahasiswa.',
            'student_ids.max' => 'Maksimal 500 mahasiswa sekali pindah.',
            'class_group_id.required' => 'Pilih kelas tujuan.',
            'class_group_id.exists' => 'Kelas tujuan tidak ditemukan atau berstatus Nonaktif.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $ids = $this->input('student_ids');
                $class = ClassGroup::query()->findOrFail($this->integer('class_group_id'));

                $mismatch = Student::query()->with('user:id,name')
                    ->whereIn('id', $ids)
                    ->where(fn ($q) => $q->where('study_program_id', '!=', $class->study_program_id)->orWhere('cohort_year', '!=', $class->cohort_year))
                    ->get();

                if ($mismatch->isNotEmpty()) {
                    $names = $mismatch->take(3)->map(fn (Student $s): string => $s->user->name)->implode(', ');
                    $more = $mismatch->count() > 3 ? ' dan '.($mismatch->count() - 3).' lainnya' : '';
                    $validator->errors()->add('class_group_id', "Kelas {$class->code} tidak sesuai prodi/angkatan: {$names}{$more}.");

                    return;
                }

                // Kapasitas kelas tujuan (yang sudah berada di kelas itu tidak dihitung dua kali).
                $incoming = Student::query()->whereIn('id', $ids)->where('class_group_id', '!=', $class->id)->count();
                $current = $class->students()->count();
                if ($current + $incoming > $class->capacity) {
                    $validator->errors()->add('class_group_id', "Kapasitas kelas {$class->code} {$class->capacity} (terisi {$current}); tidak muat {$incoming} mahasiswa lagi. Naikkan kapasitas di menu Kelas bila memang perlu.");

                    return;
                }

                // Jangan memindah saat ada sesi presensi yang sedang dibuka di kelas asal atau tujuan.
                $classIds = Student::query()->whereIn('id', $ids)->pluck('class_group_id')->push($class->id)->unique();
                $hasOpenSession = AttendanceSession::query()
                    ->where('status', SessionStatus::Open)
                    ->whereHas('classSchedule', fn ($q) => $q->whereIn('class_group_id', $classIds))
                    ->exists();
                if ($hasOpenSession) {
                    $validator->errors()->add('student_ids', 'Ada sesi presensi yang sedang dibuka di kelas asal atau tujuan. Tunggu sesi berakhir lalu coba lagi.');
                }
            },
        ];
    }
}
