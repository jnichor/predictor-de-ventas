import { NextResponse } from 'next/server';
import { mapSale } from '@/lib/supabase/mappers';
import { getRequestUser } from '@/lib/supabase/auth';
import { createSaleSchema, parseJsonBody } from '@/lib/schemas';

export async function GET(request: Request) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await auth.supabase
    .from('sales')
    .select('*')
    .order('sold_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sales: data?.map(mapSale) ?? [] });
}

export async function POST(request: Request) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, createSaleSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const { barcode, quantity, discount, channel } = parsed.data;

  const { data: product, error: productError } = await auth.supabase
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

  const { data: sale, error: saleError } = await auth.supabase.rpc('record_sale', {
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
