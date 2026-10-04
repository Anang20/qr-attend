# Desain QR Attend (mockup)

Salinan dari kanvas desain di claude.ai (versi terbaru) supaya bisa dibaca Claude Code di VS Code.

- `screens/*.png` — tangkapan layar tiap layar, ukuran asli (desktop 1440 px, mobile 390 px). **Acuan tampilan.**
- `source/*.dc.html` — sumber desain: markup, teks, data contoh, dan logika interaksi di `renderVals()`. **Acuan detail** (label, urutan kolom, validasi, pesan galat).
- `source/canvas.json` — daftar papan + judulnya.

Cara pakai saat membangun halaman: buka PNG untuk tata letak, lalu baca `.dc.html` untuk teks & aturan persisnya. Implementasi tetap memakai komponen proyek (shadcn/ui + `components/app`), bukan menyalin HTML inline-style dari desain.

Kolom **Tahap**: tahap pembangunan layar tersebut. Tahap 1–3 sudah dibangun semua.

## Autentikasi

| Layar | PNG | Sumber | Ukuran | Rute di aplikasi | Tahap |
|---|---|---|---|---|---|
| Lupa Kata Sandi | [png](screens/ForgotPassword.png) | [dc.html](source/ForgotPassword.dc.html) | 1440×900 | `/lupa-kata-sandi` | 1 |
| Masuk | [png](screens/Main.png) | [dc.html](source/Main.dc.html) | 1440×900 | `/masuk` | 1 |
| Daftar | [png](screens/Register.png) | [dc.html](source/Register.dc.html) | 1440×1000 | `/daftar` | 1 |

## Admin

| Layar | PNG | Sumber | Ukuran | Rute di aplikasi | Tahap |
|---|---|---|---|---|---|
| Periode Akademik | [png](screens/AcademicPeriod.png) | [dc.html](source/AcademicPeriod.dc.html) | 1440×1000 | `/admin/periode-akademik` | 1 |
| Dasbor | [png](screens/AdminDashboard.png) | [dc.html](source/AdminDashboard.dc.html) | 1440×1160 | `/admin` | 1 (grafik: 3) |
| Rekap Kehadiran | [png](screens/AttendanceRecap.png) | [dc.html](source/AttendanceRecap.dc.html) | 1440×1240 | `/admin/rekap-kehadiran` | 3 |
| Laporan Presensi | [png](screens/AttendanceReports.png) | [dc.html](source/AttendanceReports.dc.html) | 1440×1300 | `/admin/laporan-presensi` | 3 |
| Manajemen Kelas | [png](screens/ClassManagement.png) | [dc.html](source/ClassManagement.dc.html) | 1440×1000 | `/admin/kelas` | 1 |
| Pemetaan Kelas | [png](screens/ClassMapping.png) | [dc.html](source/ClassMapping.dc.html) | 1440×1400 | `/admin/pemetaan-kelas` | 2 |
| Manajemen Mata Kuliah | [png](screens/CourseManagement.png) | [dc.html](source/CourseManagement.dc.html) | 1440×1000 | `/admin/mata-kuliah` | 1 |
| Manajemen Dosen | [png](screens/LecturerManagement.png) | [dc.html](source/LecturerManagement.dc.html) | 1440×1000 | `/admin/dosen` | 1 |
| Ruang & Titik Presensi | [png](screens/RoomManagement.png) | [dc.html](source/RoomManagement.dc.html) | 1440×1120 | `/admin/ruang` | 1 |
| Jadwal Akademik (baca saja, dari Pemetaan) | [png](screens/ScheduleManagement.png) | [dc.html](source/ScheduleManagement.dc.html) | 1440×1000 | `/admin/jadwal-akademik` | 2 |
| Manajemen Mahasiswa | [png](screens/StudentManagement.png) | [dc.html](source/StudentManagement.dc.html) | 1440×1000 | `/admin/mahasiswa` | 1 |

## Dosen

| Layar | PNG | Sumber | Ukuran | Rute di aplikasi | Tahap |
|---|---|---|---|---|---|
| Sesi QR Aktif | [png](screens/ActiveQR.png) | [dc.html](source/ActiveQR.dc.html) | 1440×1080 | `/dosen/presensi/{id} (sesi dibuka)` | 2 |
| Sesi Kedaluwarsa | [png](screens/ExpiredAttendance.png) | [dc.html](source/ExpiredAttendance.dc.html) | 1440×960 | `/dosen/presensi/{id} (kedaluwarsa)` | 2 |
| Persetujuan Izin | [png](screens/LeaveApproval.png) | [dc.html](source/LeaveApproval.dc.html) | 1440×1000 | `/dosen/persetujuan-izin` | 3 |
| Dasbor | [png](screens/LecturerDashboard.png) | [dc.html](source/LecturerDashboard.dc.html) | 1440×1100 | `/dosen` | 2 |
| Riwayat Presensi | [png](screens/LecturerHistory.png) | [dc.html](source/LecturerHistory.dc.html) | 1440×960 | `/dosen/presensi?when=past (riwayat)` | 2 (detail laporan: 3) |
| Rekap Kehadiran | [png](screens/LecturerRecap.png) | [dc.html](source/LecturerRecap.dc.html) | 1440×1240 | `/dosen/rekap-kehadiran` | 3 |
| Jadwal | [png](screens/LecturerSchedule.png) | [dc.html](source/LecturerSchedule.dc.html) | 1440×960 | `/dosen/jadwal` | 2 |
| Mahasiswa (pilih kelas dulu) | [png](screens/LecturerStudents.png) | [dc.html](source/LecturerStudents.dc.html) | 1440×1040 | `/dosen/mahasiswa` | 3 |
| Presensi Manual | [png](screens/ManualAttendance.png) | [dc.html](source/ManualAttendance.dc.html) | 1440×1040 | `/dosen/presensi/{id}/manual` | 2 |
| Mulai Presensi | [png](screens/StartAttendance.png) | [dc.html](source/StartAttendance.dc.html) | 1440×960 | `/dosen/presensi/{id} (belum dibuka)` | 2 |

## Mahasiswa (desktop)

| Layar | PNG | Sumber | Ukuran | Rute di aplikasi | Tahap |
|---|---|---|---|---|---|
| Detail Presensi | [png](screens/AttendanceDetailDesktop.png) | [dc.html](source/AttendanceDetailDesktop.dc.html) | 1440×900 | `/mahasiswa/riwayat/{id}` | 3 |
| Presensi Gagal | [png](screens/AttendanceFailedDesktop.png) | [dc.html](source/AttendanceFailedDesktop.dc.html) | 1440×900 | `/mahasiswa/presensi/gagal` | 2 |
| Presensi Berhasil | [png](screens/AttendanceSuccessDesktop.png) | [dc.html](source/AttendanceSuccessDesktop.dc.html) | 1440×900 | `/mahasiswa/presensi/{id}/berhasil` | 2 |
| Pengajuan Izin | [png](screens/LeaveRequestDesktop.png) | [dc.html](source/LeaveRequestDesktop.dc.html) | 1440×1400 | `/mahasiswa/pengajuan-izin` | 3 |
| Pindai QR | [png](screens/QRScannerDesktop.png) | [dc.html](source/QRScannerDesktop.dc.html) | 1440×1000 | `/mahasiswa/pindai` | 2 |
| Beranda | [png](screens/StudentDashboardDesktop.png) | [dc.html](source/StudentDashboardDesktop.dc.html) | 1440×1060 | `/mahasiswa` | 2 |
| Riwayat Presensi | [png](screens/StudentHistoryDesktop.png) | [dc.html](source/StudentHistoryDesktop.dc.html) | 1440×1040 | `/mahasiswa/riwayat` | 3 |
| Profil | [png](screens/StudentProfileDesktop.png) | [dc.html](source/StudentProfileDesktop.dc.html) | 1440×1000 | `/profil` (mahasiswa) | 3 |
| Kelas Hari Ini | [png](screens/TodayClassDesktop.png) | [dc.html](source/TodayClassDesktop.dc.html) | 1440×900 | `/mahasiswa/kelas-hari-ini` | 2 |

## Mahasiswa (mobile)

| Layar | PNG | Sumber | Ukuran | Rute di aplikasi | Tahap |
|---|---|---|---|---|---|
| Detail Presensi | [png](screens/AttendanceDetail.png) | [dc.html](source/AttendanceDetail.dc.html) | 390×900 | `/mahasiswa/riwayat/{id}` (mobile) | 3 |
| Presensi Gagal | [png](screens/AttendanceFailed.png) | [dc.html](source/AttendanceFailed.dc.html) | 390×844 | `/mahasiswa/presensi/gagal (mobile)` | 2 |
| Presensi Berhasil | [png](screens/AttendanceSuccess.png) | [dc.html](source/AttendanceSuccess.dc.html) | 390×844 | `/mahasiswa/presensi/{id}/berhasil (mobile)` | 2 |
| Pengajuan Izin | [png](screens/LeaveRequest.png) | [dc.html](source/LeaveRequest.dc.html) | 390×2440 | `/mahasiswa/pengajuan-izin` (mobile) | 3 |
| Pemindai QR | [png](screens/QRScanner.png) | [dc.html](source/QRScanner.dc.html) | 390×920 | `/mahasiswa/pindai (mobile)` | 2 |
| Beranda | [png](screens/StudentDashboard.png) | [dc.html](source/StudentDashboard.dc.html) | 390×1480 | `/mahasiswa (mobile)` | 2 |
| Riwayat Presensi | [png](screens/StudentHistory.png) | [dc.html](source/StudentHistory.dc.html) | 390×1200 | `/mahasiswa/riwayat` (mobile) | 3 |
| Profil | [png](screens/StudentProfile.png) | [dc.html](source/StudentProfile.dc.html) | 390×1900 | `/profil` (mahasiswa, mobile) | 3 |
| Kelas Hari Ini | [png](screens/TodayClass.png) | [dc.html](source/TodayClass.dc.html) | 390×844 | `/mahasiswa/kelas-hari-ini (mobile)` | 2 |

## Sistem

| Layar | PNG | Sumber | Ukuran | Rute di aplikasi | Tahap |
|---|---|---|---|---|---|
| Profil | [png](screens/Profile.png) | [dc.html](source/Profile.dc.html) | 1440×960 | `/profil` (admin/dosen) | 3 |
| Pengaturan | [png](screens/Settings.png) | [dc.html](source/Settings.dc.html) | 1440×1200 | `/pengaturan` | 3 |
| State UX | [png](screens/UXStates.png) | [dc.html](source/UXStates.dc.html) | 1440×1320 | `— (dokumentasi state)` | referensi |

## Komponen

| Layar | PNG | Sumber | Ukuran | Rute di aplikasi | Tahap |
|---|---|---|---|---|---|
| Halaman CRUD | [png](screens/CrudPage.png) | [dc.html](source/CrudPage.dc.html) | 1440×1000 | `komponen → DataTable, DataToolbar, FormSheet, …` | komponen |
| Panel pengajuan izin | [png](screens/LeaveRequestPanel.png) | [dc.html](source/LeaveRequestPanel.dc.html) | 1104×1200 | `komponen Pengajuan Izin (desktop+mobile)` | 3 |
| Sidebar | [png](screens/Sidebar.png) | [dc.html](source/Sidebar.dc.html) | 256×928 | `komponen → AppSidebar` | komponen |
| Drawer menu mobile mahasiswa | [png](screens/StudentMobileNav.png) | [dc.html](source/StudentMobileNav.dc.html) | 390×844 | `komponen → drawer mobile AppLayout` | komponen |
| Panel profil mahasiswa | [png](screens/StudentProfilePanel.png) | [dc.html](source/StudentProfilePanel.dc.html) | 1104×900 | `komponen Profil mahasiswa` | 3 |
| Bilah Atas | [png](screens/Topbar.png) | [dc.html](source/Topbar.dc.html) | 1136×72 | `komponen → AppLayout header` | komponen |
