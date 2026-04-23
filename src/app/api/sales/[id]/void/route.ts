import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/supabase/auth';
import { mapSale } from '@/lib/supabase/mappers';
import { parseJsonBody, voidSaleSchema } from '@/lib/schemas';

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: RouteParams) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (auth.profile?.role !== 'admin') {
    return NextResponse.json(
      { error: 'Solo el administrador puede anular ventas' },
      { status: 403 },
    );
  }

  const { id } = await params;
  const parsed = await parseJsonBody(request, voidSaleSchema);
  if (!parsed.ok) return parsed.response;

  const { data, error } = await auth.supabase.rpc('void_sale', {
    p_sale_id: id,
    p_voided_by: auth.user.id,
    p_reason: parsed.data.reason ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ sale: mapSale(data) });
}
