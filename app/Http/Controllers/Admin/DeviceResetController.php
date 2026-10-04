<?php

namespace App\Http\Controllers\Admin;

use App\Enums\RequestStatus;
use App\Http\Controllers\Controller;
use App\Models\DeviceResetRequest;
use App\Services\DeviceBinding;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/** Admin memproses permintaan reset perangkat mahasiswa (BR-07). */
class DeviceResetController extends Controller
{
    public function approve(Request $request, DeviceResetRequest $resetRequest): RedirectResponse
    {
        if ($resetRequest->status !== RequestStatus::Pending) {
            return back()->with('error', 'Permintaan ini sudah diproses.');
        }

        DB::transaction(function () use ($request, $resetRequest): void {
            DeviceBinding::revoke($resetRequest->user);
            $resetRequest->update(['status' => RequestStatus::Approved, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);
        });

        return back()->with('success', 'Perangkat '.$resetRequest->user->name.' direset. Ponsel berikutnya yang dipakai masuk akan diikat.');
    }

    public function reject(Request $request, DeviceResetRequest $resetRequest): RedirectResponse
    {
        if ($resetRequest->status !== RequestStatus::Pending) {
            return back()->with('error', 'Permintaan ini sudah diproses.');
        }

        $resetRequest->update(['status' => RequestStatus::Rejected, 'reviewed_by' => $request->user()->id, 'reviewed_at' => now()]);

        return back()->with('success', 'Permintaan reset '.$resetRequest->user->name.' ditolak.');
    }
}
