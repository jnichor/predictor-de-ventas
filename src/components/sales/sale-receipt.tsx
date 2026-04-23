'use client';

import { useEffect, useRef } from 'react';
import { Printer, Store, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { money } from '@/lib/utils';

export type ReceiptData = {
  id: string;
  productName: string;
  productBarcode?: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  total: number;
  channel: string;
  soldAt: string;
  sellerName?: string;
};

type SaleReceiptProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ReceiptData | null;
};

export function SaleReceipt({ open, onOpenChange, data }: SaleReceiptProps) {
  const printRef = useRef<HTMLDivElement>(null);

  // Focus the Print button when opens — usability boost
  useEffect(() => {
    if (open) {
      // pequeño delay para que el dialog monte primero
      const t = setTimeout(() => {
        document.getElementById('print-receipt-btn')?.focus();
      }, 100);
      return () => clearTimeout(t);
    }
  }, [open]);

  function handlePrint() {
    window.print();
  }

  if (!data) return null;

  const date = new Date(data.soldAt);
  const subtotal = data.unitPrice * data.quantity;

  return (
    <>
      {/* Estilos de impresión: ocultan todo menos el ticket */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #receipt-print-area,
          #receipt-print-area * {
            visibility: visible;
          }
          #receipt-print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            color: black;
            background: white;
            font-family: "Courier New", monospace;
          }
        }
      `}</style>

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Ticket de venta</DialogTitle>
          </DialogHeader>

          <div
            id="receipt-print-area"
            ref={printRef}
            className="rounded-md border bg-white p-6 font-mono text-sm text-slate-900 dark:bg-slate-50"
          >
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto mb-2 flex size-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Store className="size-5" />
              </div>
              <h2 className="text-lg font-bold uppercase tracking-wider">Sistema de tienda</h2>
              <p className="text-xs text-slate-600">Comprobante interno</p>
            </div>

            <Separator className="my-3 bg-slate-300" />

            {/* Meta */}
            <div className="space-y-0.5 text-xs text-slate-700">
              <div className="flex justify-between">
                <span>Ticket Nº</span>
                <span className="tabular-nums">{data.id.slice(0, 8).toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>Fecha</span>
                <span className="tabular-nums">
                  {date.toLocaleString('es-PE', { dateStyle: 'short', timeStyle: 'short' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Canal</span>
                <span>{data.channel}</span>
              </div>
              {data.sellerName ? (
                <div className="flex justify-between">
                  <span>Atendido por</span>
                  <span>{data.sellerName}</span>
                </div>
              ) : null}
            </div>

            <Separator className="my-3 bg-slate-300" />

            {/* Detalle del producto */}
            <div className="space-y-1">
              <div className="font-semibold">{data.productName}</div>
              {data.productBarcode ? (
                <div className="text-xs text-slate-600">Código: {data.productBarcode}</div>
              ) : null}
              <div className="mt-2 flex justify-between text-xs">
                <span>
                  {data.quantity} x {money(data.unitPrice)}
                </span>
                <span className="tabular-nums">{money(subtotal)}</span>
              </div>
              {data.discount > 0 ? (
                <div className="flex justify-between text-xs">
                  <span>Descuento</span>
                  <span className="tabular-nums">-{money(data.discount)}</span>
                </div>
              ) : null}
            </div>

            <Separator className="my-3 bg-slate-300" />

            {/* Total */}
            <div className="flex items-baseline justify-between">
              <span className="font-bold uppercase">Total</span>
              <span className="text-xl font-bold tabular-nums">{money(data.total)}</span>
            </div>

            <Separator className="my-3 bg-slate-300" />

            <p className="text-center text-[10px] uppercase tracking-wider text-slate-500">
              ¡Gracias por su compra!
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              <X className="mr-2 size-4" />
              Cerrar
            </Button>
            <Button id="print-receipt-btn" onClick={handlePrint}>
              <Printer className="mr-2 size-4" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
