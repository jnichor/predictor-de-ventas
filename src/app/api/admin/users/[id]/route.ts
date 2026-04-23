import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/auth';
import { parseJsonBody, updateUserSchema } from '@/lib/schemas';

type RouteParams = { params: Promise<{ id: string }> };

// PATCH /api/admin/users/:id
// Actualiza rol o estado (active) de un profile.
// Requiere adminSupabase porque editar profiles de otros users necesita
// bypassear la policy "profiles own row" (que sólo permite self-read).
export async function PATCH(request: Request, { params }: RouteParams) {
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

  const { id } = await params;

  if (id === auth.user.id) {
    return NextResponse.json(
      { error: 'No podés modificar tu propio usuario desde acá' },
      { status: 400 },
    );
  }

  const parsed = await parseJsonBody(request, updateUserSchema);
  if (!parsed.ok) return parsed.response;

  const payload = parsed.data;
  if (Object.keys(payload).length === 0) {
    return NextResponse.json({ error: 'Nada para actualizar' }, { status: 400 });
  }

  const { error } = await adminSupabase.from('profiles').update(payload).eq('id', id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
