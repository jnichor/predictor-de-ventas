'use client';

import { LogOut, Search, User as UserIcon } from 'lucide-react';
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
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-border/60 bg-white/70 dark:bg-background/60 backdrop-blur-xl px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-6" />
      <button
        type="button"
        onClick={() => {
          const ev = new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true });
          document.dispatchEvent(ev);
        }}
        className="group flex h-10 w-full max-w-sm items-center gap-3 rounded-xl border border-border/60 bg-white/80 dark:bg-muted/40 px-3.5 text-sm text-muted-foreground shadow-sm transition-all hover:border-primary/40 hover:shadow-md md:w-72"
      >
        <Search className="size-4 shrink-0 text-primary/70 group-hover:text-primary" />
        <span className="flex-1 text-left">Buscar productos, acciones...</span>
        <kbd className="pointer-events-none hidden select-none items-center gap-1 rounded border border-border/60 bg-background px-1.5 py-0.5 font-mono text-[10px] font-medium opacity-100 sm:inline-flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>
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
