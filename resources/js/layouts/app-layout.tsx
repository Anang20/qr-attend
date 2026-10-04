import { Head, usePage } from '@inertiajs/react';
import { CalendarRange, Menu } from 'lucide-react';
import { type ReactNode, useState } from 'react';

import { AppLogo, AppNavigation, AppSidebar } from '@/components/app/app-sidebar';
import { UserMenu } from '@/components/app/user-menu';
import { Sheet, SheetContent, SheetDescription, SheetTitle } from '@/components/ui/sheet';
import { Toaster } from '@/components/ui/sonner';
import { useFlashToast } from '@/hooks/use-flash-toast';
import type { SharedProps } from '@/types';

interface AppLayoutProps {
  title: string;
  children: ReactNode;
}

/**
 * Kerangka halaman setelah masuk: sidebar (desktop), drawer hamburger (mobile), topbar.
 */
export default function AppLayout({ title, children }: AppLayoutProps) {
  const { activePeriod, auth } = usePage<SharedProps>().props;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  useFlashToast();

  return (
    <>
      <Head title={title} />
      <div className="mx-auto flex min-h-screen max-w-[1440px] gap-4 p-4 print:block print:p-0">
        <AppSidebar />

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          {/* Pembungkus menutup celah 16px di atas header; konten yang lewat di bawahnya diburamkan. */}
          <div className="sticky top-0 z-30 -mt-4 bg-background/60 pt-4 pb-1 backdrop-blur-md print:hidden">
          <header className="flex h-[72px] shrink-0 items-center gap-3 rounded-3xl border bg-card/80 px-4 shadow-sm backdrop-blur-md sm:px-6">
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              className="rounded-full p-2 hover:bg-muted focus-visible:ring-[3px] focus-visible:ring-ring/40 focus-visible:outline-none lg:hidden"
              aria-label="Buka menu"
            >
              <Menu className="size-5" />
            </button>
            <AppLogo className="lg:hidden" />
            <div className="hidden flex-1 lg:block">
              {activePeriod && auth.user?.role !== 'student' && (
                <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-primary">
                  <CalendarRange className="size-4" aria-hidden />
                  Periode aktif: {activePeriod}
                </span>
              )}
            </div>
            <div className="ml-auto">
              <UserMenu />
            </div>
          </header>
          </div>

          <main className="flex flex-col gap-5 px-1 pb-8 sm:px-2">{children}</main>
        </div>
      </div>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetContent side="left" className="gap-8 overflow-y-auto p-5">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <SheetDescription className="sr-only">Navigasi aplikasi</SheetDescription>
          <AppLogo />
          <AppNavigation onNavigate={() => setIsMenuOpen(false)} />
        </SheetContent>
      </Sheet>

      <Toaster />
    </>
  );
}
