<?php

namespace App\Models;

use App\Enums\RequestStatus;
use App\Enums\ResetReason;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Permintaan reset perangkat presensi. */
class DeviceResetRequest extends Model
{
    protected $fillable = ['user_id', 'device_id', 'reason', 'status', 'reviewed_by', 'reviewed_at'];

    protected function casts(): array
    {
        return [
            'reason' => ResetReason::class,
            'status' => RequestStatus::class,
            'reviewed_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function device(): BelongsTo
    {
        return $this->belongsTo(Device::class);
    }
}
