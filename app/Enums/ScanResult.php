<?php

namespace App\Enums;

use App\Enums\Concerns\HasOptions;

/** Hasil validasi pindaian. */
enum ScanResult: string
{
    use HasOptions;

    case Success = 'success';
    case Unauthorized = 'unauthorized';
    case InvalidQr = 'invalid_qr';
    case Expired = 'expired';
    case WrongClass = 'wrong_class';
    case WrongSchedule = 'wrong_schedule';
    case Duplicate = 'duplicate';
    case LowAccuracy = 'low_accuracy';
    case OutsideRadius = 'outside_radius';
    case DeviceMismatch = 'device_mismatch';

    public function label(): string
    {
        return match ($this) {
            self::Success => 'Berhasil',
            self::Unauthorized => 'Perlu masuk ulang',
            self::InvalidQr => 'QR tidak valid',
            self::Expired => 'Sesi kedaluwarsa',
            self::WrongClass => 'Bukan kelasnya',
            self::WrongSchedule => 'Di luar jadwal',
            self::Duplicate => 'Sudah presensi',
            self::LowAccuracy => 'Akurasi rendah',
            self::OutsideRadius => 'Di luar radius',
            self::DeviceMismatch => 'Perangkat berbeda',
        };
    }
}
