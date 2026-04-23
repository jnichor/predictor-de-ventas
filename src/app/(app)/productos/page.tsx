'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PackageOpen, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { ProductForm } from '@/components/products/product-form';
import { productsColumns } from '@/components/products/products-columns';
import { useAuth } from '@/hooks/use-auth';
import type { Product } from '@/lib/types';

export default function ProductosPage() {
  const router = useRouter();
  const { session, currentUser, status } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);

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

  if (!accessToken || currentUser?.role !== 'admin') return null;

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
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetTrigger asChild>
            <Button>
              <Plus className="mr-2 size-4" />
              Nuevo producto
            </Button>
          </SheetTrigger>
          <SheetContent className="w-full overflow-y-auto sm:max-w-md">
            <SheetHeader>
              <SheetTitle>Nuevo producto</SheetTitle>
              <SheetDescription>
                Se va a crear un movimiento de entrada si el stock inicial es mayor a cero.
              </SheetDescription>
            </SheetHeader>
            <div className="mt-4 px-4 pb-4">
              <ProductForm
                accessToken={accessToken}
                onProductCreated={async () => {
                  await loadProducts();
                  setSheetOpen(false);
                }}
              />
            </div>
          </SheetContent>
        </Sheet>
      </div>

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
            columns={productsColumns}
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
