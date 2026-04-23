'use client';

import { useEffect, useMemo } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, ReceiptText } from 'lucide-react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { ProductCombobox } from '@/components/products/product-combobox';
import { saleFormSchema, type SaleFormValues } from '@/lib/form-schemas';
import type { Product } from '@/lib/types';
import { money } from '@/lib/utils';

type SaleFormProps = {
  accessToken: string;
  barcode: string;
  products: Product[];
  onBarcodeChange: (value: string) => void;
  onSaleCreated?: () => void | Promise<void>;
};

export function SaleForm({
  accessToken,
  barcode,
  products,
  onBarcodeChange,
  onSaleCreated,
}: SaleFormProps) {
  const form = useForm<SaleFormValues>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      barcode: barcode,
      quantity: 1,
      discount: 0,
      channel: 'Mostrador',
    },
  });

  // Sincroniza el barcode externo (scanner) con el campo del form
  useEffect(() => {
    form.setValue('barcode', barcode, { shouldValidate: false });
  }, [barcode, form]);

  // Resuelve el producto matcheado por el código actual del form
  const currentBarcode = form.watch('barcode');
  const selectedProduct = useMemo(
    () => products.find((p) => p.barcode === currentBarcode) ?? null,
    [products, currentBarcode],
  );

  async function onSubmit(values: SaleFormValues) {
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo registrar la venta.');
        return;
      }

      toast.success('Venta registrada y stock actualizado.');
      form.reset({ barcode: '', quantity: 1, discount: 0, channel: 'Mostrador' });
      onBarcodeChange('');
      await onSaleCreated?.();
    } catch (error) {
      console.error('sale submit', error);
      toast.error('Error de conexión al registrar la venta.');
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
              <FormLabel>Código del producto</FormLabel>
              <FormControl>
                <ProductCombobox
                  products={products}
                  value={field.value}
                  onChange={(value) => {
                    field.onChange(value);
                    onBarcodeChange(value);
                  }}
                  placeholder="Escaneá o buscá por nombre / barcode..."
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <Label htmlFor="product-name">Nombre del producto</Label>
          <Input
            id="product-name"
            readOnly
            tabIndex={-1}
            value={selectedProduct?.name ?? ''}
            placeholder="Se completa automáticamente con el código"
            className="bg-muted/50 cursor-default"
          />
          {currentBarcode && !selectedProduct ? (
            <p className="text-xs text-destructive">Código no reconocido en el catálogo.</p>
          ) : selectedProduct ? (
            <p className="text-xs text-muted-foreground tabular-nums">
              Precio: {money(selectedProduct.unitPrice)} · Stock: {selectedProduct.currentStock} u
            </p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-3">
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
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="discount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descuento</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    className="tabular-nums"
                    {...field}
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="channel"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Canal</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="Mostrador">Mostrador</SelectItem>
                  <SelectItem value="Delivery">Delivery</SelectItem>
                  <SelectItem value="Online">Online</SelectItem>
                </SelectContent>
              </Select>
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
              <ReceiptText className="mr-2 size-4" />
              Registrar venta
            </>
          )}
        </Button>
      </form>
    </Form>
  );
}
