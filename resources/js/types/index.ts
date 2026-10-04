export type UserRole = 'admin' | 'lecturer' | 'student';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  roleLabel: string;
  initials: string;
}

export interface Flash {
  success: string | null;
  error: string | null;
  warning: string | null;
}

/** Props yang dibagikan server ke semua halaman (HandleInertiaRequests). */
export interface SharedProps {
  appName: string;
  auth: { user: AuthUser | null };
  activePeriod: string | null;
  badges: Record<string, number>;
  flash: Flash;
  [key: string]: unknown;
}

export interface Option {
  value: string;
  label: string;
}

export interface PaginationLink {
  url: string | null;
  label: string;
  active: boolean;
}

/** Bentuk JSON LengthAwarePaginator Laravel. */
export interface Paginated<T> {
  data: T[];
  current_page: number;
  last_page: number;
  per_page: number;
  from: number | null;
  to: number | null;
  total: number;
  links: PaginationLink[];
}

export type Filters = Record<string, string | undefined>;

/** Ringkasan satu pertemuan (App\Support\SessionPresenter). */
export interface SessionSummary {
  id: number;
  meetingNo: number;
  date: string;
  day: string;
  startTime: string;
  endTime: string;
  course: string;
  courseCode: string;
  classGroup: string;
  room: string;
  lecturer: string;
  status: 'scheduled' | 'open' | 'expired' | 'closed' | 'missed';
}
