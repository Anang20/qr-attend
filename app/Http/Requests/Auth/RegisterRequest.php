<?php

namespace App\Http\Requests\Auth;

use App\Models\ClassGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\Validator;

/**
 * Pendaftaran publik hanya untuk Mahasiswa dan Dosen (BR-25).
 */
class RegisterRequest extends FormRequest
{
    public const STUDENT_DOMAIN = '@student.unpam.ac.id';

    public const LECTURER_DOMAIN = '@unpam.ac.id';

    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim((string) $this->input('email'))),
            'name' => trim((string) $this->input('name')),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $isStudent = $this->input('role') === 'student';

        $common = [
            'role' => ['required', Rule::in(['student', 'lecturer'])],
            'name' => ['required', 'string', 'min:3', 'max:150'],
            'study_program_id' => ['required', 'integer', 'exists:study_programs,id'],
            'email' => ['required', 'email', 'max:150', 'unique:users,email'],
            'phone' => ['required', 'regex:/^08\d{8,11}$/'],
            'password' => ['required', 'confirmed', Password::defaults()],
            'consent' => ['accepted'],
        ];

        if ($isStudent) {
            return [
                ...$common,
                'nim' => ['required', 'digits:12', 'unique:students,nim'],
                'cohort_year' => ['required', 'integer', 'between:2015,'.((int) date('Y') + 1)],
                'class_group_id' => ['required', 'integer', 'exists:class_groups,id'],
            ];
        }

        return [
            ...$common,
            'nidn' => ['required', 'digits:10', 'unique:lecturers,nidn'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'nim.unique' => 'NIM ini sudah terdaftar.',
            'nidn.unique' => 'NIDN ini sudah terdaftar.',
            'phone.regex' => 'No. HP harus diawali 08 dan berisi 10–13 digit.',
        ];
    }

    /** Kelas harus sesuai prodi & angkatan yang dipilih. */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($this->input('role') !== 'student' || $validator->errors()->isNotEmpty()) {
                    return;
                }

                $matches = ClassGroup::query()
                    ->whereKey($this->integer('class_group_id'))
                    ->where('study_program_id', $this->integer('study_program_id'))
                    ->where('cohort_year', $this->integer('cohort_year'))
                    ->exists();

                if (! $matches) {
                    $validator->errors()->add('class_group_id', 'Kelas tidak sesuai dengan prodi dan angkatan.');
                }
            },
        ];
    }
}
