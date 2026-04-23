'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, PackagePlus } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
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

  async function onSubmit(values: MovementFormValues) {
    const query = values.barcodeOrName.trim();
    const product = products.find((p) => p.barcode === query || p.name === query);

    if (!product) {
      form.setError('barcodeOrName', { message: 'No se encontró el producto.' });
      return;
    }

    const willDecrease =
      values.type === 'exit' ||
      (values.type === 'adjustment' && values.adjustmentDirection === 'decrease');
    if (willDecrease && values.quantity > product.currentStock) {
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
          product_id: product.id,
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
              <FormLabel>Código o nombre del producto</FormLabel>
              <FormControl>
                <Input
                  placeholder="7751234567890 o Arroz 1kg"
                  autoComplete="off"
                  className="font-mono tabular-nums"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

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
