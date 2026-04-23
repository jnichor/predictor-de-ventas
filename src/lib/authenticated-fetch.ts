import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

/**
 * Wrapper de fetch que:
 *   1. Inyecta el Authorization header con el JWT actual.
 *   2. Si recibe 401, intenta refresh de token y reintenta UNA vez.
 *   3. Si sigue fallando, fuerza logout con toast para que el user se re-loguee.
 *
 * Úsalo para todos los llamados a /api/* que requieren auth.
 *
 * Ejemplo:
 *   const res = await authenticatedFetch('/api/sales', {
 *     method: 'POST',
 *     body: JSON.stringify({ ... }),
 *   });
 */
export async function authenticatedFetch(
  input: string,
  init: RequestInit = {},
): Promise<Response> {
  if (!supabase) {
    throw new Error('Supabase no está configurado.');
  }

  // Obtenemos el token más fresco posible
  const { data: sessionData } = await supabase.auth.getSession();
  let token = sessionData.session?.access_token;

  if (!token) {
    await handleAuthFailure();
    return new Response(JSON.stringify({ error: 'No hay sesión' }), { status: 401 });
  }

  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const doFetch = (t: string) =>
    fetch(input, {
      ...init,
      headers: new Headers([...headers.entries(), ['Authorization', `Bearer ${t}`]]),
    });

  let response = await doFetch(token);

  if (response.status === 401) {
    // Token expirado — forzamos refresh y reintentamos
    const { data: refreshed, error } = await supabase.auth.refreshSession();
    if (error || !refreshed.session) {
      await handleAuthFailure();
      return response;
    }
    token = refreshed.session.access_token;
    response = await doFetch(token);

    if (response.status === 401) {
      // Sigue fallando → cerramos sesión
      await handleAuthFailure();
    }
  }

  return response;
}

async function handleAuthFailure() {
  toast.error('Tu sesión expiró. Volvé a iniciar sesión.');
  if (supabase) {
    await supabase.auth.signOut();
  }
  // El onAuthStateChange del useAuth va a detectar SIGNED_OUT y redirigir a /login
}
