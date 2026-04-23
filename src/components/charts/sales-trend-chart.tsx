'use client';

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { toDateLabel } from '@/lib/utils';

type TrendPoint = { label: string; value: number };

type SalesTrendChartProps = {
  data: TrendPoint[];
  className?: string;
};

const chartConfig = {
  total: {
    label: 'Ventas',
    color: 'var(--color-chart-1)',
  },
} satisfies ChartConfig;

function formatCurrencyShort(value: number) {
  if (value >= 1000) return `S/ ${(value / 1000).toFixed(1)}k`;
  return `S/ ${value.toFixed(0)}`;
}

export function SalesTrendChart({ data, className }: SalesTrendChartProps) {
  const formatted = data.map((p) => ({
    label: toDateLabel(p.label),
    total: Number(p.value) || 0,
  }));

  return (
    <ChartContainer config={chartConfig} className={className}>
      <AreaChart data={formatted} margin={{ left: 4, right: 12, top: 8, bottom: 0 }}>
        <defs>
          <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-chart-1)" stopOpacity={0.5} />
            <stop offset="50%" stopColor="var(--color-chart-3)" stopOpacity={0.25} />
            <stop offset="100%" stopColor="var(--color-chart-2)" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="salesStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--color-chart-1)" />
            <stop offset="50%" stopColor="var(--color-chart-3)" />
            <stop offset="100%" stopColor="var(--color-chart-2)" />
          </linearGradient>
        </defs>
        <CartesianGrid
          vertical={false}
          strokeDasharray="3 3"
          stroke="hsl(215 28% 40% / 0.25)"
        />
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
          width={52}
          tickFormatter={formatCurrencyShort}
          stroke="hsl(215 20% 65%)"
          fontSize={11}
        />
        <ChartTooltip
          cursor={{ stroke: 'var(--color-chart-1)', strokeDasharray: '3 3', strokeOpacity: 0.5 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value) => formatCurrencyShort(Number(value))}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="url(#salesStroke)"
          strokeWidth={3}
          fill="url(#salesGradient)"
          dot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-chart-1)', fill: 'white' }}
          activeDot={{
            r: 7,
            strokeWidth: 3,
            stroke: 'var(--color-chart-1)',
            fill: 'white',
            style: { filter: 'drop-shadow(0 0 8px var(--color-chart-1))' },
          }}
        />
      </AreaChart>
    </ChartContainer>
  );
}
