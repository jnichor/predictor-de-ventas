import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { mapProduct } from '@/lib/supabase/mappers';
import { getRequestUser } from '@/lib/supabase/auth';

export async function GET(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await adminSupabase.from('products').select('*').order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data?.map(mapProduct) ?? [] });
}

export async function POST(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const payload = await request.json();
  const { data, error } = await adminSupabase
    .from('products')
    .insert({
      barcode: payload.barcode,
      name: payload.name,
      description: payload.description ?? '',
      category: payload.category ?? 'General',
      unit_price: payload.unit_price ?? 0,
      current_stock: payload.current_stock ?? 0,
      min_stock: payload.min_stock ?? 0,
      active: true,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if ((payload.current_stock ?? 0) > 0) {
    await adminSupabase.from('inventory_movements').insert({
      product_id: data.id,
      type: 'entry',
      quantity: payload.current_stock,
      reason: 'Alta inicial del producto',
    });
  }

  return NextResponse.json({ product: mapProduct(data) });
}
