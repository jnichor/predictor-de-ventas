'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, ReceiptText } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { saleFormSchema, type SaleFormValues } from '@/lib/form-schemas';

type SaleFormProps = {
  accessToken: string;
  barcode: string;
  onBarcodeChange: (value: string) => void;
  onSaleCreated?: () => void | Promise<void>;
};

export function SaleForm({ accessToken, barcode, onBarcodeChange, onSaleCreated }: SaleFormProps) {
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
              <FormLabel>Código o nombre del producto</FormLabel>
              <FormControl>
                <Input
                  placeholder="7751234567890"
                  autoComplete="off"
                  className="font-mono tabular-nums"
                  {...field}
                  onChange={(e) => {
                    field.onChange(e);
                    onBarcodeChange(e.target.value);
                  }}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
