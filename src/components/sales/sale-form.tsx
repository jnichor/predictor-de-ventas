'use client';

import { useState, type FormEvent } from 'react';
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

type SaleFormProps = {
  accessToken: string;
  barcode: string;
  onBarcodeChange: (value: string) => void;
  onSaleCreated?: () => void | Promise<void>;
};

export function SaleForm({ accessToken, barcode, onBarcodeChange, onSaleCreated }: SaleFormProps) {
  const [quantity, setQuantity] = useState('1');
  const [discount, setDiscount] = useState('0');
  const [channel, setChannel] = useState('Mostrador');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!barcode.trim()) {
      toast.error('Falta el código de barras del producto.');
      return;
    }

    const q = Number(quantity);
    const d = Number(discount);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error('La cantidad debe ser mayor a cero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/sales', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barcode: barcode.trim(),
          quantity: q,
          discount: Number.isFinite(d) ? d : 0,
          channel,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo registrar la venta.');
        return;
      }

      toast.success('Venta registrada y stock actualizado.');
      onBarcodeChange('');
      setQuantity('1');
      setDiscount('0');
      setChannel('Mostrador');
      await onSaleCreated?.();
    } catch (error) {
      console.error('sale submit', error);
      toast.error('Error de conexión al registrar la venta.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="barcode">Código o nombre del producto</Label>
        <Input
          id="barcode"
          value={barcode}
          onChange={(event) => onBarcodeChange(event.target.value)}
          placeholder="7751234567890"
          autoComplete="off"
          className="font-mono tabular-nums"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="quantity">Cantidad</Label>
          <Input
            id="quantity"
            type="number"
            min="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="discount">Descuento</Label>
          <Input
            id="discount"
            type="number"
            step="0.01"
            min="0"
            value={discount}
            onChange={(event) => setDiscount(event.target.value)}
            className="tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="channel">Canal</Label>
        <Select value={channel} onValueChange={setChannel}>
          <SelectTrigger id="channel">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Mostrador">Mostrador</SelectItem>
            <SelectItem value="Delivery">Delivery</SelectItem>
            <SelectItem value="Online">Online</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
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
  );
}
