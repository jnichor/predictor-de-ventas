'use client';

import { LogOut, User as UserIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { ThemeToggle } from '@/components/theme-toggle';
import type { CurrentUser } from '@/hooks/use-auth';

export function AppTopbar({
  currentUser,
  onSignOut,
}: {
  currentUser: CurrentUser | null;
  onSignOut: () => void | Promise<void>;
}) {
  const initial = (currentUser?.name ?? currentUser?.email ?? '?').slice(0, 1).toUpperCase();
  const roleLabel =
    currentUser?.role === 'admin' ? 'Administrador' : currentUser?.role === 'worker' ? 'Worker' : '—';

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <div className="flex-1" />
      <ThemeToggle />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-2 pl-1.5 pr-3">
            <Avatar className="size-7">
              <AvatarFallback className="text-xs">{initial}</AvatarFallback>
            </Avatar>
            <span className="hidden text-sm md:inline">{currentUser?.name ?? 'Usuario'}</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col">
              <span className="text-sm font-medium">{currentUser?.name ?? 'Usuario'}</span>
              <span className="text-xs text-muted-foreground">{currentUser?.email ?? ''}</span>
              <span className="mt-1 text-xs font-medium text-primary">{roleLabel}</span>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>
            <UserIcon className="mr-2 size-4" />
            Mi perfil
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={onSignOut} className="text-destructive focus:text-destructive">
            <LogOut className="mr-2 size-4" />
            Cerrar sesión
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
