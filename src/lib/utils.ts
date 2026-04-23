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

export function csvEscape(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export type CsvColumn<T> = {
  header: string;
  accessor: (row: T) => string | number | null | undefined;
};

/**
 * Genera una string CSV sin trigger de descarga.
 * Útil para tests unitarios y usos donde se quiere el string directo.
 * Incluye BOM UTF-8 para que Excel lo abra correctamente en español.
 */
export function buildCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const headerLine = columns.map((c) => csvEscape(c.header)).join(',');
  const bodyLines = rows.map((row) =>
    columns.map((c) => csvEscape(c.accessor(row))).join(','),
  );
  return '﻿' + [headerLine, ...bodyLines].join('\r\n');
}

export function exportToCsv<T>(rows: T[], columns: CsvColumn<T>[], filename: string) {
  const csv = buildCsv(rows, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
