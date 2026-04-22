import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/auth';

export async function GET(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(request.url);
  const period = url.searchParams.get('period') ?? '7d';

  const days = period === '30d' ? 30 : period === '90d' ? 90 : period === 'today' ? 1 : 7;
  const since = new Date();
  since.setDate(since.getDate() - days);

  const [salesResult, productsResult] = await Promise.all([
    adminSupabase
      .from('sales')
      .select('id, product_id, quantity, total, sold_at')
      .gte('sold_at', since.toISOString())
      .order('sold_at', { ascending: true }),
    adminSupabase.from('products').select('id, name, current_stock, min_stock, unit_price'),
  ]);

  if (salesResult.error || productsResult.error) {
    return NextResponse.json(
      { error: salesResult.error?.message ?? productsResult.error?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }

  const products = productsResult.data ?? [];
  const sales = salesResult.data ?? [];

  const totalSales = sales.reduce((sum, sale) => sum + Number(sale.total), 0);
  const totalUnits = sales.reduce((sum, sale) => sum + Number(sale.quantity), 0);

  const productTotals = new Map<string, { quantity: number; total: number }>();
  for (const sale of sales) {
    const current = productTotals.get(sale.product_id) ?? { quantity: 0, total: 0 };
    current.quantity += Number(sale.quantity);
    current.total += Number(sale.total);
    productTotals.set(sale.product_id, current);
  }

  const topProducts = [...productTotals.entries()]
    .map(([productId, stats]) => ({
      productId,
      name: products.find((product) => product.id === productId)?.name ?? 'Producto',
      quantity: stats.quantity,
      total: stats.total,
    }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);

  const lowStockProducts = products
    .filter((product) => Number(product.current_stock) <= Number(product.min_stock))
    .map((product) => ({
      id: product.id,
      name: product.name,
      currentStock: Number(product.current_stock),
      minStock: Number(product.min_stock),
    }))
    .sort((a, b) => a.currentStock - b.currentStock);

  const dailyTotals = new Map<string, number>();
  for (const sale of sales) {
    const key = sale.sold_at.slice(0, 10);
    dailyTotals.set(key, (dailyTotals.get(key) ?? 0) + Number(sale.total));
  }

  const salesByDay = [...dailyTotals.entries()]
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const salesByPeriod = salesByDay.map((item) => ({
    label: item.date,
    value: item.value,
  }));

  const inventoryValue = products.reduce(
    (sum, product) => sum + Number(product.current_stock) * Number(product.unit_price),
    0,
  );

  return NextResponse.json({
    period,
    summary: {
      totalSales,
      totalUnits,
      inventoryValue,
      lowStockCount: lowStockProducts.length,
    },
    topProducts,
    lowStockProducts,
    salesByDay,
    salesByPeriod,
  });
}
