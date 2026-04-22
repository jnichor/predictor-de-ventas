import { adminSupabase } from './server';

export async function getRequestUser(request: Request) {
  if (!adminSupabase) {
    return null;
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.slice('Bearer '.length);
  const { data, error } = await adminSupabase.auth.getUser(token);

  if (error || !data.user) {
    return null;
  }

  const { data: profile } = await adminSupabase.from('profiles').select('*').eq('id', data.user.id).single();

  return {
    user: data.user,
    profile,
  };
}

export function getAccessTokenFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
}
