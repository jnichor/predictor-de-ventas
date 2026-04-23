import { NextResponse } from 'next/server';
import { getRequestUser } from '@/lib/supabase/auth';

export async function GET(request: Request) {
  const auth = await getRequestUser(request);
  if (!auth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user, profile } = auth;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name: profile?.name ?? user.user_metadata?.name ?? user.email?.split('@')[0] ?? 'Usuario',
      role: profile?.role ?? user.user_metadata?.role ?? 'worker',
    },
  });
}
