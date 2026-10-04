<?php

namespace App\Models;

use App\Enums\ActiveStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Ruang kuliah beserta titik presensinya. */
class Room extends Model
{
    protected $fillable = ['code', 'name', 'building_id', 'floor', 'capacity', 'latitude', 'longitude', 'radius_m', 'point_accuracy_m', 'point_set_at', 'point_set_by', 'status'];

    protected function casts(): array
    {
        return [
            'status' => ActiveStatus::class,
            'latitude' => 'float',
            'longitude' => 'float',
            'point_accuracy_m' => 'float',
            'radius_m' => 'integer',
            'floor' => 'integer',
            'capacity' => 'integer',
            'point_set_at' => 'datetime',
        ];
    }

    public function building(): BelongsTo
    {
        return $this->belongsTo(Building::class);
    }

    public function pointSetter(): BelongsTo
    {
        return $this->belongsTo(User::class, 'point_set_by');
    }

    public function classSchedules(): HasMany
    {
        return $this->hasMany(ClassSchedule::class);
    }

    public function hasPoint(): bool
    {
        return $this->latitude !== null && $this->longitude !== null;
    }

    /** Status tampilan: Siap presensi / Belum ada titik / Nonaktif. */
    public function readiness(): string
    {
        if ($this->status === ActiveStatus::Inactive) {
            return 'inactive';
        }

        return $this->hasPoint() ? 'ready' : 'missing';
    }
}
