'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  Boxes,
  FileClock,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Sparkles,
  Store,
  UserPlus,
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import type { CurrentUser } from '@/hooks/use-auth';

type NavItem = {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
};

const primaryNav: NavItem[] = [
  { title: 'Panel', href: '/dashboard', icon: LayoutDashboard },
  { title: 'Ventas', href: '/ventas', icon: ReceiptText },
  { title: 'Inventario', href: '/inventario', icon: Boxes },
  { title: 'Reportes', href: '/reportes', icon: BarChart3 },
  { title: 'Predicción', href: '/prediccion', icon: Sparkles },
];

const adminNav: NavItem[] = [
  { title: 'Productos', href: '/productos', icon: Settings, adminOnly: true },
  { title: 'Usuarios', href: '/usuarios', icon: UserPlus, adminOnly: true },
  { title: 'Auditoría', href: '/auditoria', icon: FileClock, adminOnly: true },
];

export function AppSidebar({ currentUser }: { currentUser: CurrentUser | null }) {
  const pathname = usePathname();
  const isAdmin = currentUser?.role === 'admin';

  const renderItems = (items: NavItem[]) =>
    items.map((item) => {
      const isActive = pathname === item.href.split('?')[0];
      return (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton asChild isActive={isActive} tooltip={item.title}>
            <Link href={item.href}>
              <item.icon className="size-4" />
              <span>{item.title}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Store className="size-4" />
          </div>
          <div className="flex flex-col text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="font-semibold">Sistema de tienda</span>
            <span className="text-xs text-muted-foreground">Inventario + ventas</span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operaciones</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>{renderItems(primaryNav)}</SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isAdmin ? (
          <SidebarGroup>
            <SidebarGroupLabel>Administración</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>{renderItems(adminNav)}</SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : null}
      </SidebarContent>

      <SidebarFooter>
        <div className="px-2 text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
          v1.0
        </div>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
