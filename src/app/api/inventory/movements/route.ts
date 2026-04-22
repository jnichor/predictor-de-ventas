import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { mapMovement } from '@/lib/supabase/mappers';
import { getRequestUser } from '@/lib/supabase/auth';

export async function GET(request: Request) {
  if (!adminSupabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data, error } = await adminSupabase.from('inventory_movements').select('*').order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movements: data?.map(mapMovement) ?? [] });
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
  const { data, error } = await adminSupabase.rpc('record_inventory_movement', {
    p_product_id: payload.product_id,
    p_type: payload.type,
    p_quantity: payload.quantity,
    p_reason: payload.reason ?? '',
    p_created_by: auth.user.id,
    p_adjustment_direction: payload.adjustment_direction ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ movement: mapMovement(data) });
}
