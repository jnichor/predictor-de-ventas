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
import { SalesTrendChart } from '@/components/charts/sales-trend-chart';
import { VibrantKpiCard } from '@/components/charts/vibrant-kpi-card';
import { DashboardHero } from '@/components/dashboard-hero';
import { EmptyState } from '@/components/empty-state';
import { OnboardingBanner } from '@/components/onboarding-banner';
import { useAuth } from '@/hooks/use-auth';
import { useDashboardData, type Period } from '@/hooks/use-dashboard-data';
import { money } from '@/lib/utils';

export default function DashboardPage() {
  const { session, currentUser } = useAuth();
  const accessToken = session?.access_token ?? null;
  const { products, sales, movements, reports, forecast, isLoading, period, setPeriod } =
    useDashboardData(accessToken);

  const trendPoints = useMemo(() => reports?.salesByPeriod ?? [], [reports]);

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
      {/* Hero dark con gradient — estilo Job Dashboard */}
      <DashboardHero userName={currentUser?.name} />

      {/* Controles bajo el hero: period + acción rápida */}
      <div className="flex flex-wrap items-center justify-end gap-2">
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
          <Link href="/ventas">
            <ReceiptText className="mr-2 size-4" />
            Nueva venta
          </Link>
        </Button>
      </div>

      {/* Onboarding — solo visible para admin con estado incompleto */}
      {currentUser?.role === 'admin' && !isLoading ? (
        <OnboardingBanner
          hasProducts={products.length > 0}
          hasStock={products.some((p) => p.currentStock > 0) || movements.length > 0}
          hasSales={sales.length > 0}
        />
      ) : null}

      {/* KPIs — estilo dashboard vibrante */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {isLoading ? (
          <>
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
            <Skeleton className="h-32 rounded-xl" />
          </>
        ) : (
          <>
            <VibrantKpiCard
              label="Ventas hoy"
              value={money(salesToday)}
              icon={<TrendingUp className="size-4" />}
              variant="pink"
              progress={Math.min(100, (salesToday / Math.max(salesToday + 1, 1)) * 100)}
              progressLabel="del día"
            />
            <VibrantKpiCard
              label="Stock total"
              value={`${totalStock} u`}
              icon={<Boxes className="size-4" />}
              variant="emerald"
              progress={lowStockProducts.length > 0 && products.length > 0
                ? Math.max(
                    0,
                    100 - (lowStockProducts.length / products.length) * 100,
                  )
                : 100}
              progressLabel="saludable"
            />
            <VibrantKpiCard
              label="Valor inventario"
              value={money(inventoryValue)}
              icon={<PackageCheck className="size-4" />}
              variant="purple"
            />
            <VibrantKpiCard
              label="Alertas stock"
              value={`${lowStockProducts.length}`}
              icon={<TriangleAlert className="size-4" />}
              variant={lowStockProducts.length > 0 ? 'amber' : 'sky'}
              progress={products.length > 0
                ? (lowStockProducts.length / products.length) * 100
                : 0}
              progressLabel="crítico"
            />
          </>
        )}
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
              <SalesTrendChart data={trendPoints} className="h-[240px] w-full" />
            ) : (
              <EmptyState
                icon={<LineChartIcon className="size-5" />}
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
              <EmptyState
                icon={<PackageCheck className="size-5" />}
                title="Todo en orden"
                description="Ningún producto bajo el mínimo."
              />
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
              <EmptyState
                icon={<TrendingUp className="size-5" />}
                title="Sin datos"
                description="Todavía no hay ventas en el período."
              />
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
                <Link href="/prediccion">
                  Ver análisis
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
                icon={<PackageCheck className="size-5" />}
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


