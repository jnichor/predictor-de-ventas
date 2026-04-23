import { describe, it, expect } from 'vitest';
import { buildCsv, csvEscape, cn, money, toDateLabel } from './utils';

describe('cn', () => {
  it('combines class names', () => {
    expect(cn('a', 'b')).toBe('a b');
  });
  it('filters falsy', () => {
    expect(cn('a', false, null, undefined, 'b')).toBe('a b');
  });
  it('merges tailwind conflicts (tw-merge)', () => {
    expect(cn('p-2', 'p-4')).toBe('p-4');
  });
});

describe('money', () => {
  it('formats PEN currency', () => {
    const formatted = money(1234.5);
    expect(formatted).toContain('1,234.5');
    expect(formatted).toMatch(/S\/?\s*|PEN/); // símbolo peruano
  });
  it('rounds to 2 decimals', () => {
    expect(money(10.999)).toContain('11');
  });
  it('handles zero', () => {
    expect(money(0)).toContain('0');
  });
});

describe('toDateLabel', () => {
  it('formats to short date es-PE', () => {
    const label = toDateLabel('2026-04-23T10:00:00Z');
    // salida típica: "23 abr"
    expect(label.length).toBeGreaterThan(2);
  });
});

describe('csvEscape', () => {
  it('returns empty string for null/undefined', () => {
    expect(csvEscape(null)).toBe('');
    expect(csvEscape(undefined)).toBe('');
  });
  it('returns simple value as string', () => {
    expect(csvEscape('hola')).toBe('hola');
    expect(csvEscape(42)).toBe('42');
  });
  it('wraps values with commas in quotes', () => {
    expect(csvEscape('a, b')).toBe('"a, b"');
  });
  it('wraps values with newlines in quotes', () => {
    expect(csvEscape('linea 1\nlinea 2')).toBe('"linea 1\nlinea 2"');
  });
  it('escapes internal quotes by doubling them', () => {
    expect(csvEscape('dice "hola"')).toBe('"dice ""hola"""');
  });
});

describe('buildCsv', () => {
  type Row = { name: string; age: number };
  const columns = [
    { header: 'Nombre', accessor: (r: Row) => r.name },
    { header: 'Edad', accessor: (r: Row) => r.age },
  ];

  it('generates header + body', () => {
    const csv = buildCsv<Row>(
      [{ name: 'Ana', age: 30 }],
      columns,
    );
    const lines = csv.replace('﻿', '').split('\r\n');
    expect(lines[0]).toBe('Nombre,Edad');
    expect(lines[1]).toBe('Ana,30');
  });

  it('prepends UTF-8 BOM for Excel compatibility', () => {
    const csv = buildCsv<Row>([{ name: 'a', age: 1 }], columns);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
  });

  it('handles empty rows (header only)', () => {
    const csv = buildCsv<Row>([], columns);
    expect(csv.replace('﻿', '')).toBe('Nombre,Edad');
  });

  it('escapes commas in data', () => {
    const csv = buildCsv<Row>(
      [{ name: 'López, Ana', age: 25 }],
      columns,
    );
    expect(csv).toContain('"López, Ana",25');
  });

  it('escapes quotes in data', () => {
    const csv = buildCsv<Row>(
      [{ name: 'Ana "la jefa"', age: 40 }],
      columns,
    );
    expect(csv).toContain('"Ana ""la jefa""",40');
  });

  it('handles null/undefined accessor return', () => {
    const csv = buildCsv<{ a: string | null }>(
      [{ a: null }, { a: 'x' }],
      [{ header: 'A', accessor: (r) => r.a }],
    );
    const body = csv.replace('﻿', '').split('\r\n');
    expect(body[1]).toBe(''); // null → ''
    expect(body[2]).toBe('x');
  });
});
