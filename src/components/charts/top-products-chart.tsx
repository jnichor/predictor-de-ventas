'use client';

import { Bar, BarChart, CartesianGrid, Cell, LabelList, XAxis, YAxis } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

type TopProduct = {
  productId: string;
  name: string;
  quantity: number;
  total: number;
};

type TopProductsChartProps = {
  data: TopProduct[];
  metric?: 'quantity' | 'total';
  className?: string;
};

const chartConfig = {
  value: {
    label: 'Valor',
    color: 'var(--color-chart-1)',
  },
} satisfies ChartConfig;

// Rotamos entre los 5 colores vibrantes del tema
const PALETTE = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
];

export function TopProductsChart({
  data,
  metric = 'quantity',
  className,
}: TopProductsChartProps) {
  const formatted = data.slice(0, 8).map((p) => ({
    name: p.name.length > 24 ? `${p.name.slice(0, 22)}…` : p.name,
    value: metric === 'quantity' ? p.quantity : p.total,
  }));

  const isCurrency = metric === 'total';
  const formatValue = (v: number) =>
    isCurrency ? `S/ ${v.toFixed(0)}` : String(v);

  return (
    <ChartContainer config={chartConfig} className={className}>
      <BarChart
        data={formatted}
        layout="vertical"
        margin={{ left: 8, right: 36, top: 8, bottom: 0 }}
      >
        <CartesianGrid
          horizontal={false}
          strokeDasharray="3 3"
          stroke="hsl(215 28% 40% / 0.25)"
        />
        <XAxis
          type="number"
          tickLine={false}
          axisLine={false}
          tickFormatter={formatValue}
          stroke="hsl(215 20% 65%)"
          fontSize={11}
        />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={{ fontSize: 12, fill: 'hsl(215 20% 75%)' }}
        />
        <ChartTooltip
          cursor={{ fill: 'hsl(215 28% 40% / 0.15)' }}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value) => formatValue(Number(value))}
            />
          }
        />
        <Bar dataKey="value" radius={[0, 6, 6, 0]}>
          {formatted.map((_, i) => (
            <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
          ))}
          <LabelList
            dataKey="value"
            position="right"
            formatter={formatValue}
            className="fill-foreground text-xs tabular-nums font-medium"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
