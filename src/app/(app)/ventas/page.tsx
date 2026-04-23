'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, ReceiptText, ScanLine } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { SaleForm } from '@/components/sales/sale-form';
import { buildSaleRows, salesColumns } from '@/components/sales/sales-columns';
import { useAuth } from '@/hooks/use-auth';
import type { Product, Sale } from '@/lib/types';

export default function VentasPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [barcode, setBarcode] = useState('');
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

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

  const saleRows = useMemo(() => buildSaleRows(sales, productById), [sales, productById]);

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
          />
        </CardContent>
      </Card>
    </div>
  );
}
