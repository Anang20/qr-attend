<?php

namespace App\Http\Requests\Admin;

use App\Enums\ActiveStatus;
use App\Models\ClassGroup;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class ClassGroupRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'code' => strtoupper(trim((string) $this->input('code'))),
            'advisor_lecturer_id' => $this->filled('advisor_lecturer_id') ? $this->input('advisor_lecturer_id') : null,
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $class = $this->route('classGroup');

        return [
            'code' => ['required', 'string', 'max:10', Rule::unique('class_groups', 'code')->ignore($class instanceof ClassGroup ? $class->id : null)],
            'study_program_id' => ['required', 'integer', 'exists:study_programs,id'],
            'cohort_year' => ['required', 'integer', 'between:2015,'.((int) date('Y') + 1)],
            'advisor_lecturer_id' => ['nullable', 'integer', 'exists:lecturers,id'],
            'capacity' => ['required', 'integer', 'between:5,200'],
            'status' => ['required', Rule::enum(ActiveStatus::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.max' => 'Kode kelas maksimal 10 karakter.',
            'code.unique' => 'Kode kelas sudah dipakai.',
        ];
    }

    /** Kapasitas tidak boleh lebih kecil dari jumlah mahasiswa saat ini. */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $class = $this->route('classGroup');
                if (! $class instanceof ClassGroup || $validator->errors()->has('capacity')) {
                    return;
                }

                $count = $class->students()->count();
                if ($this->integer('capacity') < $count) {
                    $validator->errors()->add('capacity', "Kapasitas tidak boleh kurang dari jumlah mahasiswa saat ini ({$count}).");
                }
            },
        ];
    }
}
