-- Migration: eliminar la race condition del "primer usuario es admin".
--
-- Contexto:
--   La versión anterior del trigger handle_new_user() leía count(*) de profiles
--   y, si estaba vacío, promovía al usuario a admin. Esto tenía dos problemas:
--     1. Race condition: dos signups simultáneos podían ver count=0 y ambos
--        quedaban admin.
--     2. Se mezclaba lógica de "bootstrap" con lógica de creación de perfiles.
--
-- Solución:
--   El trigger ahora SIEMPRE crea el perfil como 'worker' por defecto, salvo
--   que el metadata del signup traiga un rol explícito (eso sólo pasa cuando
--   el admin invita desde /api/admin/users/invite, que ya es admin-only).
--
-- Cómo crear el primer admin después de aplicar esta migration:
--
--   1. En Supabase Dashboard → Authentication → Users, crear manualmente el
--      usuario con email y contraseña.
--   2. En el SQL Editor ejecutar:
--
--      update public.profiles
--        set role = 'admin'
--        where id = (
--          select id from auth.users where email = 'tu-email@tienda.com'
--        );

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data ->> 'role', 'worker')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
