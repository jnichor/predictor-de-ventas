'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  HelpCircle,
  Minus,
  Sparkles,
  TrendingUp,
  TriangleAlert,
} from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ForecastChart } from '@/components/charts/forecast-chart';
import { EmptyState } from '@/components/empty-state';
import { useAuth } from '@/hooks/use-auth';
import { money } from '@/lib/utils';

type ProjectionPoint = { date: string; dayOfWeek: number; expected: number };

type Recommendation = {
  id: string;
  name: string;
  barcode: string;
  currentStock: number;
  minStock: number;
  unitPrice: number;
  soldLast30Days: number;
  averageDailyDemand: number;
  smoothedDemand: number;
  trend: number;
  dayOfWeekFactors: number[];
  projection: ProjectionPoint[];
  expectedDemandTotal: number;
  projectedNeed: number;
  safetyStock: number;
  suggestedOrder: number;
  status: 'reorder' | 'ok' | 'no-data';
  daysAnalyzed: number;
};

type HistoryPoint = { date: string; quantity: number };

const DAY_LABELS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export default function PrediccionPage() {
  const { session } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [horizon, setHorizon] = useState<number>(7);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [historyCache, setHistoryCache] = useState<Map<string, HistoryPoint[]>>(new Map());

  const loadForecast = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const response = await fetch(`/api/forecast?horizon=${horizon}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        const recs = Array.isArray(data.recommendations) ? data.recommendations : [];
        setRecommendations(recs);
        if (recs.length > 0 && !selectedId) setSelectedId(recs[0].id);
      }
    } catch (error) {
      console.error('loadForecast', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, horizon, selectedId]);

  useEffect(() => {
    void loadForecast();
  }, [loadForecast]);

  // Carga historia de ventas del producto seleccionado para el chart
  const loadHistory = useCallback(
    async (productId: string) => {
      if (historyCache.has(productId) || !accessToken) return;
      try {
        const response = await fetch(`/api/sales`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        if (!response.ok) return;
        const data = await response.json();
        const productSales = (data.sales ?? []).filter((s: { productId: string }) => s.productId === productId);
        const byDate = new Map<string, number>();
        for (const s of productSales as Array<{ soldAt: string; quantity: number; voidedAt: string | null }>) {
          if (s.voidedAt) continue;
          const date = s.soldAt.slice(0, 10);
          byDate.set(date, (byDate.get(date) ?? 0) + s.quantity);
        }
        const history: HistoryPoint[] = Array.from(byDate.entries())
          .map(([date, quantity]) => ({ date, quantity }))
          .sort((a, b) => a.date.localeCompare(b.date))
          .slice(-30);
        setHistoryCache((m) => new Map(m).set(productId, history));
      } catch (error) {
        console.error('loadHistory', error);
      }
    },
    [accessToken, historyCache],
  );

  useEffect(() => {
    if (selectedId) void loadHistory(selectedId);
  }, [selectedId, loadHistory]);

  const selected = useMemo(
    () => recommendations.find((r) => r.id === selectedId),
    [recommendations, selectedId],
  );
  const selectedHistory = selectedId ? historyCache.get(selectedId) ?? [] : [];

  if (!accessToken) return null;

  const reorderCount = recommendations.filter((r) => r.status === 'reorder').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
            Analítica avanzada
          </p>
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Sparkles className="size-6 text-primary" /> Predicción de demanda
          </h1>
          <p className="text-sm text-muted-foreground">
            Proyección con estacionalidad por día de semana, EWMA y tendencia lineal.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={String(horizon)} onValueChange={(v) => setHorizon(Number(v))}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Próximos 7 días</SelectItem>
              <SelectItem value="14">Próximos 14 días</SelectItem>
              <SelectItem value="30">Próximos 30 días</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <Accordion type="single" collapsible>
          <AccordionItem value="help" className="border-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <HelpCircle className="size-4 text-primary" />
                <span className="font-medium">¿Cómo funciona la predicción?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-3 text-sm text-muted-foreground">
                <p>
                  El sistema analiza los últimos <strong className="text-foreground">60 días</strong>{' '}
                  de ventas de cada producto y aplica un algoritmo con 4 componentes:
                </p>
                <ul className="list-disc space-y-1 pl-5">
                  <li>
                    <strong className="text-foreground">Estacionalidad por día de semana</strong>:
                    detecta si el producto vende más los sábados, los lunes, etc.
                  </li>
                  <li>
                    <strong className="text-foreground">EWMA</strong> (Exponential Weighted Moving
                    Average): le da más peso a las ventas recientes que a las antiguas.
                  </li>
                  <li>
                    <strong className="text-foreground">Tendencia lineal</strong>: si el producto
                    está creciendo o bajando en demanda.
                  </li>
                  <li>
                    <strong className="text-foreground">Safety stock dinámico</strong>: buffer
                    basado en la variabilidad de ventas (1.65σ ≈ cobertura del 95%).
                  </li>
                </ul>
                <p>
                  La <strong className="text-foreground">sugerencia de compra</strong> es la
                  cantidad para cubrir la demanda proyectada + safety stock - stock actual.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Lista de recomendaciones */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <TriangleAlert className="size-4" /> Recomendaciones
            </CardTitle>
            <CardDescription>
              {isLoading
                ? 'Analizando...'
                : reorderCount > 0
                  ? `${reorderCount} con pedido sugerido`
                  : 'Todo bajo control'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : recommendations.length === 0 ? (
              <EmptyState
                icon={<Sparkles className="size-5" />}
                title="Sin datos para predecir"
                description="Registrá más ventas para que aparezcan recomendaciones."
              />
            ) : (
              <div className="max-h-[480px] space-y-2 overflow-y-auto pr-1">
                {recommendations.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => setSelectedId(r.id)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selectedId === r.id
                        ? 'border-primary/50 bg-primary/10'
                        : 'border-border hover:bg-accent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{r.name}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
                          Stock: {r.currentStock} · vendidos 30d: {r.soldLast30Days}
                        </p>
                      </div>
                      {r.status === 'reorder' ? (
                        <Badge className="shrink-0 bg-primary/15 text-primary hover:bg-primary/20 tabular-nums">
                          Pedir {r.suggestedOrder}
                        </Badge>
                      ) : r.status === 'no-data' ? (
                        <Badge variant="outline" className="shrink-0">
                          Sin data
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">
                          OK
                        </Badge>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Detalle del seleccionado */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">
              {selected ? selected.name : 'Seleccioná un producto'}
            </CardTitle>
            <CardDescription>
              {selected
                ? `Proyección para los próximos ${horizon} días`
                : 'De la lista izquierda'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selected ? (
              <div className="space-y-5">
                {/* KPI row */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <MiniStat
                    label="Stock actual"
                    value={`${selected.currentStock} u`}
                    sublabel={`mín ${selected.minStock}`}
                  />
                  <MiniStat
                    label="Demanda diaria"
                    value={selected.smoothedDemand.toFixed(1)}
                    sublabel="u/día (EWMA)"
                  />
                  <MiniStat
                    label="Proyectado"
                    value={`${Math.round(selected.expectedDemandTotal)} u`}
                    sublabel={`en ${horizon}d + ${selected.safetyStock} buffer`}
                  />
                  <MiniStat
                    label="Tendencia"
                    value={
                      selected.trend > 0.05
                        ? '↑ creciente'
                        : selected.trend < -0.05
                          ? '↓ cayendo'
                          : '→ estable'
                    }
                    sublabel={`slope ${selected.trend.toFixed(2)}`}
                    intent={selected.trend > 0.05 ? 'positive' : selected.trend < -0.05 ? 'negative' : 'neutral'}
                  />
                </div>

                {/* Chart */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Histórico vs proyección
                  </p>
                  {selectedHistory.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Sin historial suficiente
                    </div>
                  ) : (
                    <ForecastChart
                      history={selectedHistory}
                      projection={selected.projection}
                      className="h-[240px] w-full"
                    />
                  )}
                </div>

                {/* Day factors */}
                <div>
                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                    Factor por día de semana (1.0 = promedio)
                  </p>
                  <div className="grid grid-cols-7 gap-1">
                    {DAY_LABELS.map((day, i) => {
                      const factor = selected.dayOfWeekFactors[i];
                      const intense =
                        factor > 1.2
                          ? 'bg-primary/20 text-primary border-primary/40'
                          : factor < 0.8
                            ? 'bg-muted text-muted-foreground border-border'
                            : 'bg-card border-border';
                      return (
                        <div
                          key={day}
                          className={`rounded-md border p-2 text-center ${intense}`}
                        >
                          <div className="text-[10px] uppercase tracking-wider opacity-70">
                            {day}
                          </div>
                          <div className="mt-0.5 text-sm font-semibold tabular-nums">
                            {factor.toFixed(2)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Sugerencia */}
                {selected.status === 'reorder' ? (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4">
                    <div className="flex items-start gap-3">
                      <TrendingUp className="size-5 shrink-0 text-primary" />
                      <div className="flex-1 text-sm">
                        <p className="font-medium text-foreground">
                          Pedir{' '}
                          <span className="text-primary tabular-nums">
                            {selected.suggestedOrder} unidades
                          </span>
                        </p>
                        <p className="mt-1 text-muted-foreground">
                          Cubre {horizon} días proyectados ({Math.round(selected.expectedDemandTotal)} u) +
                          buffer de seguridad ({selected.safetyStock} u) - stock actual (
                          {selected.currentStock} u).
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          Valor aproximado del pedido:{' '}
                          <span className="tabular-nums text-foreground">
                            {money(selected.suggestedOrder * selected.unitPrice)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                ) : selected.status === 'ok' ? (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    ✓ El stock actual cubre la demanda proyectada. Sin necesidad de pedir.
                  </div>
                ) : (
                  <div className="rounded-lg border p-4 text-sm text-muted-foreground">
                    Sin datos suficientes para una predicción confiable. Registrá más ventas.
                  </div>
                )}
              </div>
            ) : (
              <EmptyState
                icon={<Sparkles className="size-5" />}
                title="Seleccioná un producto"
                description="La proyección detallada aparece acá."
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  sublabel,
  intent = 'neutral',
}: {
  label: string;
  value: string;
  sublabel?: string;
  intent?: 'neutral' | 'positive' | 'negative';
}) {
  const color =
    intent === 'positive'
      ? 'text-primary'
      : intent === 'negative'
        ? 'text-destructive'
        : 'text-foreground';
  const Icon = intent === 'positive' ? ArrowUp : intent === 'negative' ? ArrowDown : Minus;
  return (
    <div className="rounded-lg border bg-card/60 p-3">
      <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 flex items-center gap-1 text-lg font-semibold tabular-nums ${color}`}>
        {intent !== 'neutral' ? <Icon className="size-4" /> : null}
        {value}
      </p>
      {sublabel ? (
        <p className="text-[10px] text-muted-foreground tabular-nums">{sublabel}</p>
      ) : null}
    </div>
  );
}
