# CLAUDE.md — QR Attend

Konteks proyek untuk Claude Code. Dibaca otomatis setiap sesi baru di folder ini.

## Proyek

Aplikasi presensi mahasiswa berbasis pindai QR + validasi lokasi untuk **Universitas Pamulang** (Fakultas Ilmu Komputer, Prodi Sistem Informasi). Seluruh UI berbahasa **Indonesia**.

- Spesifikasi lengkap (alur, aturan BR-xx, ERD, kamus data): **`docs/BRD.md`** — baca bagian yang relevan sebelum mengubah logika bisnis.
- Panduan instalasi & pengujian: `README.md`.
- **Desain mockup** (sumber kebenaran tampilan): `docs/design/README.md` → indeks 51 layar dengan PNG (`docs/design/screens/`) dan sumbernya (`docs/design/source/*.dc.html`, berisi teks, data contoh, dan aturan interaksi di `renderVals()`). Sebelum membangun atau mengubah halaman, **buka PNG layar terkait dan baca `.dc.html`-nya**, lalu wujudkan dengan komponen proyek (shadcn/ui + `components/app`), bukan menyalin HTML inline-style.

## Stack & lingkungan

- Laravel 13 (PHP 8.3+), Inertia.js v3 (`inertiajs/inertia-laravel` ^3), React 19 + TypeScript strict, Tailwind CSS v4, komponen shadcn/ui ditulis manual di `resources/js/components/ui` (Radix via paket `radix-ui`), ikon `lucide-react`, toast `sonner`.
- MySQL (Laragon, Windows). Jalankan: `npm run dev` + `php artisan serve` → http://localhost:8000.
- Real-time memakai **polling Inertia (`usePoll`, 3 detik)**, bukan WebSocket — keputusan sadar agar mudah dijalankan di Laragon.
- QR: `qrcode.react` (tampil), `@yudiel/react-qr-scanner` (pindai; WASM zxing di-host sendiri via `?url`).
- Data contoh: `php artisan migrate:fresh --seed`. Semua akun contoh sandi `Password123` (admin `admin@unpam.ac.id`, dosen `0412088501`, mahasiswa `221011450032`).

## Status tahap

| Tahap | Isi | Status |
|---|---|---|
| 1 | Kerangka, migrasi 18 tabel ERD, seeder, auth (masuk/daftar, email bebas tanpa verifikasi — mahasiswa & dosen menunggu persetujuan admin sebelum aktif), master data admin (Periode, Mahasiswa + persetujuan, Dosen + persetujuan, Mata Kuliah, Kelas, Ruang & Titik) | ✅ |
| 2 | Pemetaan Kelas (+16 pertemuan otomatis, salin periode lalu), Jadwal Akademik read-only, dasbor/jadwal/sesi dosen, QR 20 menit, pindai + validasi 8 lapis, presensi manual + log, ikat perangkat + reset admin | ✅ |
| 3 | Pengajuan izin/sakit + persetujuan dosen, rekap kehadiran + kelayakan UAS (admin & dosen), laporan presensi + ekspor Excel/PDF, riwayat & detail presensi mahasiswa, profil (semua peran), Pengaturan kebijakan, dasbor admin bergrafik | ✅ |
| 4 | Paginasi bawaan di `DataTable` (server & klien) untuk semua tabel; grafik dasbor pakai Recharts (komponen chart shadcn) + filter global (rentang, periode, mata kuliah, kelas) & kontrol per grafik | ✅ |

Semua menu di `resources/js/components/app/navigation.ts` sudah punya `href`. Menu baru tanpa `href` tampil "Segera".

## Arsitektur & konvensi

**Backend**
- Enum PHP di `app/Enums` (nilai string Inggris, `label()` Indonesia, trait `HasOptions::options()` untuk dropdown).
- Validasi + aturan bisnis di `FormRequest` (`app/Http/Requests`), termasuk `after()` untuk aturan lintas kolom. Controller tipis.
- Logika domain di `app/Services`: `AttendanceSessions` (buka/kedaluwarsa/selesai, token HMAC), `ScanValidator` (8 pemeriksaan berurutan, urutan = checklist UI), `ScheduleSessions` (generate 16 pertemuan), `ScheduleConflicts` (BR-20), `DeviceBinding` (cookie `qra_device`), `Geo` (Haversine), `Settings` (tabel `settings` + cache).
- Kebijakan presensi dibaca lewat `Settings::int('key')`, cadangan di `config/attendance.php`.
- Nama tabel kelas `class_groups` (bukan `classes`, karena `Class` kata kunci PHP). Pemetaan = `class_schedules`.
- Data master yang sudah dipakai tidak dihapus (BR-24) → tampilkan flash `error`, sarankan Nonaktif.
- Respons: `redirect back()->with('success'|'error'|'warning', '…')`; frontend menampilkannya lewat `useFlashToast`.
- Paginasi: `->paginate(10)->withQueryString()->through(fn …)`; bentuk TS `Paginated<T>`.
- Dropdown: value selalu **string** (`Support\Options`).
- URL berbahasa Indonesia (`/admin/mahasiswa`, `/dosen/presensi/{session}`, `/mahasiswa/pindai`). Middleware peran: `role:admin|lecturer|student`.
- Waktu memakai jam server, zona `Asia/Jakarta`.

**Frontend**
- Halaman di `resources/js/pages/{auth,admin,lecturer,student,shared}/…` (`shared` = dipakai lintas peran: profil, pengaturan, rekap), nama komponen Inertia = path tanpa `.tsx`.
- Layout: `AppLayout` (sidebar per peran, drawer mobile), `AuthLayout`.
- Pola CRUD: `useFilters` (query string, debounce 350 ms) + `useResourceForm` + `FormSheet` + `ConfirmDialog` + `DataToolbar` + `DataTable` (paginasi sudah di dalamnya).
- Tabel: selalu pakai `DataTable<T>` (`components/app/data-table.tsx`) dengan `DataTableColumn<T>[]` (key, header, cell, align, isHeaderHidden untuk kolom aksi, className statis atau fungsi per baris). Kolom kondisional ditambahkan lewat spread `...(cond ? [col] : [])`.
- Semua tabel halaman penuh memakai **paginasi server**. Baris hasil hitungan PHP (rekap, laporan, live sesi) dipaginasi lewat `App\Support\Paginate::collection()`; pencarian/saringan lewat `useFilters(url, initial, fixed)`; ekspor Excel/PDF memuat seluruh baris via prop opsional `exportRows` (`useLoadAll`). Tombol halaman ringkas dengan "…" (`pageItems`). Tabel kecil di dasbor tidak dipaginasi.
- Paginasi **jangan** dipanggil terpisah. `rows={paginator}` (objek `Paginated<T>` dari Laravel) → paginasi server otomatis; `rows={array} pageSize={10} itemLabel="mahasiswa"` → paginasi klien (kembali ke hal. 1 saat `rows` berganti; semua baris tetap tercetak). `renderCard={(row) => …}` → tampilan kartu di < md (halaman mahasiswa). `Pagination`/`SimplePager` hanya dipakai internal oleh DataTable.
- Field form: `FormField` + `fieldA11y(id, error)`; Select: `SelectField` (filter pakai `allLabel`, nilai "semua" = `ALL`).
- Tipe bersama di `resources/js/types/index.ts` (`SharedProps`, `Option`, `Paginated`, `SessionSummary`).
- Ekspor: Excel dibuat di browser dengan `exceljs` (dimuat dinamis lewat `downloadXlsx` di `lib/export.ts`); PDF = `printAsPdf()` (dialog cetak browser). Elemen yang tidak ikut cetak diberi `print:hidden`.
- Status kelayakan UAS: `RecapStatusBadge` / `recapStatusInfo` (`components/app/recap-status-badge.tsx`); kartu rekap mahasiswa: `CourseRecapList`.
- Grafik: Recharts lewat komponen shadcn `components/ui/chart.tsx` (`ChartContainer` + `ChartConfig` → CSS var `--color-<kunci>`, `ChartTooltipContent`, `ChartLegendContent` dengan toggle seri). Grafik dasbor di `components/dashboard/charts.tsx`; filter global `ChartFilterBar` (partial reload `only: ['attendance','chartFilters','chartOptions']`) dibaca server lewat `App\Support\DashboardFilter` → `DashboardStats`. Kontrol di dalam kartu (urutan/Top N/sembunyikan seri) hanya mengubah tampilan, tidak request ulang. Warna status: hadir #047857, terlambat #f59e0b, tidak hadir #dc2626, izin #2563eb (lolos cek CVD; kuning wajib disertai label/tooltip).
- Desktop untuk admin & dosen; halaman mahasiswa harus nyaman di ponsel (390 px).
- Jangan memakai localStorage/sessionStorage.

**Verifikasi sebelum selesai**
- `php -l` untuk file PHP yang diubah, `npx tsc --noEmit`, `npm run build`.
- Tidak ada framework test — jangan menambah test.

## Preferensi pemilik proyek (Anang)

- Jawab dalam **Bahasa Indonesia**, jelaskan *mengapa*, struktur: Konteks → Prinsip → Root Cause (bila debugging) → Solusi → Implementasi.
- Ubah **hanya** yang diminta; jangan refactor bagian lain, jangan breaking change, jaga alur modul.
- Kode sederhana, modern, type-safe (tanpa `any`), production ready.
- Akhiri setiap jawaban dengan blok **QC Result** (✅ Passed / ⚠️ Notes).
- Jangan memberi instruksi git (commit/push ditangani sendiri).

## Catatan penting

- `.env` uji coba: `ATTENDANCE_ENFORCE_CLASS_HOURS=false` (buka sesi kapan saja) dan `ATTENDANCE_DEV_TOOLS=true` (isi QR teks + lokasi simulasi, hanya bila `APP_DEBUG=true`). Harus dikembalikan sebelum produksi.
- Kamera & GPS hanya jalan di HTTPS atau `localhost`.
- Sesi kedaluwarsa ditandai saat halaman diakses dan oleh `php artisan schedule:work` (command `attendance:expire-sessions`).
