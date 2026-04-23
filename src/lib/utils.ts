import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function money(value: number) {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    maximumFractionDigits: 2,
  }).format(value);
}

export function toDateLabel(value: string) {
  return new Intl.DateTimeFormat('es-PE', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}
