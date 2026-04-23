import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/auth';
import { inviteUserSchema, parseJsonBody } from '@/lib/schemas';

// Este endpoint es uno de los pocos lugares legítimos donde se usa adminSupabase:
// auth.admin.inviteUserByEmail() requiere service role por diseño de Supabase.
// La autorización (admin-only) se chequea explícitamente abajo.
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

  const parsed = await parseJsonBody(request, inviteUserSchema);
  if (!parsed.ok) {
    return parsed.response;
  }
  const { email, name, role } = parsed.data;

  const { data, error } = await adminSupabase.auth.admin.inviteUserByEmail(email, {
    data: {
      name: name ?? email.split('@')[0],
      role,
    },
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    invited: {
      id: data.user?.id ?? null,
      email: data.user?.email ?? email,
      role,
    },
  });
}
