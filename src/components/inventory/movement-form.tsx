'use client';

import { useState, type FormEvent } from 'react';
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
import type { Product } from '@/lib/types';

type MovementType = 'entry' | 'exit' | 'adjustment';
type AdjustmentDirection = 'increase' | 'decrease';

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
  const [barcodeOrName, setBarcodeOrName] = useState('');
  const [type, setType] = useState<MovementType>('entry');
  const [adjustmentDirection, setAdjustmentDirection] = useState<AdjustmentDirection>('increase');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const query = barcodeOrName.trim();
    if (!query) {
      toast.error('Falta el código o nombre del producto.');
      return;
    }

    const product = products.find((p) => p.barcode === query || p.name === query);
    if (!product) {
      toast.error('No se encontró el producto.');
      return;
    }

    const q = Number(quantity);
    if (!Number.isFinite(q) || q <= 0) {
      toast.error('La cantidad debe ser mayor a cero.');
      return;
    }

    const willDecrease = type === 'exit' || (type === 'adjustment' && adjustmentDirection === 'decrease');
    if (willDecrease && q > product.currentStock) {
      toast.error(`Solo hay ${product.currentStock} unidades en stock.`);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/inventory/movements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          product_id: product.id,
          type,
          quantity: q,
          reason: reason.trim() || 'Movimiento de inventario',
          adjustment_direction: type === 'adjustment' ? adjustmentDirection : null,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo registrar el movimiento.');
        return;
      }

      toast.success('Movimiento de inventario registrado.');
      setBarcodeOrName('');
      setQuantity('1');
      setReason('');
      await onMovementCreated?.();
    } catch (error) {
      console.error('movement submit', error);
      toast.error('Error de conexión al registrar el movimiento.');
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
          value={barcodeOrName}
          onChange={(event) => setBarcodeOrName(event.target.value)}
          placeholder="7751234567890 o Arroz 1kg"
          autoComplete="off"
          className="font-mono tabular-nums"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="type">Tipo de movimiento</Label>
          <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
            <SelectTrigger id="type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="entry">Entrada (recepción)</SelectItem>
              <SelectItem value="exit">Salida (merma, devolución)</SelectItem>
              {isAdmin ? <SelectItem value="adjustment">Ajuste (solo admin)</SelectItem> : null}
            </SelectContent>
          </Select>
        </div>

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
      </div>

      {type === 'adjustment' ? (
        <div className="space-y-2">
          <Label htmlFor="direction">Dirección del ajuste</Label>
          <Select
            value={adjustmentDirection}
            onValueChange={(v) => setAdjustmentDirection(v as AdjustmentDirection)}
          >
            <SelectTrigger id="direction">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="increase">Aumentar stock</SelectItem>
              <SelectItem value="decrease">Disminuir stock</SelectItem>
            </SelectContent>
          </Select>
        </div>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="reason">Motivo</Label>
        <Textarea
          id="reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          rows={3}
          placeholder="Ingreso de mercadería, conteo físico, merma por vencimiento..."
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
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
  );
}
