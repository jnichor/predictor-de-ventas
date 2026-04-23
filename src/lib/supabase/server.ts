import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Cliente con service role key. BYPASSEA RLS.
// Usar SOLO para operaciones legítimamente administrativas:
//   - auth.admin.* (crear usuarios, invitaciones, etc.)
//   - Validar JWTs arbitrarios vía auth.getUser(token)
// Para queries de datos usar createUserSupabase(accessToken) — así RLS se aplica.
export const adminSupabase =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null;

// Cliente scopeado al JWT del usuario que hizo la request.
// Todas las queries se ejecutan con su identidad → RLS aplica.
// Este es el cliente a usar en los endpoints para leer/escribir datos.
export function createUserSupabase(accessToken: string) {
  if (!supabaseUrl || !supabaseAnonKey) {
    return null;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
