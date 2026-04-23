'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, PackageOpen, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { productFormSchema, type ProductFormValues } from '@/lib/form-schemas';
import type { Product } from '@/lib/types';

type ProductFormProps = {
  accessToken: string;
  initialProduct?: Product | null;
  onProductSaved?: () => void | Promise<void>;
};

const defaults: ProductFormValues = {
  barcode: '',
  name: '',
  category: '',
  description: '',
  unitPrice: 0,
  currentStock: 0,
  minStock: 0,
};

function toFormValues(product: Product): ProductFormValues {
  return {
    barcode: product.barcode,
    name: product.name,
    category: product.category,
    description: product.description,
    unitPrice: product.unitPrice,
    currentStock: product.currentStock,
    minStock: product.minStock,
  };
}

export function ProductForm({ accessToken, initialProduct, onProductSaved }: ProductFormProps) {
  const isEdit = !!initialProduct;

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: initialProduct ? toFormValues(initialProduct) : defaults,
  });

  // Re-sync defaults cuando cambia el producto a editar
  useEffect(() => {
    form.reset(initialProduct ? toFormValues(initialProduct) : defaults);
  }, [initialProduct, form]);

  async function onSubmit(values: ProductFormValues) {
    try {
      const endpoint = isEdit
        ? `/api/products/${initialProduct!.id}`
        : '/api/products';
      const method = isEdit ? 'PATCH' : 'POST';

      // En edit no enviamos current_stock (el stock se cambia vía movimientos,
      // no via edición directa, para mantener la trazabilidad)
      const payload = isEdit
        ? {
            barcode: values.barcode,
            name: values.name,
            description: values.description ?? '',
            category: values.category?.trim() || 'General',
            unit_price: values.unitPrice,
            min_stock: values.minStock,
          }
        : {
            barcode: values.barcode,
            name: values.name,
            description: values.description ?? '',
            category: values.category?.trim() || 'General',
            unit_price: values.unitPrice,
            current_stock: values.currentStock,
            min_stock: values.minStock,
          };

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(
          data?.error ?? (isEdit ? 'No se pudo actualizar el producto.' : 'No se pudo crear el producto.'),
        );
        return;
      }

      toast.success(isEdit ? 'Producto actualizado.' : 'Producto creado correctamente.');
      if (!isEdit) form.reset(defaults);
      await onProductSaved?.();
    } catch (error) {
      console.error('product submit', error);
      toast.error('Error de conexión.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="barcode"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código de barras</FormLabel>
              <FormControl>
                <Input
                  placeholder="775123..."
                  className="font-mono tabular-nums"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre</FormLabel>
              <FormControl>
                <Input placeholder="Arroz 1kg" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoría</FormLabel>
              <FormControl>
                <Input placeholder="Abarrotes (opcional)" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="unitPrice"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Precio unitario</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="tabular-nums"
                    name={field.name}
                    ref={field.ref}
                    onBlur={field.onBlur}
                    value={field.value ?? 0}
                    onChange={(e) => {
                      const v = e.target.value;
                      field.onChange(v === '' ? 0 : Number(v));
                    }}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {!isEdit ? (
            <FormField
              control={form.control}
              name="currentStock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stock inicial</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      className="tabular-nums"
                      name={field.name}
                      ref={field.ref}
                      onBlur={field.onBlur}
                      value={field.value ?? 0}
                      onChange={(e) => {
                        const v = e.target.value;
                        field.onChange(v === '' ? 0 : Number(v));
                      }}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <div className="space-y-2">
              <FormLabel className="text-muted-foreground">Stock actual</FormLabel>
              <Input
                readOnly
                value={initialProduct?.currentStock ?? 0}
                className="bg-muted/50 tabular-nums cursor-default"
              />
              <p className="text-xs text-muted-foreground">
                Se modifica solo vía movimientos de inventario.
              </p>
            </div>
          )}
        </div>

        <FormField
          control={form.control}
          name="minStock"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Stock mínimo (alerta)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="0"
                  className="tabular-nums"
                  name={field.name}
                  ref={field.ref}
                  onBlur={field.onBlur}
                  value={field.value ?? 0}
                  onChange={(e) => {
                    const v = e.target.value;
                    field.onChange(v === '' ? 0 : Number(v));
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Textarea rows={3} placeholder="Detalle opcional del producto" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              {isEdit ? 'Guardando cambios...' : 'Guardando...'}
            </>
          ) : isEdit ? (
            <>
              <Save className="mr-2 size-4" />
              Guardar cambios
            </>
          ) : (
            <>
              <PackageOpen className="mr-2 size-4" />
              Guardar producto
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
