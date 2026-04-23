'use client';

import { Bar, BarChart, CartesianGrid, LabelList, XAxis, YAxis } from 'recharts';
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
    label: 'Unidades',
    color: 'var(--color-primary)',
  },
} satisfies ChartConfig;

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
        margin={{ left: 8, right: 28, top: 8, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} strokeDasharray="3 3" />
        <XAxis type="number" tickLine={false} axisLine={false} tickFormatter={formatValue} />
        <YAxis
          type="category"
          dataKey="name"
          tickLine={false}
          axisLine={false}
          width={120}
          tick={{ fontSize: 12 }}
        />
        <ChartTooltip
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4 }}
          content={
            <ChartTooltipContent
              indicator="dot"
              formatter={(value) => formatValue(Number(value))}
            />
          }
        />
        <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]}>
          <LabelList
            dataKey="value"
            position="right"
            formatter={formatValue}
            className="fill-foreground text-xs tabular-nums"
          />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
