'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Boxes,
  LineChart as LineChartIcon,
  PackageCheck,
  ReceiptText,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/use-auth';
import { useDashboardData, type Period } from '@/hooks/use-dashboard-data';
import { money, toDateLabel } from '@/lib/utils';

function buildTrendPoints(salesByPeriod: Array<{ label: string; value: number }> | undefined) {
  if (!salesByPeriod?.length) return [];
  return salesByPeriod.map((p) => ({ label: toDateLabel(p.label), value: p.value }));
}

function linePath(points: Array<{ value: number }>) {
  if (points.length < 2) return '';
  const max = Math.max(...points.map((p) => p.value), 1);
  return points
    .map((p, i) => {
      const x = (i / (points.length - 1)) * 100;
      const y = 100 - (p.value / max) * 70 - 15;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

export default function DashboardPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const { products, sales, reports, forecast, isLoading, period, setPeriod } =
    useDashboardData(accessToken);

  const trendPoints = useMemo(() => buildTrendPoints(reports?.salesByPeriod), [reports]);

  const totalStock = useMemo(
    () => products.reduce((sum, p) => sum + p.currentStock, 0),
    [products],
  );
  const salesToday = useMemo(
    () =>
      sales
        .filter((s) => s.soldAt.slice(0, 10) === new Date().toISOString().slice(0, 10))
        .reduce((sum, s) => sum + s.total, 0),
    [sales],
  );
  const inventoryValue =
    reports?.summary.inventoryValue ??
    products.reduce((sum, p) => sum + p.currentStock * p.unitPrice, 0);
  const lowStockProducts =
    reports?.lowStockProducts ?? products.filter((p) => p.currentStock <= p.minStock);

  const topProducts = useMemo(() => {
    if (reports?.topProducts) return reports.topProducts.slice(0, 5);
    const totals = new Map<string, number>();
    for (const sale of sales) {
      totals.set(sale.productId, (totals.get(sale.productId) ?? 0) + sale.quantity);
    }
    return [...totals.entries()]
      .map(([productId, quantity]) => ({
        productId,
        name: products.find((p) => p.id === productId)?.name ?? 'Producto',
        quantity,
        total: 0,
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);
  }, [reports, products, sales]);

  const recommendations = forecast.slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Panel principal
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Resumen del negocio</h1>
        </div>
        <div className="flex items-center gap-2">
          <Select value={period} onValueChange={(value) => setPeriod(value as Period)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoy</SelectItem>
              <SelectItem value="7d">7 días</SelectItem>
              <SelectItem value="30d">30 días</SelectItem>
              <SelectItem value="90d">90 días</SelectItem>
            </SelectContent>
          </Select>
          <Button asChild>
            <Link href="/operaciones?tab=sale">
              <ReceiptText className="mr-2 size-4" />
              Nueva venta
            </Link>
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Ventas hoy"
          value={isLoading ? null : money(salesToday)}
          icon={<TrendingUp className="size-4" />}
        />
        <KpiCard
          label="Stock total"
          value={isLoading ? null : `${totalStock} u`}
          icon={<Boxes className="size-4" />}
        />
        <KpiCard
          label="Valor inventario"
          value={isLoading ? null : money(inventoryValue)}
          icon={<PackageCheck className="size-4" />}
        />
        <KpiCard
          label="Alertas de stock"
          value={isLoading ? null : `${lowStockProducts.length}`}
          icon={<TriangleAlert className="size-4" />}
          intent={lowStockProducts.length > 0 ? 'warning' : 'default'}
        />
      </div>

      {/* Chart + alerts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <LineChartIcon className="size-4" /> Tendencia de ventas
                </CardTitle>
                <CardDescription>Evolución en el período seleccionado</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[240px] w-full" />
            ) : trendPoints.length >= 2 ? (
              <div className="space-y-2">
                <svg viewBox="0 0 100 100" className="h-[240px] w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.35" />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path
                    d={`${linePath(trendPoints)} L 100 100 L 0 100 Z`}
                    fill="url(#chartGrad)"
                  />
                  <path
                    d={linePath(trendPoints)}
                    fill="none"
                    stroke="var(--color-primary)"
                    strokeWidth="1.2"
                    vectorEffect="non-scaling-stroke"
                  />
                </svg>
                <div className="grid grid-cols-7 gap-2 text-xs text-muted-foreground">
                  {trendPoints.map((p) => (
                    <span key={p.label} className="truncate text-center">
                      {p.label}
                    </span>
                  ))}
                </div>
              </div>
            ) : (
              <EmptyState
                title="Todavía no hay ventas"
                description="Las ventas que registres van a aparecer acá con su tendencia."
              />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4" />
              Stock bajo
            </CardTitle>
            <CardDescription>Productos que requieren atención</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : lowStockProducts.length === 0 ? (
              <EmptyState title="Todo en orden" description="Ningún producto bajo el mínimo." />
            ) : (
              <ul className="divide-y">
                {lowStockProducts.slice(0, 6).map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between gap-3 py-2 text-sm"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="tabular-nums text-destructive">
                      {p.currentStock}/{p.minStock}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top products + recommendations */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos más vendidos</CardTitle>
            <CardDescription>Ranking por unidades en el período</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : topProducts.length === 0 ? (
              <EmptyState title="Sin datos" description="Todavía no hay ventas en el período." />
            ) : (
              <ol className="space-y-1">
                {topProducts.map((item, i) => (
                  <li
                    key={item.productId}
                    className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
                  >
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                      {i + 1}
                    </span>
                    <span className="flex-1 truncate font-medium">{item.name}</span>
                    <span className="tabular-nums text-muted-foreground">
                      {item.quantity} u
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Recomendaciones de compra</CardTitle>
                <CardDescription>Productos a reabastecer</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/operaciones?tab=inventory">
                  Ver todo
                  <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            ) : recommendations.length === 0 ? (
              <EmptyState
                title="Sin alertas"
                description="No hay productos por reabastecer ahora."
              />
            ) : (
              <ul className="space-y-2">
                {recommendations.map((r) => (
                  <li
                    key={r.id}
                    className="flex items-center justify-between gap-3 rounded-md border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{r.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Vendidas 30d: <span className="tabular-nums">{r.soldLast30Days}</span> ·
                        Stock: <span className="tabular-nums">{r.currentStock}</span>
                      </p>
                    </div>
                    {r.status === 'reorder' ? (
                      <span className="rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary tabular-nums">
                        Pedir {r.suggestedOrder}
                      </span>
                    ) : (
                      <span className="text-xs text-muted-foreground">OK</span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  intent = 'default',
}: {
  label: string;
  value: string | null;
  icon: React.ReactNode;
  intent?: 'default' | 'warning';
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <span
            className={
              intent === 'warning'
                ? 'flex size-8 items-center justify-center rounded-md bg-destructive/10 text-destructive'
                : 'flex size-8 items-center justify-center rounded-md bg-primary/10 text-primary'
            }
          >
            {icon}
          </span>
        </div>
        <div className="mt-2">
          {value === null ? (
            <Skeleton className="h-8 w-24" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 py-6 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}
