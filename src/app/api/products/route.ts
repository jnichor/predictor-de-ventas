import { NextResponse } from 'next/server';
import { mapProduct } from '@/lib/supabase/mappers';
import { getRequestUser } from '@/lib/supabase/auth';
import { createProductSchema, parseJsonBody } from '@/lib/schemas';

export async function GET(request: Request) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await auth.supabase
    .from('products')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ products: data?.map(mapProduct) ?? [] });
}

export async function POST(request: Request) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (auth.profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = await parseJsonBody(request, createProductSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const payload = parsed.data;

  const { data, error } = await auth.supabase
    .from('products')
    .insert({
      barcode: payload.barcode,
      name: payload.name,
      description: payload.description,
      category: payload.category,
      unit_price: payload.unit_price,
      current_stock: payload.current_stock,
      min_stock: payload.min_stock,
      active: true,
    })
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (payload.current_stock > 0) {
    await auth.supabase.from('inventory_movements').insert({
      product_id: data.id,
      type: 'entry',
      quantity: payload.current_stock,
      reason: 'Alta inicial del producto',
      created_by: auth.user.id,
    });
  }

  return NextResponse.json({ product: mapProduct(data) });
}
