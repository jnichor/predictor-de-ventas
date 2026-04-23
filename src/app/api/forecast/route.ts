import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/supabase/auth';
import { parsePeriod } from '@/lib/schemas';
import { forecastProduct, type DailySale } from '@/lib/forecasting';

export async function GET(request: Request) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const period = parsePeriod(request, '30d');
  const url = new URL(request.url);
  const horizonDays = Math.min(
    30,
    Math.max(1, Number(url.searchParams.get('horizon') ?? '7')),
  );
  const productId = url.searchParams.get('productId'); // para forecast detallado de uno solo

  // Ventana de análisis histórica: 60 días siempre (el algoritmo internamente limita)
  const since = new Date();
  since.setDate(since.getDate() - 60);

  let salesQuery = auth.supabase
    .from('sales')
    .select('product_id, quantity, sold_at, voided_at')
    .gte('sold_at', since.toISOString())
    .is('voided_at', null) // excluir ventas anuladas
    .order('sold_at', { ascending: true });

  if (productId) {
    salesQuery = salesQuery.eq('product_id', productId);
  }

  const [productsResult, salesResult] = await Promise.all([
    auth.supabase
      .from('products')
      .select('id, name, current_stock, min_stock, unit_price, active, barcode')
      .eq('active', true),
    salesQuery,
  ]);

  if (productsResult.error || salesResult.error) {
    return NextResponse.json(
      {
        error:
          productsResult.error?.message ?? salesResult.error?.message ?? 'Unknown error',
      },
      { status: 500 },
    );
  }

  const products = productsResult.data ?? [];
  const sales = salesResult.data ?? [];

  // Agrupar ventas por producto + fecha (YYYY-MM-DD)
  const byProduct = new Map<string, DailySale[]>();
  for (const sale of sales) {
    const date = sale.sold_at.slice(0, 10);
    const arr = byProduct.get(sale.product_id) ?? [];
    // Consolidar ventas del mismo día en una sola entrada
    const existing = arr.find((s) => s.date === date);
    if (existing) {
      existing.quantity += Number(sale.quantity);
    } else {
      arr.push({ date, quantity: Number(sale.quantity) });
    }
    byProduct.set(sale.product_id, arr);
  }

  // Forecast por producto
  const today = new Date();
  const recommendations = products.map((product) => {
    const productSales = byProduct.get(product.id) ?? [];
    const forecast = forecastProduct({
      sales: productSales,
      currentStock: Number(product.current_stock),
      minStock: Number(product.min_stock),
      horizonDays,
      referenceDate: today,
    });

    return {
      id: product.id,
      name: product.name,
      barcode: product.barcode,
      currentStock: Number(product.current_stock),
      minStock: Number(product.min_stock),
      unitPrice: Number(product.unit_price),
      soldLast30Days: productSales
        .filter((s) => {
          const d = new Date(s.date + 'T00:00:00Z');
          const thirtyAgo = new Date();
          thirtyAgo.setDate(thirtyAgo.getDate() - 30);
          return d >= thirtyAgo;
        })
        .reduce((sum, s) => sum + s.quantity, 0),
      averageDailyDemand: forecast.averageDailyDemand,
      smoothedDemand: forecast.smoothedDemand,
      trend: forecast.trend,
      dayOfWeekFactors: forecast.dayOfWeekFactors,
      projection: forecast.projection,
      expectedDemandTotal: forecast.expectedDemandTotal,
      projectedNeed: Math.ceil(forecast.expectedDemandTotal),
      safetyStock: forecast.safetyStock,
      suggestedOrder: forecast.suggestedOrder,
      status: forecast.status,
      daysAnalyzed: forecast.daysAnalyzed,
    };
  });

  // Ordenar: los que requieren reorden primero, por mayor urgencia
  recommendations.sort((a, b) => {
    if (a.status === 'reorder' && b.status !== 'reorder') return -1;
    if (b.status === 'reorder' && a.status !== 'reorder') return 1;
    return b.suggestedOrder - a.suggestedOrder;
  });

  // Si se pidió un productId específico, devolvemos sólo ese (con detalle completo)
  if (productId) {
    const single = recommendations.find((r) => r.id === productId);
    return NextResponse.json({ recommendation: single ?? null });
  }

  return NextResponse.json({
    period,
    horizonDays,
    recommendations: recommendations.slice(0, 20), // topN
    generatedAt: today.toISOString(),
  });
}
