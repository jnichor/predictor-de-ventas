import { NextResponse } from 'next/server';
import { mapMovement } from '@/lib/supabase/mappers';
import { getRequestUser } from '@/lib/supabase/auth';
import { createMovementSchema, parseJsonBody } from '@/lib/schemas';

export async function GET(request: Request) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await auth.supabase
    .from('inventory_movements')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movements: data?.map(mapMovement) ?? [] });
}

export async function POST(request: Request) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, createMovementSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const payload = parsed.data;

  if (payload.type === 'adjustment' && auth.profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo el administrador puede registrar ajustes de inventario' },
      { status: 403 },
    );
  }

  const { data, error } = await auth.supabase.rpc('record_inventory_movement', {
    p_product_id: payload.product_id,
    p_type: payload.type,
    p_quantity: payload.quantity,
    p_reason: payload.reason,
    p_created_by: auth.user.id,
    p_adjustment_direction: payload.adjustment_direction ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movement: mapMovement(data) });
}
