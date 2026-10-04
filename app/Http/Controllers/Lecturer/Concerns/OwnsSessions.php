<?php

namespace App\Http\Controllers\Lecturer\Concerns;

use App\Models\AttendanceSession;
use App\Models\Lecturer;
use Illuminate\Http\Request;

/** Dosen hanya boleh mengakses sesi mata kuliah yang ia ampu (NFR-07). */
trait OwnsSessions
{
    protected function lecturer(Request $request): Lecturer
    {
        return $request->user()->lecturer()->firstOrFail();
    }

    protected function authorizeSession(Request $request, AttendanceSession $session): Lecturer
    {
        $lecturer = $this->lecturer($request);
        $session->loadMissing('classSchedule');

        abort_unless((int) $session->classSchedule->lecturer_id === (int) $lecturer->id, 403, 'Sesi ini bukan milik Anda.');

        return $lecturer;
    }
}
