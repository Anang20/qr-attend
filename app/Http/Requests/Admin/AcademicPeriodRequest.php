<?php

namespace App\Http\Requests\Admin;

use App\Enums\PeriodStatus;
use App\Enums\Semester;
use App\Models\AcademicPeriod;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class AcademicPeriodRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $period = $this->route('period');

        return [
            'academic_year' => ['required', 'regex:/^\d{4}\/\d{4}$/'],
            'semester' => [
                'required',
                Rule::enum(Semester::class),
                // BR-18: kombinasi tahun ajaran + semester unik.
                Rule::unique('academic_periods')
                    ->where('academic_year', $this->input('academic_year'))
                    ->ignore($period instanceof AcademicPeriod ? $period->id : null),
            ],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after:start_date'],
            'status' => ['required', Rule::enum(PeriodStatus::class)],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'academic_year.regex' => 'Tahun ajaran harus berformat 2026/2027.',
            'semester.unique' => 'Periode dengan tahun ajaran dan semester ini sudah ada.',
            'end_date.after' => 'Tanggal selesai harus setelah tanggal mulai.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                [$first, $second] = array_map('intval', explode('/', (string) $this->input('academic_year')));
                if ($second !== $first + 1) {
                    $validator->errors()->add('academic_year', 'Tahun kedua harus satu tahun setelah tahun pertama.');

                    return;
                }

                // BR-18: rentang tanggal tidak boleh tumpang tindih dengan periode lain.
                $period = $this->route('period');
                $overlap = AcademicPeriod::query()
                    ->when($period instanceof AcademicPeriod, fn ($q) => $q->whereKeyNot($period->id))
                    ->whereDate('start_date', '<=', $this->input('end_date'))
                    ->whereDate('end_date', '>=', $this->input('start_date'))
                    ->first();

                if ($overlap !== null) {
                    $validator->errors()->add(
                        'start_date',
                        'Rentang tanggal bertabrakan dengan periode '.$overlap->label().'.',
                    );
                }
            },
        ];
    }
}
