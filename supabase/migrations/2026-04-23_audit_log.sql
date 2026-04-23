-- Migration: sistema de auditoría (audit_log) con triggers automáticos.
--
-- Registra quién cambió qué y cuándo en las tablas críticas (products, profiles).
-- El trigger se dispara en INSERT / UPDATE / DELETE y guarda un snapshot del
-- cambio con diff entre valores previos y nuevos.
--
-- El auth.uid() en el trigger lo da la sesión del user que hizo el cambio
-- (cuando las queries pasan por el user-scoped client de la API).
-- Las operaciones con service role (alta al vuelo, invites) van con user_id
-- explícito cuando se provee.

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id text not null,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  actor_id uuid references auth.users(id),
  old_values jsonb,
  new_values jsonb,
  changed_fields text[],
  created_at timestamptz not null default now()
);

create index if not exists audit_log_table_record_idx
  on public.audit_log (table_name, record_id);
create index if not exists audit_log_created_at_idx
  on public.audit_log (created_at desc);
create index if not exists audit_log_actor_idx
  on public.audit_log (actor_id);

alter table public.audit_log enable row level security;

-- Solo admins pueden leer la auditoría
create policy "audit_log admin read"
on public.audit_log
for select
using (exists (
  select 1 from public.profiles
  where id = auth.uid() and role = 'admin'
));

-- Trigger genérico que puebla audit_log a partir de cualquier tabla monitoreada
create or replace function public.audit_trigger()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid;
  v_old jsonb;
  v_new jsonb;
  v_changed text[];
  v_key text;
begin
  v_actor := auth.uid();

  if tg_op = 'DELETE' then
    v_old := to_jsonb(old);
    v_new := null;
    v_changed := null;
  elsif tg_op = 'INSERT' then
    v_old := null;
    v_new := to_jsonb(new);
    v_changed := null;
  else
    v_old := to_jsonb(old);
    v_new := to_jsonb(new);
    v_changed := array(
      select key
      from jsonb_each(v_new)
      where v_old -> key is distinct from v_new -> key
    );
    -- Si no cambió nada real (ej: update con mismos valores), skip
    if array_length(v_changed, 1) is null then
      return new;
    end if;
  end if;

  insert into public.audit_log (
    table_name, record_id, action, actor_id, old_values, new_values, changed_fields
  ) values (
    tg_table_name,
    coalesce((v_new ->> 'id'), (v_old ->> 'id')),
    tg_op,
    v_actor,
    v_old,
    v_new,
    v_changed
  );

  return coalesce(new, old);
end;
$$;

-- Attach el trigger a products y profiles
drop trigger if exists audit_products on public.products;
create trigger audit_products
after insert or update or delete on public.products
for each row execute function public.audit_trigger();

drop trigger if exists audit_profiles on public.profiles;
create trigger audit_profiles
after insert or update or delete on public.profiles
for each row execute function public.audit_trigger();
