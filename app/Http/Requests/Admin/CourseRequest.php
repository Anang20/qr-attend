<?php

namespace App\Http\Requests\Admin;

use App\Enums\ActiveStatus;
use App\Enums\CourseType;
use App\Models\Course;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class CourseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper(trim((string) $this->input('code'))),
            'name' => trim((string) $this->input('name')),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $course = $this->route('course');

        return [
            'code' => ['required', 'regex:/^[A-Z]{2,4}-\d{3}$/', Rule::unique('courses', 'code')->ignore($course instanceof Course ? $course->id : null)],
            'name' => ['required', 'string', 'min:3', 'max:100'],
            'credits' => ['required', 'integer', 'between:1,6'],
            'semester' => ['required', 'integer', 'between:1,8'],
            'type' => ['required', Rule::enum(CourseType::class)],
            'study_program_id' => ['required', 'integer', 'exists:study_programs,id'],
            'status' => ['required', Rule::enum(ActiveStatus::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.regex' => 'Kode mata kuliah berformat seperti IF-305.',
            'code.unique' => 'Kode mata kuliah sudah dipakai.',
        ];
    }
}
