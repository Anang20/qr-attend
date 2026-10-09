<?php

namespace App\Models;

use App\Enums\UserRole;
use App\Enums\UserStatus;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Akun login untuk semua peran. Data akademik ada di Student / Lecturer.
 *
 * @property int $id
 * @property string $name
 * @property string $email
 * @property UserRole $role
 * @property UserStatus $status
 */
class User extends Authenticatable
{
    use Notifiable;

    protected $fillable = [
        'name', 'email', 'phone', 'password', 'role', 'status',
        'email_verified_at', 'approved_by', 'approved_at', 'last_login_at',
    ];

    protected $hidden = ['password', 'remember_token'];

    protected function casts(): array
    {
        return [
            'role' => UserRole::class,
            'status' => UserStatus::class,
            'email_verified_at' => 'datetime',
            'approved_at' => 'datetime',
            'last_login_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    public function student(): HasOne
    {
        return $this->hasOne(Student::class);
    }

    public function lecturer(): HasOne
    {
        return $this->hasOne(Lecturer::class);
    }

    public function devices(): HasMany
    {
        return $this->hasMany(Device::class);
    }

    public function isActive(): bool
    {
        return $this->status === UserStatus::Active;
    }

    /** Inisial avatar: "Ray Pengki" → "RP", "Gusmayeni, S.Kom., M.Kom" → "G". */
    public function initials(): string
    {
        $name = trim(explode(',', $this->name)[0]);
        $words = preg_split('/\s+/', $name) ?: [];
        $letters = array_map(fn (string $w): string => mb_strtoupper(mb_substr($w, 0, 1)), array_slice($words, 0, 2));

        return implode('', $letters);
    }
}
