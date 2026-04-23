'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { History, PackagePlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
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

  const movementRows = useMemo(
    () => buildMovementRows(movements, productById),
    [movements, productById],
  );

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
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
