'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/app-sidebar';
import { AppTopbar } from '@/components/app-topbar';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/use-auth';

export default function AppLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, currentUser, signOut } = useAuth();

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/login');
    }
  }, [status, router]);

  async function handleSignOut() {
    await signOut();
    toast.success('Sesión cerrada.');
    router.replace('/login');
  }

  if (status === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex w-full max-w-md flex-col gap-3 p-6">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated') {
    return null;
  }

  return (
    <SidebarProvider>
      <AppSidebar currentUser={currentUser} />
      <SidebarInset>
        <AppTopbar currentUser={currentUser} onSignOut={handleSignOut} />
        <main className="flex-1 bg-background p-4 md:p-6">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  );
}
