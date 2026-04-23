import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/auth';

type ProfileRow = {
  id: string;
  name: string;
  role: string;
  active: boolean;
  created_at: string;
};

// GET /api/admin/users
// Lista todos los usuarios con su profile + email de auth.users.
// Requiere service role porque auth.users no es accesible con JWT de user.
export async function GET(request: Request) {
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

  const [profilesResult, usersResult] = await Promise.all([
    adminSupabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false }),
    adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  if (profilesResult.error) {
    return NextResponse.json({ error: profilesResult.error.message }, { status: 500 });
  }
  if (usersResult.error) {
    return NextResponse.json({ error: usersResult.error.message }, { status: 500 });
  }

  const emailById = new Map<string, string | null>();
  for (const user of usersResult.data.users) {
    emailById.set(user.id, user.email ?? null);
  }

  const users = (profilesResult.data as ProfileRow[]).map((p) => ({
    id: p.id,
    name: p.name,
    email: emailById.get(p.id) ?? null,
    role: p.role,
    active: p.active,
    createdAt: p.created_at,
  }));

  return NextResponse.json({ users });
}
