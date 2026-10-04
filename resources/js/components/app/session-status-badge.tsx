import { Badge, type BadgeVariant } from '@/components/ui/badge';

const map: Record<string, { label: string; variant: BadgeVariant }> = {
  scheduled: { label: 'Belum dimulai', variant: 'muted' },
  open: { label: 'Sesi berlangsung', variant: 'success' },
  expired: { label: 'Kedaluwarsa', variant: 'warning' },
  closed: { label: 'Selesai', variant: 'info' },
  missed: { label: 'Terlewat', variant: 'danger' },
};

export function SessionStatusBadge({ status }: { status: string }) {
  const item = map[status] ?? { label: status, variant: 'muted' as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}

const attendanceMap: Record<string, { label: string; variant: BadgeVariant }> = {
  present: { label: 'Hadir', variant: 'success' },
  late: { label: 'Terlambat', variant: 'warning' },
  excused: { label: 'Izin', variant: 'info' },
  absent: { label: 'Tidak Hadir', variant: 'danger' },
};

export function AttendanceBadge({ status }: { status: string | null }) {
  if (!status) return <Badge variant="muted">Belum</Badge>;
  const item = attendanceMap[status] ?? { label: status, variant: 'muted' as const };
  return <Badge variant={item.variant}>{item.label}</Badge>;
}
