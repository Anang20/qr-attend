<?php

namespace App\Http\Requests\Admin;

use App\Enums\ActiveStatus;
use App\Http\Requests\Auth\RegisterRequest;
use App\Models\Lecturer;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class LecturerRequest extends FormRequest
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
            'functional_position' => $this->filled('functional_position') ? trim((string) $this->input('functional_position')) : null,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $lecturer = $this->route('lecturer');
        $lecturerId = $lecturer instanceof Lecturer ? $lecturer->id : null;
        $userId = $lecturer instanceof Lecturer ? $lecturer->user_id : null;

        return [
            'nidn' => ['required', 'digits:10', Rule::unique('lecturers', 'nidn')->ignore($lecturerId)],
            'name' => ['required', 'string', 'min:3', 'max:150'],
            'email' => ['required', 'email', 'max:150', 'ends_with:'.RegisterRequest::LECTURER_DOMAIN, Rule::unique('users', 'email')->ignore($userId)],
            'phone' => ['nullable', 'regex:/^08\d{8,11}$/'],
            'study_program_id' => ['required', 'integer', 'exists:study_programs,id'],
            'functional_position' => ['nullable', 'string', 'max:50'],
            'status' => ['required', Rule::enum(ActiveStatus::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'nidn.unique' => 'NIDN ini sudah terdaftar.',
            'phone.regex' => 'No. HP harus diawali 08 dan berisi 10–13 digit.',
            'email.ends_with' => 'Gunakan email kampus '.RegisterRequest::LECTURER_DOMAIN.'.',
        ];
    }
}
