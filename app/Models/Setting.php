<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Kebijakan presensi (key-value). */
class Setting extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['key', 'value', 'type', 'is_locked', 'updated_by'];

    protected function casts(): array
    {
        return [
            'is_locked' => 'boolean',
        ];
    }
}
