import { adminSupabase, createUserSupabase } from './server';

export async function getRequestUser(request: Request) {
  if (!adminSupabase) {
    return null;
  }

  const token = getAccessTokenFromRequest(request);
  if (!token) {
    return null;
  }

  // Validamos el token con el admin client (forma oficial de verificar un JWT).
  const { data, error } = await adminSupabase.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  // Creamos un cliente scopeado al JWT para todas las queries de datos.
  // Cada endpoint debe usar auth.supabase (NO adminSupabase) para respetar RLS.
  const supabase = createUserSupabase(token);
  if (!supabase) {
    return null;
  }

  // Leemos el profile con el cliente scopeado — la policy "profiles own row"
  // permite que el usuario lea su propio registro.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  // Si el profile existe y está marcado como inactivo, rechazamos la request.
  // El user tiene JWT válido (Supabase lo acepta) pero nuestra app lo bloquea.
  if (profile && profile.active === false) {
    return null;
  }

  return {
    user: data.user,
    profile,
    supabase,
  };
}

export function getAccessTokenFromRequest(request: Request) {
  const authHeader = request.headers.get('authorization');
  return authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : null;
}
