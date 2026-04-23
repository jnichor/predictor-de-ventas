'use client';

import { Area, AreaChart, CartesianGrid, ReferenceLine, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type ForecastPoint = {
  date: string;
  expected: number;
};

type HistoryPoint = {
  date: string;
  quantity: number;
};

type ForecastChartProps = {
  history: HistoryPoint[];
  projection: ForecastPoint[];
  className?: string;
};

const chartConfig = {
  historical: {
    label: 'Histórico',
    color: 'var(--color-chart-3)',
  },
  projection: {
    label: 'Proyección',
    color: 'var(--color-chart-1)',
  },
} satisfies ChartConfig;

function formatShortDate(iso: string) {
  const d = new Date(iso + 'T00:00:00Z');
  return new Intl.DateTimeFormat('es-PE', { month: 'short', day: 'numeric' }).format(d);
}

export function ForecastChart({ history, projection, className }: ForecastChartProps) {
  // Combinamos historia + proyección en una sola serie, separadas en dos props distintos
  // para poder mostrar estilos distintos (sólido vs punteado).
  const historyMax = history.length > 0 ? history.length - 1 : -1;

  const allData = [
    ...history.map((h, i) => ({
      idx: i,
      label: formatShortDate(h.date),
      historical: h.quantity,
      projection: null as number | null,
    })),
    ...projection.map((p, i) => ({
      idx: history.length + i,
      label: formatShortDate(p.date),
      historical: null as number | null,
      projection: Number(p.expected.toFixed(1)),
    })),
  ];

  // Punto pivot: último dato histórico también en projection para que las líneas se conecten
  if (history.length > 0 && projection.length > 0) {
    const last = history[history.length - 1];
    allData[historyMax].projection = last.quantity;
  }

  return (
    <ChartContainer config={chartConfig} className={className}>
      <AreaChart data={allData} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="histGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-3)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-chart-3)" stopOpacity={0.05} />
          </linearGradient>
          <linearGradient id="projGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.4} />
            <stop offset="100%" stopColor="var(--color-chart-1)" stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(215 28% 40% / 0.25)" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
          stroke="hsl(215 20% 65%)"
          fontSize={11}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={40}
          stroke="hsl(215 20% 65%)"
          fontSize={11}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--color-chart-1)', strokeDasharray: '3 3', strokeOpacity: 0.5 }}
          content={<ChartTooltipContent indicator="dot" />}
        />
        {historyMax >= 0 ? (
          <ReferenceLine
            x={allData[historyMax].label}
            stroke="var(--color-chart-1)"
            strokeDasharray="2 3"
            strokeOpacity={0.6}
            label={{
              value: 'Hoy',
              fill: 'var(--color-chart-1)',
              fontSize: 10,
              position: 'insideTopRight',
            }}
          />
        ) : null}
        <Area
          type="monotone"
          dataKey="historical"
          stroke="var(--color-chart-3)"
          strokeWidth={2}
          fill="url(#histGradient)"
          connectNulls={false}
          dot={{ r: 3, stroke: 'var(--color-chart-3)', fill: 'white', strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="projection"
          stroke="var(--color-chart-1)"
          strokeWidth={2}
          strokeDasharray="5 5"
          fill="url(#projGradient)"
          connectNulls={false}
          dot={{ r: 3, stroke: 'var(--color-chart-1)', fill: 'white', strokeWidth: 2 }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
