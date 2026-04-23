import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
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
  const { barcode, quantity, discount, channel, name } = parsed.data;

  let { data: product } = await auth.supabase
    .from('products')
    .select('*')
    .eq('barcode', barcode)
    .maybeSingle();

  // Alta al vuelo: si el barcode no existe y vino un nombre, creamos el producto
  // con valores por defecto. Usamos adminSupabase porque la policy "products insert"
  // exige rol admin, y queremos permitir que cualquier user registrado pueda hacerlo
  // a través de este flujo controlado.
  if (!product && name && adminSupabase) {
    const { data: created, error: createError } = await adminSupabase
      .from('products')
      .insert({
        barcode,
        name,
        description: '',
        category: 'General',
        unit_price: 0,
        current_stock: 0,
        min_stock: 0,
        active: true,
      })
      .select('*')
      .single();

    if (createError || !created) {
      return NextResponse.json(
        { error: createError?.message ?? 'No se pudo crear el producto' },
        { status: 500 },
      );
    }
    product = created;
  }

  if (!product) {
    return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
  }

  if (quantity > product.current_stock) {
    return NextResponse.json(
      {
        error:
          product.current_stock === 0
            ? 'El producto no tiene stock. Registrá una entrada de inventario primero.'
            : `Solo hay ${product.current_stock} unidades disponibles.`,
      },
      { status: 400 },
    );
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
