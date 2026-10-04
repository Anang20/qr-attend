<?php

namespace App\Models;

use App\Enums\ScanResult;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Log setiap pindaian, berhasil maupun gagal (audit). */
class ScanLog extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['attendance_session_id', 'student_id', 'result', 'latitude', 'longitude', 'accuracy_m', 'distance_m', 'device_id', 'ip', 'created_at'];

    protected function casts(): array
    {
        return [
            'result' => ScanResult::class,
            'created_at' => 'datetime',
        ];
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }
}
