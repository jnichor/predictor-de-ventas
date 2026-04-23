'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { HelpCircle, PackageOpen, Plus } from 'lucide-react';
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { ProductForm } from '@/components/products/product-form';
import { buildProductsColumns } from '@/components/products/products-columns';
import { useAuth } from '@/hooks/use-auth';
import type { Product } from '@/lib/types';

type SheetState = { mode: 'create' } | { mode: 'edit'; product: Product } | null;

export default function ProductosPage() {
  const router = useRouter();
  const { session, currentUser, status } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheet, setSheet] = useState<SheetState>(null);
  const [deactivateTarget, setDeactivateTarget] = useState<Product | null>(null);

  useEffect(() => {
    if (status === 'authenticated' && currentUser?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [status, currentUser, router]);

  const loadProducts = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/products', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProducts(Array.isArray(data.products) ? data.products : []);
      }
    } catch (error) {
      console.error('productos loadData', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  async function handleDeactivate() {
    if (!deactivateTarget || !accessToken) return;
    try {
      const response = await fetch(`/api/products/${deactivateTarget.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo desactivar.');
        return;
      }
      toast.success(`Producto "${deactivateTarget.name}" desactivado.`);
      setDeactivateTarget(null);
      await loadProducts();
    } catch (error) {
      console.error('deactivate', error);
      toast.error('Error de conexión.');
    }
  }

  const columns = useMemo(
    () =>
      buildProductsColumns({
        onEdit: (product) => setSheet({ mode: 'edit', product }),
        onDeactivate: (product) => setDeactivateTarget(product),
      }),
    [],
  );

  if (!accessToken || currentUser?.role !== 'admin') return null;

  const sheetOpen = sheet !== null;
  const editingProduct = sheet?.mode === 'edit' ? sheet.product : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Administración
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Productos</h1>
          <p className="text-sm text-muted-foreground">
            Administrá el catálogo y el stock mínimo para alertas.
          </p>
        </div>
        <Button onClick={() => setSheet({ mode: 'create' })}>
          <Plus className="mr-2 size-4" />
          Nuevo producto
        </Button>
      </div>

      <Sheet open={sheetOpen} onOpenChange={(open) => !open && setSheet(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editingProduct ? 'Editar producto' : 'Nuevo producto'}</SheetTitle>
            <SheetDescription>
              {editingProduct
                ? 'Cambiá precio, nombre u otros datos. El stock se modifica desde Inventario.'
                : 'Se va a crear un movimiento de entrada si el stock inicial es mayor a cero.'}
            </SheetDescription>
          </SheetHeader>
          <div className="mt-4 px-4 pb-4">
            <ProductForm
              accessToken={accessToken}
              initialProduct={editingProduct}
              onProductSaved={async () => {
                await loadProducts();
                setSheet(null);
              }}
            />
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={deactivateTarget !== null}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar este producto?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deactivateTarget?.name}</strong> dejará de aparecer en las búsquedas de venta
              e inventario, pero su historial de ventas y movimientos se conserva intacto. Podés
              reactivarlo después editándolo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeactivate}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Card>
        <Accordion type="single" collapsible>
          <AccordionItem value="help" className="border-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <HelpCircle className="size-4 text-primary" />
                <span className="font-medium">¿Qué es un producto?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-4 text-sm leading-relaxed">
                <p>
                  Un <strong>producto</strong> es la ficha maestra del catálogo — define qué es el
                  ítem (código, nombre, precio, categoría). Se crea una sola vez y queda
                  permanente. No se confunde con un <strong>movimiento</strong>: el movimiento es
                  un cambio de stock del producto.
                </p>

                <div>
                  <p className="mb-2 font-medium">Campos clave al crear un producto:</p>
                  <ul className="list-disc space-y-1.5 pl-5 text-muted-foreground">
                    <li>
                      <strong className="text-foreground">Código de barras</strong>: único. Es con
                      lo que después vas a identificar el producto al escanear.
                    </li>
                    <li>
                      <strong className="text-foreground">Precio unitario</strong>: el precio al
                      que se vende por defecto. Se puede aplicar descuento al momento de la venta.
                    </li>
                    <li>
                      <strong className="text-foreground">Stock inicial</strong>: cuánto hay al
                      crearlo. Si ponés más de 0, se registra automáticamente un movimiento de
                      entrada para trazabilidad.
                    </li>
                    <li>
                      <strong className="text-foreground">Stock mínimo</strong>: umbral para alertas.
                      Cuando el stock baja de este número, el producto aparece en &quot;Stock
                      bajo&quot; del panel y en Reportes.
                    </li>
                  </ul>
                </div>

                <div className="rounded-md border border-primary/20 bg-primary/5 p-3 text-xs">
                  <strong className="text-foreground">Alta al vuelo:</strong> también podés crear
                  productos nuevos directamente desde <strong>Inventario → Entrada</strong>
                  escaneando un código no registrado. Después completá el precio desde acá.
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PackageOpen className="size-4" /> Catálogo
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Cargando...' : `${products.length} producto${products.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={products}
            isLoading={isLoading}
            globalFilterPlaceholder="Buscar por nombre, barcode o categoría"
            emptyTitle={products.length === 0 ? 'Todavía no hay productos' : 'Sin coincidencias'}
            emptyDescription={
              products.length === 0
                ? 'Creá el primero con "Nuevo producto".'
                : 'Ajustá el criterio de búsqueda.'
            }
            pageSize={10}
          />
        </CardContent>
      </Card>
    </div>
  );
}
