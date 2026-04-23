'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, HelpCircle, History, PackagePlus, Wrench } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { DateRangePicker, type DateRangeValue } from '@/components/ui/date-range-picker';
import { FacetedFilter } from '@/components/ui/faceted-filter';
import { MovementForm } from '@/components/inventory/movement-form';
import {
  buildMovementRows,
  movementsColumns,
} from '@/components/inventory/movements-columns';
import { useAuth } from '@/hooks/use-auth';
import type { InventoryMovement, Product } from '@/lib/types';

export default function InventarioPage() {
  const { session, currentUser } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [movements, setMovements] = useState<InventoryMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<DateRangeValue>(undefined);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const [movRes, prodRes] = await Promise.all([
        fetch('/api/inventory/movements', {
          headers: { Authorization: `Bearer ${accessToken}` },
        }),
        fetch('/api/products', { headers: { Authorization: `Bearer ${accessToken}` } }),
      ]);
      if (movRes.ok) {
        const data = await movRes.json();
        setMovements(Array.isArray(data.movements) ? data.movements : []);
      }
      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (error) {
      console.error('inventario loadData', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const productById = useMemo(() => {
    const map = new Map<string, Product>();
    for (const p of products) map.set(p.id, p);
    return map;
  }, [products]);

  const allMovementRows = useMemo(
    () => buildMovementRows(movements, productById),
    [movements, productById],
  );

  const movementRows = useMemo(() => {
    return allMovementRows.filter((m) => {
      if (dateRange?.from) {
        const mDate = new Date(m.createdAt);
        const from = new Date(dateRange.from);
        from.setHours(0, 0, 0, 0);
        if (mDate < from) return false;
        if (dateRange.to) {
          const to = new Date(dateRange.to);
          to.setHours(23, 59, 59, 999);
          if (mDate > to) return false;
        }
      }
      if (selectedTypes.length > 0 && !selectedTypes.includes(m.type)) {
        return false;
      }
      return true;
    });
  }, [allMovementRows, dateRange, selectedTypes]);

  if (!accessToken) return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Operaciones
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Movimientos de inventario</h1>
        <p className="text-sm text-muted-foreground">
          Entradas, salidas y ajustes de stock con trazabilidad por usuario.
        </p>
      </div>

      <Card>
        <Accordion type="single" collapsible>
          <AccordionItem value="help" className="border-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <HelpCircle className="size-4 text-primary" />
                <span className="font-medium">¿Cómo funcionan los movimientos?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4 text-sm leading-relaxed">
                <p>
                  Un <strong>movimiento</strong> es un evento que cambia el stock de un producto
                  existente. No crea el producto — eso se hace una sola vez en{' '}
                  <strong>Productos → Nuevo producto</strong>. Acá solo registrás lo que{' '}
                  <em>pasó</em> con el stock.
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-md border bg-card p-3">
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      <ArrowUpRight className="size-4 text-primary" />
                      Entrada
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Suma stock. Usalo cuando llega mercadería del proveedor.
                    </p>
                  </div>
                  <div className="rounded-md border bg-card p-3">
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      <ArrowDownRight className="size-4 text-muted-foreground" />
                      Salida
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Resta stock fuera de venta. Usalo por roturas, vencimientos o devoluciones a
                      proveedor.
                    </p>
                  </div>
                  <div className="rounded-md border bg-card p-3">
                    <div className="mb-1 flex items-center gap-2 font-medium">
                      <Wrench className="size-4 text-muted-foreground" />
                      Ajuste <span className="text-xs text-muted-foreground">(solo admin)</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Corrige el stock cuando el conteo físico no coincide con el sistema.
                    </p>
                  </div>
                </div>

                <div>
                  <p className="mb-2 font-medium">Ejemplo de flujo típico en la tienda:</p>
                  <ol className="list-decimal space-y-1.5 pl-5 text-muted-foreground">
                    <li>
                      El admin da de alta &quot;Arroz 1kg&quot; en{' '}
                      <strong className="text-foreground">Productos</strong> con precio S/ 4.50 y
                      stock 0.
                    </li>
                    <li>
                      Llegó el camión con 50 bolsas → acá registrás{' '}
                      <strong className="text-foreground">Entrada</strong> de 50. Stock: 50.
                    </li>
                    <li>
                      Cliente compra 3 bolsas → se registra en{' '}
                      <strong className="text-foreground">Ventas</strong> y el stock se descuenta
                      solo. Stock: 47.
                    </li>
                    <li>
                      Se rompen 2 bolsas → acá registrás{' '}
                      <strong className="text-foreground">Salida</strong> de 2 con motivo
                      &quot;Rotura&quot;. Stock: 45.
                    </li>
                    <li>
                      El admin cuenta y hay 43, no 45 → acá registrás{' '}
                      <strong className="text-foreground">Ajuste → Disminuir</strong> de 2. Stock:
                      43.
                    </li>
                  </ol>
                </div>

                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
                  <strong className="text-foreground">Atajo útil:</strong> si escaneás un código que
                  no está registrado y elegís <strong>Entrada</strong>, el sistema crea el producto
                  al vuelo (solo con nombre) y le carga el stock de la entrada en un solo paso.
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <PackagePlus className="size-4" /> Nuevo movimiento
            </CardTitle>
            <CardDescription>El tipo determina cómo afecta al stock</CardDescription>
          </CardHeader>
          <CardContent>
            <MovementForm
              accessToken={accessToken}
              products={products}
              isAdmin={currentUser?.role === 'admin'}
              onMovementCreated={loadData}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <History className="size-4" /> Historial
            </CardTitle>
            <CardDescription>Todos los movimientos registrados, ordenables y buscables.</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable
              columns={movementsColumns}
              data={movementRows}
              isLoading={isLoading}
              globalFilterPlaceholder="Buscar por producto, motivo o tipo"
              emptyTitle="Sin movimientos"
              emptyDescription="Registrá entradas, salidas o ajustes desde el formulario."
              pageSize={10}
              toolbar={
                <>
                  <DateRangePicker value={dateRange} onChange={setDateRange} placeholder="Fechas" />
                  <FacetedFilter
                    title="Tipo"
                    options={[
                      { label: 'Entrada', value: 'entry' },
                      { label: 'Salida', value: 'exit' },
                      { label: 'Ajuste', value: 'adjustment' },
                    ]}
                    selected={selectedTypes}
                    onChange={setSelectedTypes}
                  />
                </>
              }
              csv={{
                filename: `movimientos-${new Date().toISOString().slice(0, 10)}`,
                columns: [
                  { header: 'Tipo', accessor: (r) => r.type },
                  { header: 'Producto', accessor: (r) => r.productName },
                  { header: 'Cantidad', accessor: (r) => r.quantity },
                  { header: 'Motivo', accessor: (r) => r.reason },
                  { header: 'Fecha', accessor: (r) => new Date(r.createdAt).toLocaleString('es-PE') },
                ],
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
