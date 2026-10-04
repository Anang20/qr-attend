# QR Attend — Sistem Presensi Mahasiswa Berbasis QR

Universitas Pamulang · Fakultas Ilmu Komputer · Program Studi Sistem Informasi

Stack: **Laravel 13 · Inertia.js v3 · React 19 + TypeScript · shadcn/ui (Radix + Tailwind CSS v4) · MySQL**

Acuan: `docs/BRD.md` di Project "QR Attendance" (alur bisnis, aturan BR-xx, ERD).

---

## Status pengerjaan

| Tahap | Isi | Status |
|---|---|---|
| **1** | Kerangka proyek, migrasi 18 tabel (ERD), seeder data contoh, masuk/daftar/lupa sandi/verifikasi email, layout per peran, master data (Periode, Mahasiswa, Dosen + persetujuan akun, Mata Kuliah, Kelas, Ruang & Titik Presensi) | ✅ |
| **2** | Pemetaan Kelas + 16 pertemuan otomatis + salin dari periode lalu, Jadwal Akademik (read-only), dasbor & jadwal dosen, sesi QR (polling 3 detik), pindai & validasi 8 lapis, presensi manual + log, ikat perangkat + reset oleh admin | ✅ |
| **3** | Pengajuan izin/sakit + lampiran & persetujuan dosen, rekap kehadiran + kelayakan UAS (admin & dosen), daftar mahasiswa dosen, laporan presensi + ekspor Excel/PDF, riwayat & detail presensi mahasiswa, profil (kontak, sandi, perangkat, reset), pengaturan kebijakan, dasbor admin bergrafik | ✅ |
| **4** | `DataTable` dengan paginasi bawaan (server & klien) di semua tabel; grafik dasbor admin memakai Recharts (komponen chart shadcn/ui) dengan filter global (rentang 7/30/90 hari atau semester, periode, mata kuliah, kelas) dan kontrol per grafik (urutan, Top N, klik legenda) | ✅ |

Semua menu di sidebar sudah aktif.

---

## Instalasi di Laragon (Windows)

Prasyarat: Laragon dengan **PHP 8.3+**, **MySQL 8**, **Composer**, dan **Node.js 20+** (cek: `php -v`, `node -v`).

1. Ekstrak folder `qr-attend` ke `C:\Kuliah\Semester-5\` lalu buka **Terminal Laragon**:
   ```bash
   cd C:\Kuliah\Semester-5\qr-attend
   ```
2. Pasang dependensi:
   ```bash
   composer install
   npm install
   ```
3. Siapkan `.env` dan kunci aplikasi:
   ```bash
   copy .env.example .env
   php artisan key:generate
   ```
   Bawaan `.env.example` sudah cocok dengan Laragon (`DB_USERNAME=root`, sandi kosong, database `qr_attend`).
4. Buat database lalu jalankan migrasi + data contoh:
   ```bash
   mysql -u root -e "CREATE DATABASE IF NOT EXISTS qr_attend CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
   php artisan migrate --seed
   ```
5. Jalankan:
   ```bash
   npm run dev
   ```
   Buka **http://qr-attend.test** (virtual host otomatis Laragon; klik *Reload* di Laragon bila belum muncul).
   Alternatif tanpa virtual host: `php artisan serve` → http://localhost:8000.

Untuk build produksi: `npm run build`.

### Mengambil lokasi (Ruang & Titik Presensi)

Browser hanya mengizinkan **geolokasi di HTTPS atau `localhost`**. Di `http://qr-attend.test` tombol *Ambil lokasi saat ini* akan menolak. Pilihan:

- Laragon → menu **Apache → SSL → Enabled**, lalu buka **https://qr-attend.test**, atau
- pakai `php artisan serve` dan buka **http://localhost:8000**, atau
- isi latitude/longitude secara manual.

### Email

`MAIL_MAILER=log`: email verifikasi dan atur ulang kata sandi ditulis ke `storage/logs/laravel.log`. Salin tautannya dari sana saat pengembangan.

---

## Menguji presensi QR (Tahap 2)

Setelah memperbarui kode, jalankan ulang data contoh (jadwal + riwayat presensi ikut dibuat):

```bash
php artisan migrate:fresh --seed
```

### Uji cepat di satu laptop (di luar jam kuliah)

Tambahkan di `.env`, lalu jalankan ulang `php artisan serve`:

```
ATTENDANCE_ENFORCE_CLASS_HOURS=false   # sesi bisa dibuka kapan saja
ATTENDANCE_DEV_TOOLS=true              # alat uji: isi QR teks & lokasi simulasi
```

1. Browser A (mis. Chrome) → masuk sebagai dosen `0412088501` → **Presensi** → pilih pertemuan → **Mulai Presensi**. Di bawah QR muncul kotak *Alat uji* → **Salin isi QR**.
2. Browser B / jendela Incognito → masuk sebagai mahasiswa `221011450032` (perangkat langsung terikat) → **Pindai QR** → di kotak *Alat uji* pilih *Lokasi simulasi* = **Ruang 301**, tempel isi QR → **Kirim isi QR** → halaman **Presensi Berhasil**.
3. Kembali ke browser A: daftar presensi bertambah dalam ≤ 3 detik.

Coba juga variasi gagal: pilih lokasi simulasi ruang lain (→ di luar radius), kirim dua kali (→ sudah tercatat), atau masuk sebagai mahasiswa kelas lain (→ bukan kelas Anda).

> Kembalikan kedua nilai ke `true` / `false` semula sebelum dipakai sungguhan.

### Uji dengan ponsel sungguhan

Kamera dan GPS di ponsel hanya jalan lewat **HTTPS**. Cara termudah: build aset lalu buat tunnel HTTPS sementara.

```bash
npm run build
php artisan serve
# terminal lain (pasang cloudflared lebih dulu):
cloudflared tunnel --url http://localhost:8000
```

Buka alamat `https://….trycloudflare.com` dari laptop (dosen) dan ponsel (mahasiswa). Set `APP_URL` ke alamat itu selama pengujian.

### Penutupan sesi otomatis

Sesi yang lewat 20 menit otomatis menjadi *Kedaluwarsa* saat halaman dibuka. Agar tetap tertutup walau tidak ada yang membuka halaman, jalankan scheduler di terminal terpisah:

```bash
php artisan schedule:work
```

## Menguji fitur Tahap 3

Jalankan ulang data contoh lebih dulu (`php artisan migrate:fresh --seed`), lalu:

| Fitur | Masuk sebagai | Langkah |
|---|---|---|
| Pengajuan izin/sakit | Mahasiswa `221011450032` | **Pengajuan Izin** → pilih pertemuan (yang terkunci diberi alasan) → jenis **Sakit** wajib lampiran JPG/PNG/PDF ≤ 2 MB → Kirim. Pengajuan Menunggu bisa dibatalkan. |
| Persetujuan izin | Dosen `0412088501` | Menu **Persetujuan Izin** (badge = jumlah menunggu) → Lihat lampiran → **Setujui** (presensi jadi Izin) atau **Tolak** (alasan ≥ 10 karakter). |
| Rekap & kelayakan UAS | Admin atau dosen | **Rekap Kehadiran** → pilih periode → mata kuliah → kelas. Ekspor **Excel** atau **PDF** (dialog cetak → *Simpan sebagai PDF*). |
| Laporan presensi | Admin | **Laporan Presensi** → atur filter → **Terapkan** → Ekspor Excel/PDF. |
| Riwayat & detail | Mahasiswa | **Riwayat Presensi** → filter mata kuliah/status → **Detail** (linimasa). Beranda menampilkan rekap per mata kuliah. |
| Profil & reset perangkat | Mahasiswa → Admin | Mahasiswa: **Profil** → *Ajukan reset perangkat*. Admin: **Dasbor** → kartu *Permintaan reset perangkat* → Setujui/Tolak. |
| Pengaturan | Admin (ubah) / dosen (lihat) | **Pengaturan** → ubah *Tandai Terlambat setelah*, *Izinkan presensi manual*, atau *Ringkasan email* → **Simpan perubahan**. Item berlabel *Kebijakan kampus* terkunci. |

Lampiran izin disimpan di disk privat (`storage/app/private/leave-attachments`) dan hanya bisa dibuka lewat `/lampiran-izin/{id}` oleh admin, mahasiswa pemilik, atau dosen pengampu — tidak perlu `php artisan storage:link`.

> Grafik bulanan dasbor admin memakai `DATE_FORMAT` (khusus MySQL/MariaDB).

---

## Akun contoh

Semua kata sandi: **`Password123`**

| Peran | Masuk dengan | Nama |
|---|---|---|
| Admin | `admin@unpam.ac.id` | Niken |
| Dosen | `0412088501` atau `gusmayeni@unpam.ac.id` | Gusmayeni, S.Kom., M.Kom |
| Mahasiswa | `221011450032` atau `ray.0032@student.unpam.ac.id` | Ray Pengki (SI-5A) |
| Dosen (menunggu persetujuan) | `0411129007` | Hendra Wijaya — untuk mencoba alur persetujuan |
| Mahasiswa SI-5B (kelas lain) | NIM di halaman Admin → Mahasiswa, filter kelas SI-5B | untuk mencoba "Bukan kelas Anda" |

Akun yang **dibuat admin** dari halaman Mahasiswa/Dosen memakai kata sandi awal = NIM / NIDN.

---

## Struktur penting

```
app/
├── Enums/                    # Status & jenis (PHP backed enum + label Indonesia)
├── Http/
│   ├── Controllers/Admin/    # Master data + dasbor admin
│   ├── Controllers/Auth/     # Masuk, daftar, verifikasi, atur ulang sandi
│   ├── Middleware/           # EnsureRole (role:admin), HandleInertiaRequests
│   └── Requests/             # Validasi + aturan bisnis (BR-xx)
├── Models/                   # 18 model sesuai ERD
├── Services/Geo.php          # Haversine (jarak meter)
├── Services/Settings.php     # Kebijakan presensi dari tabel settings (+cache)
└── Support/Options.php       # Opsi dropdown bersama
database/migrations/          # 18 tabel ERD + tabel bawaan Laravel
database/seeders/             # Data contoh Universitas Pamulang
resources/js/
├── components/ui/            # Komponen shadcn/ui
├── components/app/           # Komponen aplikasi (sidebar, toolbar, form sheet, dst.)
├── hooks/                    # useFilters, useResourceForm, useLocationCapture, useFlashToast
├── layouts/                  # AppLayout (per peran), AuthLayout
└── pages/                    # Halaman Inertia (auth, admin, lecturer, student)
```

### Alur data halaman CRUD

```
Controller@index (filter query string, paginate 10)
   ↓ props Inertia
Halaman React → useFilters (debounce 350 ms) → router.get
   ↓
useResourceForm → FormSheet (useForm) → POST/PUT/DELETE
   ↓
FormRequest (validasi + aturan BR) → Controller → redirect back + flash
   ↓
useFlashToast → toast sukses/galat/peringatan
```

---

## Aturan bisnis yang sudah ditegakkan di Tahap 1

| Kode | Aturan | Tempat |
|---|---|---|
| BR-17 | Hanya satu periode Aktif; mengaktifkan periode baru menyelesaikan yang lama | `AcademicPeriodController::save` |
| BR-18 | Tahun ajaran + semester unik; rentang tanggal tidak tumpang tindih | `AcademicPeriodRequest` |
| BR-22 | Ruang dipakai pemetaan aktif tidak bisa dinonaktifkan/dihapus | `RoomController` |
| BR-23 | Titik maks. 500 m dari pusat kampus; lat & lng diisi berpasangan | `RoomRequest` |
| BR-24 | Data master yang sudah dipakai tidak bisa dihapus | `destroy()` tiap controller |
| BR-25 | Admin dari seeder; dosen daftar → menunggu persetujuan | `RegisterController`, `LecturerController::approve` |
| BR-26 | Sandi min. 8, huruf besar, kecil, angka | `AppServiceProvider` (`Password::defaults`) |
| BR-27 | Tautan atur ulang sandi berlaku 30 menit | `config/auth.php` |

## Aturan bisnis yang ditegakkan di Tahap 2

| Kode | Aturan | Tempat |
|---|---|---|
| BR-01 | QR sekali per sesi, berlaku 20 menit, tidak bisa diperbarui | `AttendanceSessions::open` |
| BR-02 | Sesi hanya dibuka & dipindai pada jam kuliah, periode Aktif | `AttendanceSessions::cannotOpenReason`, `ScanValidator` |
| BR-03 | Ruang wajib punya titik presensi | `AttendanceSessions::cannotOpenReason` |
| BR-04–06 | Kelas & jadwal sendiri, sekali per sesi, akurasi ≤ 25 m, jarak ≤ radius ruang | `ScanValidator` (8 pemeriksaan berurutan) |
| BR-07 | Presensi hanya dari perangkat terikat; reset oleh admin | `DeviceBinding`, Admin → Mahasiswa |
| BR-08 | Pindai setelah 15 menit sejak dibuka = Terlambat | `ScanValidator` |
| BR-09 | Sesi berakhir → yang belum presensi = Tidak Hadir | `AttendanceSessions::markAbsentees` |
| BR-10–11 | Metode tercatat; presensi manual dikonfirmasi & masuk log | `ManualAttendanceController`, `attendance_logs` |
| BR-19–21 | Jadwal dari Pemetaan Kelas; bentrok kelas/dosen/ruang; periode Selesai read-only | `ClassScheduleRequest`, `ScheduleConflicts` |

Token QR tidak disimpan mentah: dihitung ulang dengan HMAC (id sesi + waktu dibuka + `APP_KEY`), dan isi QR berformat `QRATTEND:{id}:{token}`. Semua pindaian (berhasil maupun gagal) tercatat di `scan_logs`.

## Aturan bisnis yang ditegakkan di Tahap 3

| Kode | Aturan | Tempat |
|---|---|---|
| BR-12 | Pengajuan hanya untuk pertemuan dalam jendela H-7 s.d. H+2 | `LeaveRequests::lockReason`, `LeaveRequestStoreRequest` |
| BR-13 | Sakit wajib lampiran; JPG/PNG/PDF ≤ 2 MB | `LeaveRequestStoreRequest` |
| BR-14 | Satu pengajuan aktif per pertemuan; yang sudah Hadir/Terlambat terkunci | `LeaveRequests::validateSessions`, kolom unik `leave_requests.active_key` |
| BR-15 | Diputuskan dosen pengampu; tolak wajib alasan ≥ 10 karakter; setuju → Izin + log | `LeaveApprovalController`, `LeaveRequests::approve` |
| BR-16 | Kelayakan UAS ≥ 75% dari 16 pertemuan (maks. 4 Tidak Hadir) | `AttendanceRecap` |
| BR-28 | Email terkunci; No. HP 08…, 10–13 digit | `ProfileController::updateContact` |
