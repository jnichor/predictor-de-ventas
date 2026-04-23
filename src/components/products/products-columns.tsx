'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Pencil, PowerOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Product } from '@/lib/types';
import { money } from '@/lib/utils';

export type ProductsColumnsActions = {
  onEdit: (product: Product) => void;
  onDeactivate: (product: Product) => void;
};

export function buildProductsColumns(actions: ProductsColumnsActions): ColumnDef<Product>[] {
  return [
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
      accessorFn: (row) => (!row.active ? 'off' : row.currentStock <= row.minStock ? 'low' : 'ok'),
      cell: ({ row }) => {
        const p = row.original;
        if (!p.active) {
          return <Badge variant="outline" className="text-muted-foreground">Inactivo</Badge>;
        }
        if (p.currentStock <= p.minStock) {
          return <Badge variant="destructive">Bajo</Badge>;
        }
        return (
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">En stock</Badge>
        );
      },
    },
    {
      id: 'actions',
      header: () => <span className="sr-only">Acciones</span>,
      meta: { label: 'Acciones' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => (
        <div className="text-right">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-8">
                <MoreHorizontal className="size-4" />
                <span className="sr-only">Abrir menú</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => actions.onEdit(row.original)}>
                <Pencil className="mr-2 size-4" /> Editar
              </DropdownMenuItem>
              {row.original.active ? (
                <DropdownMenuItem
                  onClick={() => actions.onDeactivate(row.original)}
                  className="text-destructive focus:text-destructive"
                >
                  <PowerOff className="mr-2 size-4" /> Desactivar
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];
}
