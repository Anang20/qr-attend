import { Badge, type BadgeVariant } from '@/components/ui/badge';

/** Status kelayakan UAS dari App\Services\AttendanceRecap. */
export type RecapStatus = 'safe' | 'warning' | 'ineligible' | 'eligible';

export const recapStatusInfo: Record<RecapStatus, { label: string; variant: BadgeVariant }> = {
  ineligible: { label: 'Tidak memenuhi', variant: 'danger' },
  warning: { label: 'Waspada', variant: 'warning' },
  safe: { label: 'Aman', variant: 'success' },
  eligible: { label: 'Memenuhi', variant: 'success' },
};

export function RecapStatusBadge({ status }: { status: RecapStatus }) {
  const info = recapStatusInfo[status];
  return <Badge variant={info.variant}>{info.label}</Badge>;
}
