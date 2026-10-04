import { Link, usePage } from '@inertiajs/react';
import { ChevronDown, LogOut, UserRound } from 'lucide-react';

import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import type { SharedProps } from '@/types';

export function UserAvatar({ initials }: { initials: string }) {
  return (
    <span aria-hidden className="flex size-10 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-bold text-primary">
      {initials}
    </span>
  );
}

export function UserMenu() {
  const { auth } = usePage<SharedProps>().props;
  const user = auth.user;
  if (!user) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-3 rounded-full py-1 pr-2 pl-1 text-left outline-none hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40">
        <UserAvatar initials={user.initials} />
        <span className="hidden flex-col sm:flex">
          <span className="max-w-56 truncate text-sm font-bold">{user.name}</span>
          <span className="text-xs text-muted-foreground">{user.roleLabel}</span>
        </span>
        <ChevronDown className="size-4 text-muted-foreground" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>
          <span className="block truncate font-bold">{user.name}</span>
          <span className="block truncate text-xs text-muted-foreground">{user.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profil" className="w-full">
            <UserRound aria-hidden />
            Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild variant="destructive">
          <Link href="/keluar" method="post" as="button" className="w-full">
            <LogOut aria-hidden />
            Keluar
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
