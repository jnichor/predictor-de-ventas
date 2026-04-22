export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
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
