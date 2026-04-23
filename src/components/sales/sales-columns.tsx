'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Product, Sale } from '@/lib/types';
import { money } from '@/lib/utils';

export type SaleRow = Sale & { productName: string };

export function buildSaleRows(sales: Sale[], productById: Map<string, Product>): SaleRow[] {
  return sales.map((s) => ({
    ...s,
    productName: productById.get(s.productId)?.name ?? '—',
  }));
}

export const salesColumns: ColumnDef<SaleRow>[] = [
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
    accessorKey: 'unitPrice',
    header: () => <div className="text-right">Unitario</div>,
    meta: { label: 'Unitario' },
    cell: ({ row }) => (
      <div className="text-right tabular-nums text-muted-foreground">
        {money(row.original.unitPrice)}
      </div>
    ),
    sortingFn: 'basic',
  },
  {
    accessorKey: 'discount',
    header: () => <div className="text-right">Descuento</div>,
    meta: { label: 'Descuento' },
    cell: ({ row }) => (
      <div className="text-right tabular-nums text-muted-foreground">
        {row.original.discount > 0 ? money(row.original.discount) : '—'}
      </div>
    ),
    sortingFn: 'basic',
  },
  {
    accessorKey: 'total',
    header: () => <div className="text-right">Total</div>,
    meta: { label: 'Total' },
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">{money(row.original.total)}</div>
    ),
    sortingFn: 'basic',
  },
  {
    accessorKey: 'channel',
    header: 'Canal',
    meta: { label: 'Canal' },
    cell: ({ row }) => <Badge variant="secondary">{row.original.channel}</Badge>,
  },
  {
    accessorKey: 'soldAt',
    header: () => <div className="text-right">Fecha</div>,
    meta: { label: 'Fecha' },
    cell: ({ row }) => (
      <div className="text-right text-xs text-muted-foreground tabular-nums">
        {new Date(row.original.soldAt).toLocaleString('es-PE', {
          dateStyle: 'short',
          timeStyle: 'short',
        })}
      </div>
    ),
    sortingFn: 'datetime',
  },
];
