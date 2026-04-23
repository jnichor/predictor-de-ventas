'use client';

import { useState } from 'react';
import { Check, ChevronsUpDown, Package } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { Product } from '@/lib/types';

type ProductComboboxProps = {
  products: Product[];
  value: string;
  onChange: (value: string, product: Product | null) => void;
  placeholder?: string;
  disabled?: boolean;
};

export function ProductCombobox({
  products,
  value,
  onChange,
  placeholder = 'Elegí un producto...',
  disabled,
}: ProductComboboxProps) {
  const [open, setOpen] = useState(false);

  const selected = products.find((p) => p.barcode === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal"
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <Package className="size-4 shrink-0 text-muted-foreground" />
              <span className="truncate">{selected.name}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                {selected.barcode}
              </span>
            </span>
          ) : value ? (
            <span className="flex min-w-0 items-center gap-2 font-mono text-sm tabular-nums">
              <Package className="size-4 shrink-0 text-muted-foreground" />
              {value}
              <span className="text-xs text-destructive">(no encontrado)</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder="Buscar por nombre, barcode o categoría..." />
          <CommandList>
            <CommandEmpty>Sin productos.</CommandEmpty>
            <CommandGroup>
              {products.map((product) => {
                const isLow = product.currentStock <= product.minStock;
                return (
                  <CommandItem
                    key={product.id}
                    value={`${product.name} ${product.barcode} ${product.category}`}
                    onSelect={() => {
                      onChange(product.barcode, product);
                      setOpen(false);
                    }}
                    className="gap-2"
                  >
                    <Check
                      className={cn(
                        'size-4',
                        value === product.barcode ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate">{product.name}</span>
                      <span className="font-mono text-xs text-muted-foreground tabular-nums">
                        {product.barcode}
                      </span>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 text-xs tabular-nums',
                        isLow ? 'text-destructive font-medium' : 'text-muted-foreground',
                      )}
                    >
                      {product.currentStock} u
                    </span>
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
