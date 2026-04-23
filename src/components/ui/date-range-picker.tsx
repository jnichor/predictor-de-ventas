'use client';

import { useState } from 'react';
import { CalendarIcon, X } from 'lucide-react';
import type { DateRange } from 'react-day-picker';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

export type DateRangeValue = DateRange | undefined;

type DateRangePickerProps = {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
  className?: string;
  align?: 'start' | 'center' | 'end';
};

function formatDate(d: Date | undefined) {
  if (!d) return '';
  return new Intl.DateTimeFormat('es-PE', { dateStyle: 'short' }).format(d);
}

export function DateRangePicker({
  value,
  onChange,
  placeholder = 'Rango de fechas',
  className,
  align = 'start',
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);

  const label = value?.from
    ? value.to
      ? `${formatDate(value.from)} – ${formatDate(value.to)}`
      : formatDate(value.from)
    : placeholder;

  return (
    <div className={cn('flex items-center gap-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              'justify-start text-left font-normal',
              !value?.from && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="mr-2 size-4" />
            {label}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align={align}>
          <Calendar
            mode="range"
            defaultMonth={value?.from}
            selected={value}
            onSelect={(range) => {
              onChange(range);
              if (range?.from && range?.to) setOpen(false);
            }}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
      {value?.from ? (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange(undefined)}
          aria-label="Limpiar fechas"
        >
          <X className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}
