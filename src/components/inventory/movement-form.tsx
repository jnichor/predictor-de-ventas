'use client';

import { useEffect, useMemo, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, PackagePlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ProductCombobox } from '@/components/products/product-combobox';
import { movementFormSchema, type MovementFormValues } from '@/lib/form-schemas';
import type { Product } from '@/lib/types';

type MovementFormProps = {
  accessToken: string;
  products: Product[];
  isAdmin: boolean;
  onMovementCreated?: () => void | Promise<void>;
};

export function MovementForm({
  accessToken,
  products,
  isAdmin,
  onMovementCreated,
}: MovementFormProps) {
  const form = useForm<MovementFormValues>({
    resolver: zodResolver(movementFormSchema),
    defaultValues: {
      barcodeOrName: '',
      type: 'entry',
      quantity: 1,
      reason: '',
      adjustmentDirection: 'increase',
    },
  });

  const type = form.watch('type');
  const currentBarcode = form.watch('barcodeOrName');
  const selectedProduct = useMemo(
    () => products.find((p) => p.barcode === currentBarcode) ?? null,
    [products, currentBarcode],
  );

  // Nombre editable con auto-fill cuando el código matchea
  const [productName, setProductName] = useState('');
  useEffect(() => {
    if (selectedProduct) {
      setProductName(selectedProduct.name);
    } else if (!currentBarcode) {
      setProductName('');
    }
  }, [selectedProduct, currentBarcode]);

  async function onSubmit(values: MovementFormValues) {
    const barcode = values.barcodeOrName.trim();
    const trimmedName = productName.trim();
    const product = products.find((p) => p.barcode === barcode);

    // Si no matcheó producto, necesitamos un nombre para alta al vuelo
    if (!product && !trimmedName) {
      form.setError('barcodeOrName', {
        message: 'Ingresá el nombre del producto para darlo de alta.',
      });
      return;
    }

    const willDecrease =
      values.type === 'exit' ||
      (values.type === 'adjustment' && values.adjustmentDirection === 'decrease');
    if (product && willDecrease && values.quantity > product.currentStock) {
      form.setError('quantity', {
        message: `Solo hay ${product.currentStock} unidades en stock.`,
      });
      return;
    }

    try {
      const response = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barcode,
          name: !product && trimmedName ? trimmedName : undefined,
          type: values.type,
          quantity: values.quantity,
          reason: values.reason?.trim() || 'Movimiento de inventario',
          adjustment_direction: values.type === 'adjustment' ? values.adjustmentDirection : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo registrar el movimiento.');
        return;
      }

      toast.success('Movimiento de inventario registrado.');
      form.reset({
        barcodeOrName: '',
        type: 'entry',
        quantity: 1,
        reason: '',
        adjustmentDirection: 'increase',
      });
      setProductName('');
      await onMovementCreated?.();
    } catch (error) {
      console.error('movement submit', error);
      toast.error('Error de conexión al registrar el movimiento.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="barcodeOrName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Código del producto</FormLabel>
              <FormControl>
                <ProductCombobox
                  products={products}
                  value={field.value}
                  onChange={(value) => field.onChange(value)}
                  placeholder="Escaneá o buscá por nombre / barcode..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label htmlFor="movement-product-name">Nombre del producto</Label>
          <Input
            id="movement-product-name"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder={
              currentBarcode
                ? 'Ingresá el nombre del producto nuevo'
                : 'Se autocompleta cuando el código ya existe'
            }
          />
          {currentBarcode && !selectedProduct ? (
            <p className="text-xs text-muted-foreground">
              Este código no está registrado. Escribí el nombre para darlo de alta al guardar.
            </p>
          ) : selectedProduct ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              Stock actual: {selectedProduct.currentStock} u
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tipo de movimiento</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="entry">Entrada (recepción)</SelectItem>
                    <SelectItem value="exit">Salida (merma, devolución)</SelectItem>
                    {isAdmin ? <SelectItem value="adjustment">Ajuste (solo admin)</SelectItem> : null}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="quantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cantidad</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    min="1"
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
        </div>

        {type === 'adjustment' ? (
          <FormField
            control={form.control}
            name="adjustmentDirection"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Dirección del ajuste</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="increase">Aumentar stock</SelectItem>
                    <SelectItem value="decrease">Disminuir stock</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name="reason"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Motivo</FormLabel>
              <FormControl>
                <Textarea
                  rows={3}
                  placeholder="Ingreso de mercadería, conteo físico, merma por vencimiento..."
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Registrando...
            </>
          ) : (
            <>
              <PackagePlus className="mr-2 size-4" />
              Registrar movimiento
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
