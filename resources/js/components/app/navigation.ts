import {
  BarChart3,
  BookOpen,
  CalendarCheck2,
  CalendarDays,
  CalendarRange,
  ClipboardCheck,
  ClipboardList,
  FileText,
  GraduationCap,
  History,
  LayoutDashboard,
  type LucideIcon,
  MapPin,
  QrCode,
  ScanLine,
  Settings,
  Users,
  UserRound,
  UsersRound,
  Waypoints,
} from 'lucide-react';

import type { UserRole } from '@/types';

export interface NavItem {
  label: string;
  icon: LucideIcon;
  /** Kosong = fitur tahap berikutnya (ditampilkan nonaktif, bukan tautan mati). */
  href?: string;
  exact?: boolean;
  /** Kunci angka di props `badges` (mis. jumlah izin menunggu). */
  badgeKey?: string;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const navigation: Record<UserRole, NavGroup[]> = {
  admin: [
    {
      label: 'Utama',
      items: [
        { label: 'Dasbor', icon: LayoutDashboard, href: '/admin', exact: true, badgeKey: 'dashboard' },
        { label: 'Laporan Presensi', icon: FileText, href: '/admin/laporan-presensi' },
        { label: 'Rekap Kehadiran', icon: BarChart3, href: '/admin/rekap-kehadiran' },
      ],
    },
    {
      label: 'Manajemen',
      items: [
        { label: 'Periode Akademik', icon: CalendarRange, href: '/admin/periode-akademik' },
        { label: 'Mahasiswa', icon: GraduationCap, href: '/admin/mahasiswa' },
        { label: 'Dosen', icon: Users, href: '/admin/dosen' },
        { label: 'Mata Kuliah', icon: BookOpen, href: '/admin/mata-kuliah' },
        { label: 'Kelas', icon: UsersRound, href: '/admin/kelas' },
        { label: 'Ruang & Titik', icon: MapPin, href: '/admin/ruang' },
        { label: 'Pemetaan Kelas', icon: Waypoints, href: '/admin/pemetaan-kelas' },
        { label: 'Jadwal Akademik', icon: CalendarDays, href: '/admin/jadwal-akademik' },
      ],
    },
    { label: 'Sistem', items: [{ label: 'Pengaturan', icon: Settings, href: '/pengaturan' }] },
  ],
  lecturer: [
    {
      label: 'Utama',
      items: [
        { label: 'Dasbor', icon: LayoutDashboard, href: '/dosen', exact: true },
        { label: 'Presensi', icon: QrCode, href: '/dosen/presensi' },
        { label: 'Jadwal', icon: CalendarDays, href: '/dosen/jadwal' },
        { label: 'Mahasiswa', icon: GraduationCap, href: '/dosen/mahasiswa' },
        { label: 'Riwayat & Laporan', icon: History, href: '/dosen/presensi?when=past' },
        { label: 'Rekap Kehadiran', icon: BarChart3, href: '/dosen/rekap-kehadiran' },
        { label: 'Persetujuan Izin', icon: ClipboardCheck, href: '/dosen/persetujuan-izin', badgeKey: 'leave' },
      ],
    },
    { label: 'Sistem', items: [{ label: 'Pengaturan', icon: Settings, href: '/pengaturan' }] },
  ],
  student: [
    {
      label: 'Utama',
      items: [
        { label: 'Beranda', icon: LayoutDashboard, href: '/mahasiswa', exact: true },
        { label: 'Kelas Hari Ini', icon: CalendarCheck2, href: '/mahasiswa/kelas-hari-ini' },
        { label: 'Pindai QR', icon: ScanLine, href: '/mahasiswa/pindai' },
        { label: 'Riwayat Presensi', icon: History, href: '/mahasiswa/riwayat' },
        { label: 'Pengajuan Izin', icon: ClipboardList, href: '/mahasiswa/pengajuan-izin' },
      ],
    },
    { label: 'Akun', items: [{ label: 'Profil', icon: UserRound, href: '/profil' }] },
  ],
};
