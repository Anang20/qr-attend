<?php

namespace App\Models;

use App\Enums\DeviceStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/** Perangkat presensi yang terikat ke akun mahasiswa. */
class Device extends Model
{
    protected $fillable = ['user_id', 'fingerprint_hash', 'device_name', 'platform', 'bound_at', 'revoked_at', 'status'];

    protected function casts(): array
    {
        return [
            'status' => DeviceStatus::class,
            'bound_at' => 'datetime',
            'revoked_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
