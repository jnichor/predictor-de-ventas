import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/supabase/auth';
import { mapProduct } from '@/lib/supabase/mappers';
import { parseJsonBody, updateProductSchema } from '@/lib/schemas';

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteParams) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const parsed = await parseJsonBody(request, updateProductSchema);
  if (!parsed.ok) return parsed.response;

  const payload = parsed.data;
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const { data, error } = await auth.supabase
    .from('products')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ product: mapProduct(data) });
}

// Soft delete: marca active = false en lugar de borrar el row
// (preserva trazabilidad de ventas/movimientos históricos).
export async function DELETE(request: Request, { params }: RouteParams) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { id } = await params;
  const { error } = await auth.supabase
    .from('products')
    .update({ active: false })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
