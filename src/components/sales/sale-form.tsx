'use client';

import { useEffect, useMemo, useState } from 'react';
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
import { SaleReceipt, type ReceiptData } from '@/components/sales/sale-receipt';
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

  // Estado local del nombre del producto.
  // Se auto-completa cuando el código matchea un producto existente,
  // y el user puede escribirlo manualmente si el código es nuevo.
  const [productName, setProductName] = useState('');

  // Último recibo generado — se muestra en dialog imprimible
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  useEffect(() => {
    if (selectedProduct) {
      setProductName(selectedProduct.name);
    } else if (!currentBarcode) {
      setProductName('');
    }
  }, [selectedProduct, currentBarcode]);

  async function onSubmit(values: SaleFormValues) {
    const trimmedName = productName.trim();

    // Si el código no matchea un producto existente, el nombre es obligatorio
    // para dar de alta el producto al vuelo.
    if (!selectedProduct && !trimmedName) {
      toast.error('Ingresá el nombre del producto para darlo de alta.');
      return;
    }

    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          ...values,
          name: !selectedProduct && trimmedName ? trimmedName : undefined,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo registrar la venta.');
        return;
      }

      const responseData = await response.json().catch(() => null);
      const sale = responseData?.sale;

      toast.success('Venta registrada y stock actualizado.');

      // Preparar ticket imprimible con la data de la venta recién creada
      if (sale) {
        const product = products.find((p) => p.barcode === values.barcode);
        setReceipt({
          id: sale.id,
          productName: product?.name ?? trimmedName ?? 'Producto',
          productBarcode: values.barcode,
          quantity: sale.quantity,
          unitPrice: sale.unitPrice,
          discount: sale.discount,
          total: sale.total,
          channel: sale.channel,
          soldAt: sale.soldAt,
        });
        setReceiptOpen(true);
      }

      form.reset({ barcode: '', quantity: 1, discount: 0, channel: 'Mostrador' });
      setProductName('');
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

      <SaleReceipt open={receiptOpen} onOpenChange={setReceiptOpen} data={receipt} />
    </Form>
  );
}
