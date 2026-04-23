'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/types';
import { money } from '@/lib/utils';

export const productsColumns: ColumnDef<Product>[] = [
  {
    accessorKey: 'name',
    header: 'Producto',
    meta: { label: 'Producto' },
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: 'barcode',
    header: 'Barcode',
    meta: { label: 'Barcode' },
    cell: ({ row }) => (
      <span className="font-mono text-xs text-muted-foreground tabular-nums">
        {row.original.barcode}
      </span>
    ),
  },
  {
    accessorKey: 'category',
    header: 'Categoría',
    meta: { label: 'Categoría' },
    cell: ({ row }) => <Badge variant="outline">{row.original.category}</Badge>,
  },
  {
    accessorKey: 'unitPrice',
    header: () => <div className="text-right">Precio</div>,
    meta: { label: 'Precio' },
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{money(row.original.unitPrice)}</div>
    ),
    sortingFn: 'basic',
  },
  {
    id: 'stock',
    accessorFn: (row) => row.currentStock,
    header: () => <div className="text-right">Stock</div>,
    meta: { label: 'Stock' },
    cell: ({ row }) => {
      const p = row.original;
      const isLow = p.currentStock <= p.minStock;
      return (
        <div className="text-right tabular-nums">
          <span className={isLow ? 'font-medium text-destructive' : ''}>{p.currentStock}</span>
          <span className="text-muted-foreground"> / {p.minStock}</span>
        </div>
      );
    },
    sortingFn: 'basic',
  },
  {
    id: 'status',
    header: 'Estado',
    meta: { label: 'Estado' },
    enableSorting: false,
    accessorFn: (row) => (row.currentStock <= row.minStock ? 'low' : 'ok'),
    cell: ({ row }) => {
      const p = row.original;
      if (p.currentStock <= p.minStock) {
        return <Badge variant="destructive">Bajo</Badge>;
      }
      return (
        <Badge className="bg-primary/15 text-primary hover:bg-primary/20">En stock</Badge>
      );
    },
  },
];
