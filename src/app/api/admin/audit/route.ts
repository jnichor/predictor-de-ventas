import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';
import { getRequestUser } from '@/lib/supabase/auth';

type AuditRow = {
  id: string;
  table_name: string;
  record_id: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  actor_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  changed_fields: string[] | null;
  created_at: string;
};

// GET /api/admin/audit
// Lista últimas 200 entradas de auditoría, resolviendo actor_id → email/nombre
// con join contra auth.users + profiles.
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

  const url = new URL(request.url);
  const table = url.searchParams.get('table'); // filtro opcional por tabla

  let query = adminSupabase
    .from('audit_log')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);

  if (table) {
    query = query.eq('table_name', table);
  }

  const { data: logs, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Resolvemos actor_id → nombre (profiles) y email (auth.users)
  const actorIds = Array.from(
    new Set((logs as AuditRow[]).map((l) => l.actor_id).filter((x): x is string => !!x)),
  );

  const [profilesResult, usersResult] = await Promise.all([
    actorIds.length > 0
      ? adminSupabase.from('profiles').select('id, name').in('id', actorIds)
      : Promise.resolve({ data: [], error: null }),
    actorIds.length > 0
      ? adminSupabase.auth.admin.listUsers({ page: 1, perPage: 1000 })
      : Promise.resolve({ data: { users: [] }, error: null }),
  ]);

  const nameById = new Map<string, string>();
  for (const p of (profilesResult.data as Array<{ id: string; name: string }>) ?? []) {
    nameById.set(p.id, p.name);
  }
  const emailById = new Map<string, string | null>();
  for (const u of usersResult.data?.users ?? []) {
    emailById.set(u.id, u.email ?? null);
  }

  const entries = (logs as AuditRow[]).map((l) => ({
    id: l.id,
    tableName: l.table_name,
    recordId: l.record_id,
    action: l.action,
    actorId: l.actor_id,
    actorName: l.actor_id ? nameById.get(l.actor_id) ?? null : null,
    actorEmail: l.actor_id ? emailById.get(l.actor_id) ?? null : null,
    oldValues: l.old_values,
    newValues: l.new_values,
    changedFields: l.changed_fields ?? [],
    createdAt: l.created_at,
  }));

  return NextResponse.json({ entries });
}
