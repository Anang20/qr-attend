<?php

namespace App\Http\Controllers;

use App\Enums\UserRole;
use App\Models\LeaveRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Symfony\Component\HttpFoundation\StreamedResponse;

/**
 * Lampiran surat izin/sakit disimpan di storage privat (NFR-08) dan hanya bisa dibuka oleh
 * mahasiswa pemilik, dosen pengampu pertemuan tersebut, atau admin.
 */
class LeaveAttachmentController extends Controller
{
    public function __invoke(Request $request, LeaveRequest $leaveRequest): StreamedResponse
    {
        $user = $request->user();
        $leaveRequest->load('session.classSchedule');

        $allowed = match ($user->role) {
            UserRole::Admin => true,
            UserRole::Student => (int) $user->student?->id === (int) $leaveRequest->student_id,
            UserRole::Lecturer => (int) $user->lecturer?->id === (int) $leaveRequest->session->classSchedule->lecturer_id,
        };

        abort_unless($allowed && $leaveRequest->attachment_path !== null, 404);
        abort_unless(Storage::disk('local')->exists($leaveRequest->attachment_path), 404, 'Lampiran tidak ditemukan.');

        return Storage::disk('local')->response($leaveRequest->attachment_path, null, ['X-Content-Type-Options' => 'nosniff']);
    }
}
