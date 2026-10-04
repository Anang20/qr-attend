<?php

namespace App\Http\Requests\Admin;

use App\Enums\StudentStatus;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\ClassGroup;
use App\Models\Student;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StudentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'email' => strtolower(trim((string) $this->input('email'))),
            'name' => trim((string) $this->input('name')),
            'phone' => $this->filled('phone') ? trim((string) $this->input('phone')) : null,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $student = $this->route('student');
        $studentId = $student instanceof Student ? $student->id : null;
        $userId = $student instanceof Student ? $student->user_id : null;

        return [
            'nim' => ['required', 'digits:12', Rule::unique('students', 'nim')->ignore($studentId)],
            'name' => ['required', 'string', 'min:3', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'ends_with:'.RegisterRequest::STUDENT_DOMAIN, Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['nullable', 'regex:/^08\d{8,11}$/'],
            'study_program_id' => ['required', 'integer', 'exists:study_programs,id'],
            'cohort_year' => ['required', 'integer', 'between:2015,'.((int) date('Y') + 1)],
            'class_group_id' => ['required', 'integer', 'exists:class_groups,id'],
            'status' => ['required', Rule::enum(StudentStatus::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'nim.unique' => 'NIM ini sudah terdaftar.',
            'phone.regex' => 'No. HP harus diawali 08 dan berisi 10–13 digit.',
            'email.ends_with' => 'Gunakan email kampus '.RegisterRequest::STUDENT_DOMAIN.'.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                $class = ClassGroup::query()->find($this->integer('class_group_id'));
                if ($class === null
                    || (int) $class->study_program_id !== $this->integer('study_program_id')
                    || (int) $class->cohort_year !== $this->integer('cohort_year')) {
                    $validator->errors()->add('class_group_id', 'Kelas tidak sesuai dengan prodi dan angkatan.');
                }
            },
        ];
    }
}
