'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { HelpCircle, History, ReceiptText, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DateRangePicker, type DateRangeValue } from '@/components/ui/date-range-picker';
import { FacetedFilter } from '@/components/ui/faceted-filter';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { SaleForm } from '@/components/sales/sale-form';
import { buildSaleRows, buildSalesColumns, type SaleRow } from '@/components/sales/sales-columns';
import { useAuth } from '@/hooks/use-auth';
import { useRealtimeTable } from '@/hooks/use-realtime-table';
import type { Product, Sale } from '@/lib/types';

export default function VentasPage() {
  const { session, currentUser } = useAuth();
  const accessToken = session?.access_token ?? null;
  const isAdmin = currentUser?.role === 'admin';
  const [barcode, setBarcode] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [voidTarget, setVoidTarget] = useState<SaleRow | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [isVoiding, setIsVoiding] = useState(false);
  const [dateRange, setDateRange] = useState<DateRangeValue>(undefined);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [salesRes, productsRes] = await Promise.all([
        fetch('/api/sales', { headers: { Authorization: `Bearer ${accessToken}` } }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      if (salesRes.ok) {
        const data = await salesRes.json();
        setSales(Array.isArray(data.sales) ? data.sales : []);
      }
      if (productsRes.ok) {
        const data = await productsRes.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (error) {
      console.error('ventas loadData', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Realtime: recarga la tabla cuando otro dispositivo registra una venta
  useRealtimeTable({ table: 'sales', onChange: loadData });

  const productByBarcode = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.barcode, p);
    return map;
  }, [products]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const allSaleRows = useMemo(() => buildSaleRows(sales, productById), [sales, productById]);

  // Filtrado por fecha + canal + estado
  const saleRows = useMemo(() => {
    return allSaleRows.filter((sale) => {
      if (dateRange?.from) {
        const saleDate = new Date(sale.soldAt);
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        if (saleDate < from) return false;
        if (dateRange.to) {
          const to = new Date(dateRange.to);
          to.setHours(23, 59, 59, 999);
          if (saleDate > to) return false;
        }
      }
      if (selectedChannels.length > 0 && !selectedChannels.includes(sale.channel)) {
        return false;
      }
      if (selectedStatus.length > 0) {
        const status = sale.voidedAt ? 'voided' : 'valid';
        if (!selectedStatus.includes(status)) return false;
      }
      return true;
    });
  }, [allSaleRows, dateRange, selectedChannels, selectedStatus]);

  const channelOptions = useMemo(() => {
    const set = new Set<string>();
    for (const s of allSaleRows) set.add(s.channel);
    return Array.from(set).map((c) => ({ label: c, value: c }));
  }, [allSaleRows]);

  const salesColumns = useMemo(
    () =>
      buildSalesColumns({
        isAdmin,
        onVoid: (sale) => {
          setVoidTarget(sale);
          setVoidReason('');
        },
      }),
    [isAdmin],
  );

  async function confirmVoid() {
    if (!voidTarget || !accessToken) return;
    setIsVoiding(true);
    try {
      const response = await fetch(`/api/sales/${voidTarget.id}/void`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ reason: voidReason.trim() || undefined }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo anular la venta.');
        return;
      }
      toast.success('Venta anulada. Stock devuelto al inventario.');
      setVoidTarget(null);
      await loadData();
    } catch (error) {
      console.error('void sale', error);
      toast.error('Error de conexión al anular.');
    } finally {
      setIsVoiding(false);
    }
  }

  if (!accessToken) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Operaciones
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Registrar venta</h1>
        <p className="text-sm text-muted-foreground">
          Escaneá un código o ingresalo a mano. El stock se descuenta automáticamente.
        </p>
      </div>

      <Card>
        <Accordion type="single" collapsible>
          <AccordionItem value="help" className="border-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <HelpCircle className="size-4 text-primary" />
                <span className="font-medium">¿Cómo registrar una venta?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4 text-sm leading-relaxed">
                <p>
                  Una <strong>venta</strong> descuenta stock automáticamente del producto.
                  El sistema valida que haya stock suficiente antes de registrarla.
                </p>

                <div>
                  <p className="mb-2 font-medium">Pasos:</p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
                    <li>
                      Clickeá el campo <strong className="text-foreground">Código del producto</strong>{' '}
                      y buscá por nombre o barcode, o usá el{' '}
                      <strong className="text-foreground">escáner de cámara</strong> de la izquierda.
                    </li>
                    <li>
                      Si el código ya existe → el{' '}
                      <strong className="text-foreground">nombre se autocompleta</strong> con
                      precio y stock disponible.
                    </li>
                    <li>
                      Si el código NO existe → podés escribir el nombre manualmente. El producto
                      queda <strong className="text-foreground">creado al vuelo</strong> con stock
                      0, pero la venta no se concreta porque no hay stock.
                    </li>
                    <li>
                      Completá cantidad, descuento (opcional), canal (Mostrador / Delivery /
                      Online) y <strong className="text-foreground">Registrar venta</strong>.
                    </li>
                  </ol>
                </div>

                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
                  <strong className="text-foreground">¿Producto sin stock?</strong> Andá a{' '}
                  <strong>Inventario → Entrada</strong> y cargá cuánto tenés. Después volvé acá a
                  vender.
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ScanLine className="size-4" /> Escáner de código
            </CardTitle>
            <CardDescription>Apuntá con la cámara al código de barras del producto</CardDescription>
          </CardHeader>
          <CardContent>
            <BarcodeScanner
              onDetected={(value) => {
                setBarcode(value);
                const product = productByBarcode.get(value);
                toast.success(product ? `Encontrado: ${product.name}` : `Código detectado: ${value}`);
              }}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ReceiptText className="size-4" /> Nueva venta
            </CardTitle>
            <CardDescription>Completá los datos y guardá</CardDescription>
          </CardHeader>
          <CardContent>
            <SaleForm
              accessToken={accessToken}
              barcode={barcode}
              products={products}
              onBarcodeChange={setBarcode}
              onSaleCreated={loadData}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <History className="size-4" /> Historial de ventas
          </CardTitle>
          <CardDescription>Todas las ventas registradas. Ordenable y buscable.</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={salesColumns}
            data={saleRows}
            isLoading={isLoading}
            globalFilterPlaceholder="Buscar por producto o canal"
            emptyTitle="Sin ventas registradas"
            emptyDescription="Las ventas que registres aparecen acá."
            pageSize={10}
            toolbar={
              <>
                <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Fechas" />
                {channelOptions.length > 0 ? (
                  <FacetedFilter
                    title="Canal"
                    options={channelOptions}
                    selected={selectedChannels}
                    onChange={setSelectedChannels}
                  />
                ) : null}
                <FacetedFilter
                  title="Estado"
                  options={[
                    { label: 'Válida', value: 'valid' },
                    { label: 'Anulada', value: 'voided' },
                  ]}
                  selected={selectedStatus}
                  onChange={setSelectedStatus}
                />
              </>
            }
            csv={{
              filename: `ventas-${new Date().toISOString().slice(0, 10)}`,
              columns: [
                { header: 'Producto', accessor: (r) => r.productName },
                { header: 'Cantidad', accessor: (r) => r.quantity },
                { header: 'Precio unitario', accessor: (r) => r.unitPrice },
                { header: 'Descuento', accessor: (r) => r.discount },
                { header: 'Total', accessor: (r) => r.total },
                { header: 'Canal', accessor: (r) => r.channel },
                { header: 'Estado', accessor: (r) => (r.voidedAt ? 'Anulada' : 'Válida') },
                { header: 'Motivo anulación', accessor: (r) => r.voidedReason ?? '' },
                { header: 'Fecha', accessor: (r) => new Date(r.soldAt).toLocaleString('es-PE') },
              ],
            }}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={voidTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setVoidTarget(null);
            setVoidReason('');
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Anular esta venta?</AlertDialogTitle>
            <AlertDialogDescription>
              Se van a devolver <strong>{voidTarget?.quantity} unidades</strong> de{' '}
              <strong>{voidTarget?.productName}</strong> al stock. La venta original queda en el
              historial marcada como anulada para auditoría.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="space-y-2">
            <Label htmlFor="void-reason">Motivo (opcional)</Label>
            <Textarea
              id="void-reason"
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={2}
              placeholder="Error al cobrar, cliente canceló, producto dañado..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isVoiding}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmVoid();
              }}
              disabled={isVoiding}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isVoiding ? 'Anulando...' : 'Anular venta'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
