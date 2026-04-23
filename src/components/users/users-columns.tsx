'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, PowerOff, RotateCcw, ShieldCheck, User } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export type UserRow = {
  id: string;
  name: string;
  email: string | null;
  role: string;
  active: boolean;
  createdAt: string;
};

export type UsersColumnsActions = {
  currentUserId: string;
  onChangeRole: (user: UserRow, nextRole: 'admin' | 'worker') => void;
  onToggleActive: (user: UserRow) => void;
};

export function buildUsersColumns(actions: UsersColumnsActions): ColumnDef<UserRow>[] {
  return [
    {
      accessorKey: 'name',
      header: 'Nombre',
      meta: { label: 'Nombre' },
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-muted text-xs font-medium uppercase text-muted-foreground">
            {row.original.name.slice(0, 1)}
          </span>
          <span className="font-medium">{row.original.name}</span>
          {row.original.id === actions.currentUserId ? (
            <Badge variant="outline" className="text-xs">vos</Badge>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'email',
      header: 'Email',
      meta: { label: 'Email' },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">{row.original.email ?? '—'}</span>
      ),
    },
    {
      accessorKey: 'role',
      header: 'Rol',
      meta: { label: 'Rol' },
      cell: ({ row }) =>
        row.original.role === 'admin' ? (
          <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20">
            <ShieldCheck className="size-3" /> Admin
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <User className="size-3" /> Worker
          </Badge>
        ),
    },
    {
      accessorKey: 'active',
      header: 'Estado',
      meta: { label: 'Estado' },
      cell: ({ row }) =>
        row.original.active ? (
          <Badge variant="outline">Activo</Badge>
        ) : (
          <Badge variant="destructive">Inactivo</Badge>
        ),
    },
    {
      accessorKey: 'createdAt',
      header: () => <div className="text-right">Alta</div>,
      meta: { label: 'Alta' },
      cell: ({ row }) => (
        <div className="text-right text-xs text-muted-foreground tabular-nums">
          {new Date(row.original.createdAt).toLocaleDateString('es-PE', {
            dateStyle: 'short',
          })}
        </div>
      ),
      sortingFn: 'datetime',
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Acciones</span>,
      meta: { label: 'Acciones' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const user = row.original;
        const isSelf = user.id === actions.currentUserId;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" disabled={isSelf}>
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user.role === 'worker' ? (
                  <DropdownMenuItem onClick={() => actions.onChangeRole(user, 'admin')}>
                    <ShieldCheck className="mr-2 size-4" /> Promover a Admin
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => actions.onChangeRole(user, 'worker')}>
                    <User className="mr-2 size-4" /> Pasar a Worker
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                {user.active ? (
                  <DropdownMenuItem
                    onClick={() => actions.onToggleActive(user)}
                    className="text-destructive focus:text-destructive"
                  >
                    <PowerOff className="mr-2 size-4" /> Desactivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={() => actions.onToggleActive(user)}>
                    <RotateCcw className="mr-2 size-4" /> Reactivar
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];
}
