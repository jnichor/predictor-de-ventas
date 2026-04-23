create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'worker',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  barcode text not null unique,
  name text not null,
  description text not null default '',
  category text not null default 'General',
  unit_price numeric(12,2) not null default 0,
  current_stock integer not null default 0,
  min_stock integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('entry', 'exit', 'adjustment')),
  quantity integer not null check (quantity > 0),
  reason text not null default '',
  reference_id uuid,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id)
);

create table if not exists public.sales (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  channel text not null default 'Mostrador',
  sold_at timestamptz not null default now(),
  sold_by uuid references auth.users(id),
  voided_at timestamptz,
  voided_by uuid references auth.users(id),
  voided_reason text
);

create index if not exists products_barcode_idx on public.products (barcode);
create index if not exists products_active_idx on public.products (active);
create index if not exists inventory_movements_product_id_idx on public.inventory_movements (product_id);
create index if not exists inventory_movements_created_at_idx on public.inventory_movements (created_at desc);
create index if not exists sales_product_id_idx on public.sales (product_id);
create index if not exists sales_sold_at_idx on public.sales (sold_at desc);

alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.sales enable row level security;
alter table public.profiles enable row level security;

create policy "profiles own row"
on public.profiles
for select
using (auth.uid() = id);

-- IMPORTANTE: este trigger NO promueve nadie a admin automáticamente.
-- Todos los usuarios nuevos nacen como 'worker' salvo que el metadata del signup
-- tenga un rol explícito (ese caso sólo ocurre cuando el admin invita desde el
-- endpoint /api/admin/users/invite, que requiere rol admin).
-- El PRIMER admin se crea manualmente con el UPDATE documentado en el README.
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

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create policy "products read"
on public.products
for select
using (auth.role() = 'authenticated');

create policy "products insert"
on public.products
for insert
with check (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "products update"
on public.products
for update
using (exists (select 1 from public.profiles where id = auth.uid() and role = 'admin'));

create policy "inventory read"
on public.inventory_movements
for select
using (auth.role() = 'authenticated');

create policy "inventory insert"
on public.inventory_movements
for insert
with check (auth.role() = 'authenticated');

create policy "sales read"
on public.sales
for select
using (auth.role() = 'authenticated');

create policy "sales insert"
on public.sales
for insert
with check (auth.role() = 'authenticated');

create or replace function public.record_sale(
  p_product_id uuid,
  p_quantity integer,
  p_discount numeric default 0,
  p_channel text default 'Mostrador',
  p_sold_by uuid default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_product public.products;
  v_sale public.sales;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select *
  into v_product
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if v_product.current_stock < p_quantity then
    raise exception 'Insufficient stock';
  end if;

  insert into public.sales (
    product_id,
    quantity,
    unit_price,
    discount,
    total,
    channel,
    sold_by
  ) values (
    p_product_id,
    p_quantity,
    v_product.unit_price,
    coalesce(p_discount, 0),
    greatest(v_product.unit_price * p_quantity - coalesce(p_discount, 0), 0),
    p_channel,
    p_sold_by
  )
  returning * into v_sale;

  update public.products
  set current_stock = current_stock - p_quantity,
      updated_at = now()
  where id = p_product_id;

  insert into public.inventory_movements (
    product_id,
    type,
    quantity,
    reason,
    reference_id,
    created_by
  ) values (
    p_product_id,
    'exit',
    p_quantity,
    'Venta registrada',
    v_sale.id,
    p_sold_by
  );

  return v_sale;
end;
$$;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.record_inventory_movement(
  p_product_id uuid,
  p_type text,
  p_quantity integer,
  p_reason text default '',
  p_created_by uuid default null,
  p_adjustment_direction text default null
)
returns public.inventory_movements
language plpgsql
security definer
set search_path = public
as $$
declare
  v_current_stock integer;
  v_delta integer;
  v_movement public.inventory_movements;
begin
  select current_stock
  into v_current_stock
  from public.products
  where id = p_product_id
  for update;

  if not found then
    raise exception 'Product not found';
  end if;

  if p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  if p_type = 'entry' then
    v_delta := p_quantity;
  elsif p_type = 'exit' then
    v_delta := -p_quantity;
  elsif p_type = 'adjustment' then
    if p_adjustment_direction = 'increase' then
      v_delta := p_quantity;
    elsif p_adjustment_direction = 'decrease' then
      v_delta := -p_quantity;
    else
      raise exception 'Adjustment direction must be increase or decrease';
    end if;
  else
    raise exception 'Invalid movement type';
  end if;

  if v_current_stock + v_delta < 0 then
    raise exception 'Insufficient stock';
  end if;

  update public.products
  set current_stock = current_stock + v_delta,
      updated_at = now()
  where id = p_product_id;

  insert into public.inventory_movements (
    product_id,
    type,
    quantity,
    reason,
    created_by
  ) values (
    p_product_id,
    p_type,
    p_quantity,
    p_reason,
    p_created_by
  )
  returning * into v_movement;

  return v_movement;
end;
$$;

drop trigger if exists touch_products_updated_at on public.products;
create trigger touch_products_updated_at
before update on public.products
for each row
execute function public.touch_updated_at();

create or replace function public.void_sale(
  p_sale_id uuid,
  p_voided_by uuid default null,
  p_reason text default null
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
begin
  select *
  into v_sale
  from public.sales
  where id = p_sale_id
  for update;

  if not found then
    raise exception 'Sale not found';
  end if;

  if v_sale.voided_at is not null then
    raise exception 'Sale already voided';
  end if;

  update public.sales
  set voided_at = now(),
      voided_by = p_voided_by,
      voided_reason = coalesce(p_reason, 'Anulación manual')
  where id = p_sale_id;

  update public.products
  set current_stock = current_stock + v_sale.quantity,
      updated_at = now()
  where id = v_sale.product_id;

  insert into public.inventory_movements (
    product_id,
    type,
    quantity,
    reason,
    reference_id,
    created_by
  ) values (
    v_sale.product_id,
    'entry',
    v_sale.quantity,
    coalesce('Anulación venta: ' || p_reason, 'Anulación de venta'),
    v_sale.id,
    p_voided_by
  );

  select *
  into v_sale
  from public.sales
  where id = p_sale_id;

  return v_sale;
end;
$$;
