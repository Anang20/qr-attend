<?php

namespace App\Http\Requests\Student;

use App\Enums\LeaveType;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Pengajuan izin/sakit (BR-12, BR-13). Aturan per pertemuan (jendela, sudah hadir,
 * sudah diajukan) diperiksa di LeaveRequests::validateSessions karena butuh data mahasiswa.
 */
class LeaveRequestStoreRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::enum(LeaveType::class)],
            'session_ids' => ['required', 'array', 'min:1', 'max:16'],
            'session_ids.*' => ['integer', 'distinct'],
            'reason' => ['required', 'string', 'min:15', 'max:300'],
            // Sakit wajib surat; izin opsional. JPG/PNG/PDF maks. 2 MB.
            'attachment' => [
                Rule::requiredIf($this->input('type') === LeaveType::Sick->value),
                'nullable', 'file', 'mimes:jpg,jpeg,png,pdf', 'max:2048',
            ],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'session_ids.required' => 'Pilih minimal satu pertemuan.',
            'session_ids.min' => 'Pilih minimal satu pertemuan.',
            'attachment.required' => 'Pengajuan sakit wajib melampirkan surat keterangan dokter.',
            'attachment.max' => 'Lampiran maksimal 2 MB.',
            'attachment.mimes' => 'Lampiran harus JPG, PNG, atau PDF.',
        ];
    }

    /** @return array<string, string> */
    public function attributes(): array
    {
        return ['type' => 'jenis pengajuan', 'reason' => 'alasan', 'attachment' => 'lampiran'];
    }
}
