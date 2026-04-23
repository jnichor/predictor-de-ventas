'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { BarChart3, LineChart as LineChartIcon, Package, TriangleAlert, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { SalesTrendChart } from '@/components/charts/sales-trend-chart';
import { TopProductsChart } from '@/components/charts/top-products-chart';
import { EmptyState } from '@/components/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { money } from '@/lib/utils';

type Period = 'today' | '7d' | '30d' | '90d';

type ReportSummary = {
  summary: {
    totalSales: number;
    totalUnits?: number;
    inventoryValue: number;
    lowStockCount?: number;
  };
  topProducts: Array<{ productId: string; name: string; quantity: number; total: number }>;
  lowStockProducts: Array<{ id: string; name: string; currentStock: number; minStock: number }>;
  salesByPeriod?: Array<{ label: string; value: number }>;
};

export default function ReportesPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [period, setPeriod] = useState<Period>('30d');
  const [data, setData] = useState<ReportSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadReport = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports?period=${period}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const json = await response.json();
        setData(json);
      }
    } catch (error) {
      console.error('reportes loadReport', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, period]);

  useEffect(() => {
    void loadReport();
  }, [loadReport]);

  const totalUnits = data?.summary.totalUnits ?? 0;
  const totalSales = data?.summary.totalSales ?? 0;
  const inventoryValue = data?.summary.inventoryValue ?? 0;
  const lowStockCount = data?.summary.lowStockCount ?? data?.lowStockProducts?.length ?? 0;

  const topProducts = useMemo(() => data?.topProducts ?? [], [data]);
  const lowStockProducts = useMemo(() => data?.lowStockProducts ?? [], [data]);
  const salesByPeriod = useMemo(() => data?.salesByPeriod ?? [], [data]);

  if (!accessToken) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Analítica
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">Reportes</h1>
          <p className="text-sm text-muted-foreground">
            Métricas del negocio en el período seleccionado.
          </p>
        </div>
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="today">Hoy</SelectItem>
            <SelectItem value="7d">Últimos 7 días</SelectItem>
            <SelectItem value="30d">Últimos 30 días</SelectItem>
            <SelectItem value="90d">Últimos 90 días</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Ventas totales"
          value={isLoading ? null : money(totalSales)}
          icon={<TrendingUp className="size-4" />}
        />
        <SummaryCard
          label="Unidades vendidas"
          value={isLoading ? null : `${totalUnits}`}
          icon={<BarChart3 className="size-4" />}
        />
        <SummaryCard
          label="Valor inventario"
          value={isLoading ? null : money(inventoryValue)}
          icon={<Package className="size-4" />}
        />
        <SummaryCard
          label="Alertas de stock"
          value={isLoading ? null : `${lowStockCount}`}
          icon={<TriangleAlert className="size-4" />}
          intent={lowStockCount > 0 ? 'warning' : 'default'}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <LineChartIcon className="size-4" /> Tendencia de ventas
          </CardTitle>
          <CardDescription>Monto vendido día por día en el período</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-[280px] w-full" />
          ) : salesByPeriod.length >= 2 ? (
            <SalesTrendChart data={salesByPeriod} className="h-[280px] w-full" />
          ) : (
            <EmptyState
              icon={<LineChartIcon className="size-5" />}
              title="Sin ventas en el período"
              description="Probá ampliar el rango o registrá más ventas."
            />
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Productos más vendidos</CardTitle>
            <CardDescription>Por unidades o por monto</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-[280px] w-full" />
            ) : topProducts.length === 0 ? (
              <EmptyState
                icon={<BarChart3 className="size-5" />}
                title="Sin datos"
                description="No hay ventas en el período."
              />
            ) : (
              <Tabs defaultValue="quantity" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="quantity">Por unidades</TabsTrigger>
                  <TabsTrigger value="total">Por monto</TabsTrigger>
                </TabsList>
                <TabsContent value="quantity">
                  <TopProductsChart
                    data={topProducts}
                    metric="quantity"
                    className="h-[260px] w-full"
                  />
                </TabsContent>
                <TabsContent value="total">
                  <TopProductsChart
                    data={topProducts}
                    metric="total"
                    className="h-[260px] w-full"
                  />
                </TabsContent>
              </Tabs>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Stock bajo</CardTitle>
            <CardDescription>Productos que requieren reabastecimiento</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeletons />
            ) : lowStockProducts.length === 0 ? (
              <EmptyState
                icon={<Package className="size-5" />}
                title="Todo en orden"
                description="No hay productos bajo el mínimo."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Producto</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Mínimo</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell className="text-right font-medium text-destructive tabular-nums">
                        {p.currentStock}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {p.minStock}
                      </TableCell>
                      <TableCell>
                        <Badge variant="destructive">Crítico</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function SummaryCard({
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

function Skeletons() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

