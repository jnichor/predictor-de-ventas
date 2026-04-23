/**
 * Forecasting de demanda con estacionalidad por día de semana.
 *
 * Pipeline:
 *   1. Agrupar ventas por día (en formato YYYY-MM-DD) — sumar cantidad.
 *   2. Calcular day-of-week factors: relación ventas_del_día / promedio_general.
 *      Esto detecta patrones como "los sábados vende 1.5x más que el promedio".
 *   3. EWMA (Exponentially Weighted Moving Average) sobre ventas diarias
 *      desestacionalizadas — da más peso a lo reciente, suavizando el ruido.
 *   4. Tendencia lineal sobre los últimos N días — detecta crecimiento/caída.
 *   5. Proyección: para cada día futuro → base_EWMA * day_factor + tendencia.
 *   6. Safety stock dinámico: buffer basado en variabilidad observada.
 *
 * Todo en TypeScript puro, sin dependencias externas, 100% testeable.
 */

export type DailySale = {
  /** ISO date YYYY-MM-DD */
  date: string;
  /** Unidades vendidas ese día */
  quantity: number;
};

export type ForecastInput = {
  /** Ventas históricas — no necesitan estar ordenadas ni completas */
  sales: DailySale[];
  /** Stock actual del producto */
  currentStock: number;
  /** Stock mínimo (piso de alerta) */
  minStock: number;
  /** Cantidad de días a proyectar — default 7 */
  horizonDays?: number;
  /** Alpha del EWMA (0 < α ≤ 1) — default 0.3. Mayor = más reactivo a cambios recientes. */
  alpha?: number;
  /** Fecha de referencia "hoy" — default new Date() */
  referenceDate?: Date;
};

export type ForecastResult = {
  /** Demanda promedio histórica por día (unidades/día) */
  averageDailyDemand: number;
  /** Demanda suavizada (EWMA) */
  smoothedDemand: number;
  /** Slope de la tendencia — positivo = creciendo, negativo = cayendo */
  trend: number;
  /** Factores multiplicativos por día de semana [dom, lun, mar, mié, jue, vie, sáb] */
  dayOfWeekFactors: number[];
  /** Proyección día por día para los próximos horizonDays */
  projection: Array<{ date: string; dayOfWeek: number; expected: number }>;
  /** Total esperado en el horizonte */
  expectedDemandTotal: number;
  /** Safety stock sugerido (buffer) */
  safetyStock: number;
  /** Unidades sugeridas a pedir (nunca negativo) */
  suggestedOrder: number;
  /** Status del resultado */
  status: 'reorder' | 'ok' | 'no-data';
  /** Días de data efectiva usados */
  daysAnalyzed: number;
};

const DAYS = 7;

function toDateKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Genera un array de fechas consecutivas (YYYY-MM-DD) desde `start` hasta `end` inclusive.
 * Trabaja en UTC para evitar problemas de zona horaria.
 */
function generateDateRange(start: Date, end: Date): string[] {
  const out: string[] = [];
  const cur = new Date(Date.UTC(
    start.getUTCFullYear(),
    start.getUTCMonth(),
    start.getUTCDate(),
  ));
  const endKey = toDateKey(end);
  while (toDateKey(cur) <= endKey) {
    out.push(toDateKey(cur));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/**
 * Completa días sin ventas con quantity=0 para que la serie no tenga huecos.
 */
export function fillMissingDays(
  sales: DailySale[],
  from: Date,
  to: Date,
): DailySale[] {
  const byDate = new Map<string, number>();
  for (const s of sales) {
    byDate.set(s.date, (byDate.get(s.date) ?? 0) + s.quantity);
  }
  const dates = generateDateRange(from, to);
  return dates.map((date) => ({ date, quantity: byDate.get(date) ?? 0 }));
}

/**
 * Calcula factores multiplicativos por día de semana.
 * Si un día de la semana no tiene datos, usa factor = 1 (neutral).
 */
export function calculateDayOfWeekFactors(sales: DailySale[]): number[] {
  if (sales.length === 0) return new Array(DAYS).fill(1);

  const totals = new Array(DAYS).fill(0);
  const counts = new Array(DAYS).fill(0);

  for (const s of sales) {
    const dow = new Date(s.date + 'T00:00:00Z').getUTCDay();
    totals[dow] += s.quantity;
    counts[dow] += 1;
  }

  const averages = totals.map((t, i) => (counts[i] > 0 ? t / counts[i] : 0));
  const overallMean = averages.reduce((a, b) => a + b, 0) / DAYS;

  if (overallMean === 0) return new Array(DAYS).fill(1);

  return averages.map((avg) => (avg === 0 ? 1 : avg / overallMean));
}

/**
 * Exponentially Weighted Moving Average.
 * S_t = α * x_t + (1 - α) * S_{t-1}
 */
export function calculateEWMA(values: number[], alpha = 0.3): number {
  if (values.length === 0) return 0;
  let s = values[0];
  for (let i = 1; i < values.length; i++) {
    s = alpha * values[i] + (1 - alpha) * s;
  }
  return s;
}

/**
 * Regresión lineal simple sobre una serie — devuelve la pendiente (slope).
 * Positivo = ventas creciendo, negativo = cayendo.
 */
export function calculateTrend(values: number[]): number {
  const n = values.length;
  if (n < 2) return 0;

  const xMean = (n - 1) / 2;
  const yMean = values.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (i - xMean) * (values[i] - yMean);
    den += (i - xMean) ** 2;
  }

  return den === 0 ? 0 : num / den;
}

/**
 * Desviación estándar — usada para safety stock dinámico.
 */
function stdDev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance =
    values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

/**
 * Desestacionaliza una serie dividiendo cada valor por su factor de día de semana.
 */
function deseasonalize(sales: DailySale[], factors: number[]): number[] {
  return sales.map((s) => {
    const dow = new Date(s.date + 'T00:00:00Z').getUTCDay();
    const factor = factors[dow];
    return factor === 0 ? s.quantity : s.quantity / factor;
  });
}

/**
 * Genera el pronóstico completo para un producto.
 */
export function forecastProduct(input: ForecastInput): ForecastResult {
  const {
    sales,
    currentStock,
    minStock,
    horizonDays = 7,
    alpha = 0.3,
    referenceDate = new Date(),
  } = input;

  // Normalizamos "today" a UTC midnight para cálculos consistentes
  const today = new Date(Date.UTC(
    referenceDate.getUTCFullYear(),
    referenceDate.getUTCMonth(),
    referenceDate.getUTCDate(),
  ));

  // Ventana de análisis: hasta 60 días hacia atrás
  const analysisWindow = 60;
  const from = new Date(today);
  from.setUTCDate(from.getUTCDate() - analysisWindow);

  // Filtramos a la ventana de análisis y rellenamos días sin ventas con 0
  const filteredSales = sales.filter((s) => {
    const d = new Date(s.date + 'T00:00:00Z');
    return d >= from && d <= today;
  });

  const dense = fillMissingDays(filteredSales, from, today);

  if (dense.length === 0 || dense.every((s) => s.quantity === 0)) {
    return {
      averageDailyDemand: 0,
      smoothedDemand: 0,
      trend: 0,
      dayOfWeekFactors: new Array(DAYS).fill(1),
      projection: [],
      expectedDemandTotal: 0,
      safetyStock: minStock,
      suggestedOrder: Math.max(minStock * 2 - currentStock, 0),
      status: currentStock <= minStock ? 'reorder' : 'no-data',
      daysAnalyzed: 0,
    };
  }

  const averageDailyDemand =
    dense.reduce((sum, s) => sum + s.quantity, 0) / dense.length;

  const dayOfWeekFactors = calculateDayOfWeekFactors(dense);
  const deseasonalized = deseasonalize(dense, dayOfWeekFactors);
  const smoothedDemand = calculateEWMA(deseasonalized, alpha);
  const trend = calculateTrend(deseasonalized.slice(-14)); // tendencia de las últimas 2 semanas

  // Proyección día por día
  const projection: Array<{ date: string; dayOfWeek: number; expected: number }> = [];
  for (let i = 1; i <= horizonDays; i++) {
    const future = new Date(today);
    future.setUTCDate(future.getUTCDate() + i);
    const dow = future.getUTCDay();
    const baseDemand = smoothedDemand + trend * i;
    const expected = Math.max(0, baseDemand * dayOfWeekFactors[dow]);
    projection.push({
      date: toDateKey(future),
      dayOfWeek: dow,
      expected: Number(expected.toFixed(2)),
    });
  }

  const expectedDemandTotal = projection.reduce((sum, p) => sum + p.expected, 0);

  // Safety stock: 1.65σ (≈95% de cobertura) durante el horizonte
  const sigma = stdDev(deseasonalized);
  const safetyStock = Math.max(
    Math.ceil(1.65 * sigma * Math.sqrt(horizonDays)),
    minStock,
  );

  const rawNeed = expectedDemandTotal + safetyStock - currentStock;
  const suggestedOrder = Math.max(0, Math.ceil(rawNeed));

  return {
    averageDailyDemand: Number(averageDailyDemand.toFixed(2)),
    smoothedDemand: Number(smoothedDemand.toFixed(2)),
    trend: Number(trend.toFixed(3)),
    dayOfWeekFactors: dayOfWeekFactors.map((f) => Number(f.toFixed(2))),
    projection,
    expectedDemandTotal: Number(expectedDemandTotal.toFixed(2)),
    safetyStock,
    suggestedOrder,
    status: suggestedOrder > 0 ? 'reorder' : 'ok',
    daysAnalyzed: dense.length,
  };
}
