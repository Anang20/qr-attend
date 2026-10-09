<?php

use App\Http\Controllers\Admin;
use App\Http\Controllers\Auth\LoginController;
use App\Http\Controllers\Auth\RegisterController;
use App\Http\Controllers\HomeController;
use App\Http\Controllers\LeaveAttachmentController;
use App\Http\Controllers\ProfileController;
use App\Http\Controllers\RecapController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\Lecturer;
use App\Http\Controllers\Student;
use Illuminate\Support\Facades\Route;

/*
| URL memakai Bahasa Indonesia agar sesuai dengan antarmuka.
*/

Route::get('/', [HomeController::class, 'index'])->middleware('auth')->name('home');

// ── Autentikasi ────────────────────────────────────────────────
Route::middleware('guest')->group(function (): void {
    Route::get('/masuk', [LoginController::class, 'create'])->name('login');
    Route::post('/masuk', [LoginController::class, 'store'])->middleware('throttle:10,1');

    Route::get('/daftar', [RegisterController::class, 'create'])->name('register');
    Route::post('/daftar', [RegisterController::class, 'store'])->middleware('throttle:6,1');
});

Route::post('/keluar', [LoginController::class, 'destroy'])->middleware('auth')->name('logout');

// ── Bersama (semua peran yang sudah masuk) ─────────────────────
Route::middleware('auth')->group(function (): void {
    Route::get('/profil', [ProfileController::class, 'show'])->name('profile.show');
    Route::put('/profil/kontak', [ProfileController::class, 'updateContact'])->name('profile.contact');
    Route::put('/profil/kata-sandi', [ProfileController::class, 'updatePassword'])->middleware('throttle:6,1')->name('profile.password');
    Route::post('/profil/keluarkan-perangkat-lain', [ProfileController::class, 'logoutOtherSessions'])->middleware('throttle:6,1')->name('profile.logout-others');
    Route::post('/profil/reset-perangkat', [ProfileController::class, 'requestDeviceReset'])->name('profile.device-reset');
    Route::delete('/profil/reset-perangkat/{resetRequest}', [ProfileController::class, 'cancelDeviceReset'])->name('profile.device-reset.cancel');

    Route::get('/pengaturan', [SettingController::class, 'show'])->middleware('role:admin,lecturer')->name('settings.show');
    Route::put('/pengaturan', [SettingController::class, 'update'])->middleware('role:admin')->name('settings.update');

    // Lampiran izin: otorisasi per peran di controller.
    Route::get('/lampiran-izin/{leaveRequest}', LeaveAttachmentController::class)->name('leave-attachments.show');
});

// ── Admin ──────────────────────────────────────────────────────
Route::middleware(['auth', 'role:admin'])->prefix('admin')->name('admin.')->group(function (): void {
    Route::get('/', Admin\DashboardController::class)->name('dashboard');

    Route::get('/periode-akademik', [Admin\AcademicPeriodController::class, 'index'])->name('periods.index');
    Route::post('/periode-akademik', [Admin\AcademicPeriodController::class, 'store'])->name('periods.store');
    Route::put('/periode-akademik/{period}', [Admin\AcademicPeriodController::class, 'update'])->name('periods.update');
    Route::delete('/periode-akademik/{period}', [Admin\AcademicPeriodController::class, 'destroy'])->name('periods.destroy');

    Route::get('/mahasiswa', [Admin\StudentController::class, 'index'])->name('students.index');
    Route::post('/mahasiswa', [Admin\StudentController::class, 'store'])->name('students.store');
    Route::put('/mahasiswa/{student}', [Admin\StudentController::class, 'update'])->name('students.update');
    Route::delete('/mahasiswa/{student}', [Admin\StudentController::class, 'destroy'])->name('students.destroy');
    Route::post('/mahasiswa/{student}/reset-perangkat', [Admin\StudentController::class, 'resetDevice'])->name('students.reset-device');

    Route::get('/dosen', [Admin\LecturerController::class, 'index'])->name('lecturers.index');
    Route::post('/dosen', [Admin\LecturerController::class, 'store'])->name('lecturers.store');
    Route::put('/dosen/{lecturer}', [Admin\LecturerController::class, 'update'])->name('lecturers.update');
    Route::delete('/dosen/{lecturer}', [Admin\LecturerController::class, 'destroy'])->name('lecturers.destroy');
    Route::post('/dosen/{lecturer}/setujui', [Admin\LecturerController::class, 'approve'])->name('lecturers.approve');
    Route::post('/dosen/{lecturer}/tolak', [Admin\LecturerController::class, 'reject'])->name('lecturers.reject');

    Route::get('/mata-kuliah', [Admin\CourseController::class, 'index'])->name('courses.index');
    Route::post('/mata-kuliah', [Admin\CourseController::class, 'store'])->name('courses.store');
    Route::put('/mata-kuliah/{course}', [Admin\CourseController::class, 'update'])->name('courses.update');
    Route::delete('/mata-kuliah/{course}', [Admin\CourseController::class, 'destroy'])->name('courses.destroy');

    Route::get('/kelas', [Admin\ClassGroupController::class, 'index'])->name('class-groups.index');
    Route::post('/kelas', [Admin\ClassGroupController::class, 'store'])->name('class-groups.store');
    Route::put('/kelas/{classGroup}', [Admin\ClassGroupController::class, 'update'])->name('class-groups.update');
    Route::delete('/kelas/{classGroup}', [Admin\ClassGroupController::class, 'destroy'])->name('class-groups.destroy');

    Route::get('/ruang', [Admin\RoomController::class, 'index'])->name('rooms.index');
    Route::post('/ruang', [Admin\RoomController::class, 'store'])->name('rooms.store');
    Route::put('/ruang/{room}', [Admin\RoomController::class, 'update'])->name('rooms.update');
    Route::delete('/ruang/{room}', [Admin\RoomController::class, 'destroy'])->name('rooms.destroy');

    Route::get('/pemetaan-kelas', [Admin\ClassScheduleController::class, 'index'])->name('class-schedules.index');
    Route::post('/pemetaan-kelas', [Admin\ClassScheduleController::class, 'store'])->name('class-schedules.store');
    Route::post('/pemetaan-kelas/salin', [Admin\ClassScheduleController::class, 'copy'])->name('class-schedules.copy');
    Route::put('/pemetaan-kelas/{schedule}', [Admin\ClassScheduleController::class, 'update'])->name('class-schedules.update');
    Route::delete('/pemetaan-kelas/{schedule}', [Admin\ClassScheduleController::class, 'destroy'])->name('class-schedules.destroy');

    Route::get('/jadwal-akademik', Admin\AcademicScheduleController::class)->name('academic-schedules.index');

    Route::get('/laporan-presensi', Admin\ReportController::class)->name('reports.index');
    Route::get('/rekap-kehadiran', RecapController::class)->name('recap.index');

    Route::post('/reset-perangkat/{resetRequest}/setujui', [Admin\DeviceResetController::class, 'approve'])->name('device-resets.approve');
    Route::post('/reset-perangkat/{resetRequest}/tolak', [Admin\DeviceResetController::class, 'reject'])->name('device-resets.reject');
});

// ── Dosen ──────────────────────────────────────────────────────
Route::middleware(['auth', 'role:lecturer'])->prefix('dosen')->name('lecturer.')->group(function (): void {
    Route::get('/', Lecturer\DashboardController::class)->name('dashboard');
    Route::get('/jadwal', Lecturer\ScheduleController::class)->name('schedule');
    Route::get('/presensi', [Lecturer\SessionController::class, 'index'])->name('sessions.index');
    Route::get('/presensi/{session}', [Lecturer\SessionController::class, 'show'])->name('sessions.show');
    Route::post('/presensi/{session}/buka', [Lecturer\SessionController::class, 'open'])->name('sessions.open');
    Route::post('/presensi/{session}/selesai', [Lecturer\SessionController::class, 'finish'])->name('sessions.finish');
    Route::get('/presensi/{session}/manual', [Lecturer\ManualAttendanceController::class, 'index'])->name('sessions.manual');
    Route::put('/presensi/{session}/manual/{student}', [Lecturer\ManualAttendanceController::class, 'update'])->name('sessions.manual.update');

    Route::get('/mahasiswa', Lecturer\StudentController::class)->name('students');
    Route::get('/rekap-kehadiran', RecapController::class)->name('recap');
    Route::get('/persetujuan-izin', [Lecturer\LeaveApprovalController::class, 'index'])->name('leave-approvals.index');
    Route::post('/persetujuan-izin/{leaveRequest}/setujui', [Lecturer\LeaveApprovalController::class, 'approve'])->name('leave-approvals.approve');
    Route::post('/persetujuan-izin/{leaveRequest}/tolak', [Lecturer\LeaveApprovalController::class, 'reject'])->name('leave-approvals.reject');
});

// ── Mahasiswa ──────────────────────────────────────────────────
Route::middleware(['auth', 'role:student'])->prefix('mahasiswa')->name('student.')->group(function (): void {
    Route::get('/', [HomeController::class, 'student'])->name('dashboard');
    Route::get('/kelas-hari-ini', Student\TodayController::class)->name('today');
    Route::get('/pindai', [Student\ScanController::class, 'show'])->name('scan');
    Route::post('/pindai', [Student\ScanController::class, 'store'])->middleware('throttle:10,1')->name('scan.store');
    Route::get('/presensi/gagal', [Student\ScanController::class, 'failed'])->name('scan.failed');
    Route::get('/presensi/{attendance}/berhasil', [Student\ScanController::class, 'success'])->name('scan.success');

    Route::get('/riwayat', [Student\HistoryController::class, 'index'])->name('history');
    Route::get('/riwayat/{attendance}', [Student\HistoryController::class, 'show'])->name('history.show');
    Route::get('/pengajuan-izin', [Student\LeaveRequestController::class, 'index'])->name('leave-requests.index');
    Route::post('/pengajuan-izin', [Student\LeaveRequestController::class, 'store'])->middleware('throttle:10,1')->name('leave-requests.store');
    Route::delete('/pengajuan-izin/{leaveRequest}', [Student\LeaveRequestController::class, 'cancel'])->name('leave-requests.cancel');
});
