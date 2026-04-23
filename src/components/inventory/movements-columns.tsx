'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { ArrowDownRight, ArrowUpRight, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { InventoryMovement, Product } from '@/lib/types';

export type MovementRow = InventoryMovement & { productName: string };

export function buildMovementRows(
  movements: InventoryMovement[],
  productById: Map<string, Product>,
): MovementRow[] {
  return movements.map((m) => ({
    ...m,
    productName: productById.get(m.productId)?.name ?? '—',
  }));
}

function MovementTypeBadge({ type }: { type: InventoryMovement['type'] }) {
  if (type === 'entry') {
    return (
      <Badge className="gap-1 bg-primary/15 text-primary hover:bg-primary/20">
        <ArrowUpRight className="size-3" /> Entrada
      </Badge>
    );
  }
  if (type === 'exit') {
    return (
      <Badge variant="secondary" className="gap-1">
        <ArrowDownRight className="size-3" /> Salida
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="gap-1">
      <Wrench className="size-3" /> Ajuste
    </Badge>
  );
}

export const movementsColumns: ColumnDef<MovementRow>[] = [
  {
    accessorKey: 'type',
    header: 'Tipo',
    meta: { label: 'Tipo' },
    cell: ({ row }) => <MovementTypeBadge type={row.original.type} />,
  },
  {
    accessorKey: 'productName',
    header: 'Producto',
    meta: { label: 'Producto' },
    cell: ({ row }) => <span className="font-medium">{row.original.productName}</span>,
  },
  {
    accessorKey: 'quantity',
    header: () => <div className="text-right">Cantidad</div>,
    meta: { label: 'Cantidad' },
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{row.original.quantity}</div>
    ),
    sortingFn: 'basic',
  },
  {
    accessorKey: 'reason',
    header: 'Motivo',
    meta: { label: 'Motivo' },
    cell: ({ row }) => (
      <span className="block max-w-[280px] truncate text-sm text-muted-foreground">
        {row.original.reason || '—'}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: () => <div className="text-right">Fecha</div>,
    meta: { label: 'Fecha' },
    cell: ({ row }) => (
      <div className="text-right text-xs text-muted-foreground tabular-nums">
        {new Date(row.original.createdAt).toLocaleString('es-PE', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </div>
    ),
    sortingFn: 'datetime',
  },
];
