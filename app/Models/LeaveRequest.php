<?php

namespace App\Models;

use App\Enums\LeaveType;
use App\Enums\RequestStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Pengajuan izin/sakit untuk satu pertemuan. */
class LeaveRequest extends Model
{
    protected $fillable = ['batch_id', 'student_id', 'attendance_session_id', 'type', 'reason', 'attachment_path', 'status', 'reviewed_by', 'reviewed_at', 'review_note'];

    protected function casts(): array
    {
        return [
            'type' => LeaveType::class,
            'status' => RequestStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    public function student(): BelongsTo
    {
        return $this->belongsTo(Student::class);
    }

    public function session(): BelongsTo
    {
        return $this->belongsTo(AttendanceSession::class, 'attendance_session_id');
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(Lecturer::class, 'reviewed_by');
    }
}
