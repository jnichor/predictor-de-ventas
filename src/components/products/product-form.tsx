'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, PackageOpen } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

type ProductFormProps = {
  accessToken: string;
  onProductCreated?: () => void | Promise<void>;
};

const empty = {
  barcode: '',
  name: '',
  description: '',
  category: '',
  unitPrice: '',
  currentStock: '',
  minStock: '',
};

export function ProductForm({ accessToken, onProductCreated }: ProductFormProps) {
  const [form, setForm] = useState(empty);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update<K extends keyof typeof empty>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form.barcode.trim() || !form.name.trim()) {
      toast.error('Falta completar nombre y código.');
      return;
    }

    const unitPrice = Number(form.unitPrice);
    const currentStock = Number(form.currentStock);
    const minStock = Number(form.minStock);

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          barcode: form.barcode.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          category: form.category.trim() || 'General',
          unit_price: Number.isFinite(unitPrice) ? unitPrice : 0,
          current_stock: Number.isFinite(currentStock) ? currentStock : 0,
          min_stock: Number.isFinite(minStock) ? minStock : 0,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo crear el producto.');
        return;
      }

      toast.success('Producto creado correctamente.');
      setForm(empty);
      await onProductCreated?.();
    } catch (error) {
      console.error('product submit', error);
      toast.error('Error de conexión al crear el producto.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="barcode">Código de barras</Label>
        <Input
          id="barcode"
          value={form.barcode}
          onChange={(e) => update('barcode', e.target.value)}
          placeholder="775123..."
          className="font-mono tabular-nums"
          autoComplete="off"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(e) => update('name', e.target.value)}
          placeholder="Arroz 1kg"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Categoría</Label>
        <Input
          id="category"
          value={form.category}
          onChange={(e) => update('category', e.target.value)}
          placeholder="Abarrotes"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          <Label htmlFor="unit-price">Precio unitario</Label>
          <Input
            id="unit-price"
            type="number"
            step="0.01"
            min="0"
            value={form.unitPrice}
            onChange={(e) => update('unitPrice', e.target.value)}
            placeholder="0.00"
            className="tabular-nums"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="current-stock">Stock inicial</Label>
          <Input
            id="current-stock"
            type="number"
            min="0"
            value={form.currentStock}
            onChange={(e) => update('currentStock', e.target.value)}
            placeholder="0"
            className="tabular-nums"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="min-stock">Stock mínimo (alerta)</Label>
        <Input
          id="min-stock"
          type="number"
          min="0"
          value={form.minStock}
          onChange={(e) => update('minStock', e.target.value)}
          placeholder="0"
          className="tabular-nums"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
          rows={3}
          placeholder="Detalle opcional del producto"
        />
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Guardando...
          </>
        ) : (
          <>
            <PackageOpen className="mr-2 size-4" />
            Guardar producto
          </>
        )}
      </Button>
    </form>
  );
}
