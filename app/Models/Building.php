<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/** Gedung kampus. */
class Building extends Model
{
    protected $fillable = ['code', 'name'];

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }
}
