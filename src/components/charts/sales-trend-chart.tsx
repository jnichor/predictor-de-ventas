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
    color: 'var(--color-primary)',
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
            <stop offset="5%" stopColor="var(--color-total)" stopOpacity={0.3} />
            <stop offset="95%" stopColor="var(--color-total)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={24}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          width={52}
          tickFormatter={formatCurrencyShort}
        />
        <ChartTooltip
          cursor={{ strokeDasharray: '3 3' }}
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
          stroke="var(--color-total)"
          strokeWidth={2}
          fill="url(#salesGradient)"
        />
      </AreaChart>
    </ChartContainer>
  );
}
