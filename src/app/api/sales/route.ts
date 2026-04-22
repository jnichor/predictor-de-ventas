import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { mapSale } from '@/lib/supabase/mappers';
import { getRequestUser } from '@/lib/supabase/auth';

export async function GET(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await adminSupabase.from('sales').select('*').order('sold_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sales: data?.map(mapSale) ?? [] });
}

export async function POST(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const payload = await request.json();
  const barcode = payload.barcode as string;
  const quantity = Number(payload.quantity);
  const discount = Number(payload.discount ?? 0);
  const channel = String(payload.channel ?? 'Mostrador');

  const { data: product, error: productError } = await adminSupabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .single();

  if (productError || !product) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  if (quantity > product.current_stock) {
    return NextResponse.json({ error: 'No hay stock suficiente' }, { status: 400 });
  }

  const { data: sale, error: saleError } = await adminSupabase.rpc('record_sale', {
    p_product_id: product.id,
    p_quantity: quantity,
    p_discount: discount,
    p_channel: channel,
    p_sold_by: auth.user.id,
  });

  if (saleError) {
    return NextResponse.json({ error: saleError.message }, { status: 500 });
  }

  return NextResponse.json({ sale: mapSale(sale) });
}
