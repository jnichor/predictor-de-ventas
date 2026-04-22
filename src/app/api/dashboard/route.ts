import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { mapMovement, mapProduct, mapSale } from '@/lib/supabase/mappers';
import { getRequestUser } from '@/lib/supabase/auth';

export async function GET(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const [products, sales, movements] = await Promise.all([
    adminSupabase.from('products').select('*').order('updated_at', { ascending: false }),
    adminSupabase.from('sales').select('*').order('sold_at', { ascending: false }),
    adminSupabase.from('inventory_movements').select('*').order('created_at', { ascending: false }),
  ]);

  if (products.error || sales.error || movements.error) {
    return NextResponse.json(
      {
        error: products.error?.message ?? sales.error?.message ?? movements.error?.message ?? 'Unknown error',
      },
      { status: 500 },
    );
  }

  return NextResponse.json({
    products: products.data?.map(mapProduct) ?? [],
    sales: sales.data?.map(mapSale) ?? [],
    movements: movements.data?.map(mapMovement) ?? [],
  });
}
