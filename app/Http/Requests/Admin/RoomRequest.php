<?php

namespace App\Http\Requests\Admin;

use App\Enums\ActiveStatus;
use App\Models\Room;
use App\Services\Geo;
use App\Services\Settings;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class RoomRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $blank = fn (string $key): mixed => $this->filled($key) ? $this->input($key) : null;

        $this->merge([
            'code' => strtoupper(trim((string) $this->input('code'))),
            'name' => trim((string) $this->input('name')),
            'latitude' => $blank('latitude'),
            'longitude' => $blank('longitude'),
            'point_accuracy_m' => $blank('point_accuracy_m'),
        ]);
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        $room = $this->route('room');
        $ignore = $room instanceof Room ? $room->id : null;
        $minRadius = (int) config('attendance.min_radius_m');
        $maxRadius = (int) config('attendance.max_radius_m');

        return [
            'code' => ['required', 'regex:/^[A-Z0-9]{2,10}$/', Rule::unique('rooms', 'code')->ignore($ignore)],
            'name' => ['required', 'string', 'max:50', Rule::unique('rooms', 'name')->ignore($ignore)],
            'building_id' => ['required', 'integer', 'exists:buildings,id'],
            'floor' => ['required', 'integer', 'between:1,10'],
            'capacity' => ['required', 'integer', 'between:5,500'],
            'status' => ['required', Rule::enum(ActiveStatus::class)],
            // BR-23: latitude & longitude diisi keduanya atau kosong keduanya.
            'latitude' => ['nullable', 'required_with:longitude', 'numeric', 'between:-90,90'],
            'longitude' => ['nullable', 'required_with:latitude', 'numeric', 'between:-180,180'],
            'radius_m' => ['required', 'integer', "between:{$minRadius},{$maxRadius}"],
            'point_accuracy_m' => ['nullable', 'numeric', 'between:0,100'],
        ];
    }

    /** @return array<string, string> */
    public function messages(): array
    {
        return [
            'code.regex' => 'Kode ruang: huruf kapital/angka, 2–10 karakter.',
            'code.unique' => 'Kode ruang sudah dipakai.',
            'name.unique' => 'Nama ruang sudah ada.',
            'latitude.required_with' => 'Latitude dan longitude harus diisi keduanya.',
            'longitude.required_with' => 'Latitude dan longitude harus diisi keduanya.',
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if ($validator->errors()->isNotEmpty() || ! $this->filled('latitude')) {
                    return;
                }

                // BR-23: titik maks. 500 m dari pusat kampus (cegah lat/lng tertukar).
                $distance = Geo::distanceMeters(
                    Settings::float('campus_center_lat'),
                    Settings::float('campus_center_lng'),
                    (float) $this->input('latitude'),
                    (float) $this->input('longitude'),
                );
                $max = Settings::int('campus_max_distance_m');

                if ($distance > $max) {
                    $validator->errors()->add(
                        'latitude',
                        'Titik berada '.number_format($distance, 0, ',', '.')." m dari kampus (maks. {$max} m). Periksa lagi, mungkin latitude dan longitude tertukar.",
                    );
                }
            },
        ];
    }
}
