'use client';

import type { ColumnDef } from '@tanstack/react-table';
import { Ban, MoreHorizontal } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { Product, Sale } from '@/lib/types';
import { money } from '@/lib/utils';

export type SaleRow = Sale & { productName: string };

export function buildSaleRows(sales: Sale[], productById: Map<string, Product>): SaleRow[] {
  return sales.map((s) => ({
    ...s,
    productName: productById.get(s.productId)?.name ?? '—',
  }));
}

export type SalesColumnsActions = {
  isAdmin: boolean;
  onVoid: (sale: SaleRow) => void;
};

export function buildSalesColumns(actions: SalesColumnsActions): ColumnDef<SaleRow>[] {
  return [
    {
      accessorKey: 'productName',
      header: 'Producto',
      meta: { label: 'Producto' },
      cell: ({ row }) => (
        <span className={row.original.voidedAt ? 'font-medium line-through text-muted-foreground' : 'font-medium'}>
          {row.original.productName}
        </span>
      ),
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
        <div className={`text-right font-medium tabular-nums ${row.original.voidedAt ? 'line-through text-muted-foreground' : ''}`}>
          {money(row.original.total)}
        </div>
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
      id: 'status',
      header: 'Estado',
      meta: { label: 'Estado' },
      enableSorting: false,
      cell: ({ row }) =>
        row.original.voidedAt ? (
          <Badge variant="destructive">Anulada</Badge>
        ) : (
          <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Válida</Badge>
        ),
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
    {
      id: 'actions',
      header: () => <span className="sr-only">Acciones</span>,
      meta: { label: 'Acciones' },
      enableSorting: false,
      enableHiding: false,
      cell: ({ row }) => {
        const sale = row.original;
        const canVoid = actions.isAdmin && !sale.voidedAt;
        return (
          <div className="text-right">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8">
                  <MoreHorizontal className="size-4" />
                  <span className="sr-only">Abrir menú</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canVoid ? (
                  <DropdownMenuItem
                    onClick={() => actions.onVoid(sale)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Ban className="mr-2 size-4" /> Anular venta
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem disabled>
                    {sale.voidedAt ? 'Ya anulada' : 'Sin acciones'}
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
