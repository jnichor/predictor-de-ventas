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
  const period = url.searchParams.get('period') ?? '30d';
  const days = period === '7d' ? 7 : period === '90d' ? 90 : period === 'today' ? 1 : 30;

  const since = new Date();
  since.setDate(since.getDate() - days);

  const [productsResult, salesResult] = await Promise.all([
    adminSupabase.from('products').select('id, name, current_stock, min_stock, unit_price'),
    adminSupabase
      .from('sales')
      .select('product_id, quantity, sold_at')
      .gte('sold_at', since.toISOString())
      .order('sold_at', { ascending: false }),
  ]);

  if (productsResult.error || salesResult.error) {
    return NextResponse.json(
      { error: productsResult.error?.message ?? salesResult.error?.message ?? 'Unknown error' },
      { status: 500 },
    );
  }

  const products = productsResult.data ?? [];
  const sales = salesResult.data ?? [];

  const salesTotals = new Map<string, number>();
  for (const sale of sales) {
    salesTotals.set(sale.product_id, (salesTotals.get(sale.product_id) ?? 0) + Number(sale.quantity));
  }

  const recommendations = products
    .map((product) => {
      const sold = salesTotals.get(product.id) ?? 0;
      const stock = Number(product.current_stock);
      const minimum = Number(product.min_stock);
      const velocity = sold / 30;
      const projectedNeed = Math.ceil(Math.max(velocity * 7, minimum * 2));
      const suggestedOrder = Math.max(projectedNeed - stock, 0);

      return {
        id: product.id,
        name: product.name,
        currentStock: stock,
        minStock: minimum,
        soldLast30Days: sold,
        projectedNeed,
        suggestedOrder,
        status: suggestedOrder > 0 ? 'reorder' : 'ok',
      };
    })
    .sort((a, b) => b.suggestedOrder - a.suggestedOrder);

  return NextResponse.json({ recommendations: recommendations.slice(0, 10) });
}
