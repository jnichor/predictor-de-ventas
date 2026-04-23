import { describe, it, expect } from 'vitest';
import {
  calculateDayOfWeekFactors,
  calculateEWMA,
  calculateTrend,
  fillMissingDays,
  forecastProduct,
  type DailySale,
} from './forecasting';

describe('calculateEWMA', () => {
  it('devuelve 0 para array vacío', () => {
    expect(calculateEWMA([])).toBe(0);
  });
  it('devuelve el único valor si hay uno solo', () => {
    expect(calculateEWMA([5])).toBe(5);
  });
  it('responde más a lo reciente con alpha alto', () => {
    const highAlpha = calculateEWMA([1, 1, 1, 10], 0.9);
    const lowAlpha = calculateEWMA([1, 1, 1, 10], 0.1);
    expect(highAlpha).toBeGreaterThan(lowAlpha);
  });
  it('converge al valor constante en serie plana', () => {
    const result = calculateEWMA([5, 5, 5, 5, 5], 0.3);
    expect(result).toBeCloseTo(5, 5);
  });
});

describe('calculateTrend', () => {
  it('devuelve 0 para array corto', () => {
    expect(calculateTrend([])).toBe(0);
    expect(calculateTrend([5])).toBe(0);
  });
  it('detecta tendencia positiva', () => {
    const slope = calculateTrend([1, 2, 3, 4, 5]);
    expect(slope).toBeCloseTo(1, 5);
  });
  it('detecta tendencia negativa', () => {
    const slope = calculateTrend([5, 4, 3, 2, 1]);
    expect(slope).toBeCloseTo(-1, 5);
  });
  it('devuelve 0 para serie plana', () => {
    expect(calculateTrend([3, 3, 3, 3])).toBe(0);
  });
});

describe('calculateDayOfWeekFactors', () => {
  it('devuelve 7 factores', () => {
    const factors = calculateDayOfWeekFactors([
      { date: '2026-04-20', quantity: 10 }, // lunes
    ]);
    expect(factors).toHaveLength(7);
  });

  it('devuelve 1 para todos cuando no hay datos', () => {
    const factors = calculateDayOfWeekFactors([]);
    expect(factors.every((f) => f === 1)).toBe(true);
  });

  it('detecta que un día vende más', () => {
    // Los sábados (dow=6) vendemos el triple
    const sales: DailySale[] = [
      { date: '2026-04-13', quantity: 10 }, // lun
      { date: '2026-04-14', quantity: 10 }, // mar
      { date: '2026-04-15', quantity: 10 }, // mié
      { date: '2026-04-16', quantity: 10 }, // jue
      { date: '2026-04-17', quantity: 10 }, // vie
      { date: '2026-04-18', quantity: 30 }, // sáb
      { date: '2026-04-19', quantity: 10 }, // dom
    ];
    const factors = calculateDayOfWeekFactors(sales);
    expect(factors[6]).toBeGreaterThan(1.5); // sábado > promedio
    expect(factors[1]).toBeLessThan(1); // lunes < promedio (porque sábado dispara media)
  });
});

describe('fillMissingDays', () => {
  it('rellena huecos con 0', () => {
    const result = fillMissingDays(
      [{ date: '2026-04-20', quantity: 5 }],
      new Date('2026-04-20T00:00:00Z'),
      new Date('2026-04-22T00:00:00Z'),
    );
    expect(result).toHaveLength(3);
    expect(result[0].quantity).toBe(5);
    expect(result[1].quantity).toBe(0);
    expect(result[2].quantity).toBe(0);
  });

  it('suma múltiples ventas del mismo día', () => {
    const result = fillMissingDays(
      [
        { date: '2026-04-20', quantity: 3 },
        { date: '2026-04-20', quantity: 2 },
      ],
      new Date('2026-04-20T00:00:00Z'),
      new Date('2026-04-20T00:00:00Z'),
    );
    expect(result[0].quantity).toBe(5);
  });
});

describe('forecastProduct', () => {
  const today = new Date('2026-04-23T00:00:00Z');

  it('retorna no-data cuando no hay ventas', () => {
    const result = forecastProduct({
      sales: [],
      currentStock: 10,
      minStock: 5,
      referenceDate: today,
    });
    expect(result.status).toBe('no-data');
    expect(result.daysAnalyzed).toBe(0);
  });

  it('sugiere reorden cuando stock es menor al mínimo sin datos', () => {
    const result = forecastProduct({
      sales: [],
      currentStock: 2,
      minStock: 5,
      referenceDate: today,
    });
    expect(result.status).toBe('reorder');
    expect(result.suggestedOrder).toBeGreaterThan(0);
  });

  it('con 60 días de ventas constantes proyecta demanda estable', () => {
    const sales: DailySale[] = [];
    for (let i = 0; i < 60; i++) {
      const d = new Date(today);
      d.setUTCDate(d.getUTCDate() - i);
      sales.push({ date: d.toISOString().slice(0, 10), quantity: 5 });
    }
    const result = forecastProduct({
      sales,
      currentStock: 10,
      minStock: 5,
      referenceDate: today,
      horizonDays: 7,
    });
    expect(result.daysAnalyzed).toBeGreaterThan(0);
    expect(result.averageDailyDemand).toBeCloseTo(5, 0);
    expect(result.expectedDemandTotal).toBeGreaterThan(20); // ~35 esperado
  });

  it('sugiere reorden cuando stock no cubre demanda proyectada', () => {
    const sales: DailySale[] = [];
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      sales.push({ date: d.toISOString().slice(0, 10), quantity: 10 });
    }
    const result = forecastProduct({
      sales,
      currentStock: 2, // muy poco
      minStock: 20,
      referenceDate: today,
      horizonDays: 7,
    });
    expect(result.status).toBe('reorder');
    expect(result.suggestedOrder).toBeGreaterThan(0);
  });

  it('detecta tendencia creciente', () => {
    const sales: DailySale[] = [];
    for (let i = 0; i < 14; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - (13 - i));
      sales.push({
        date: d.toISOString().slice(0, 10),
        quantity: 1 + i, // 1, 2, 3, ..., 14
      });
    }
    const result = forecastProduct({
      sales,
      currentStock: 100,
      minStock: 5,
      referenceDate: today,
    });
    expect(result.trend).toBeGreaterThan(0);
  });

  it('proyección tiene horizon días', () => {
    const sales: DailySale[] = Array.from({ length: 10 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (10 - i));
      return { date: d.toISOString().slice(0, 10), quantity: 3 };
    });
    const result = forecastProduct({
      sales,
      currentStock: 50,
      minStock: 5,
      referenceDate: today,
      horizonDays: 10,
    });
    expect(result.projection).toHaveLength(10);
  });

  it('suggestedOrder nunca es negativo', () => {
    const sales: DailySale[] = [
      { date: '2026-04-20', quantity: 1 },
    ];
    const result = forecastProduct({
      sales,
      currentStock: 9999,
      minStock: 5,
      referenceDate: today,
    });
    expect(result.suggestedOrder).toBe(0);
    expect(result.status).toBe('ok');
  });
});
