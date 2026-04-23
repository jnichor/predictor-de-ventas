-- Migration: soporte para anular/cancelar ventas con reversión de stock.
--
-- Agrega columnas de anulación a la tabla sales y una RPC void_sale que:
--   1. Marca la venta como anulada (voided_at, voided_by, voided_reason)
--   2. Devuelve las unidades al stock del producto
--   3. Registra un movimiento de inventario de tipo "entry" con motivo
--      "Anulación venta" y reference_id apuntando a la venta original.
--
-- La venta original NO se borra — queda en el historial marcada como anulada.
-- Esto preserva la trazabilidad y permite auditoría.

alter table public.sales
  add column if not exists voided_at timestamptz,
  add column if not exists voided_by uuid references auth.users(id),
  add column if not exists voided_reason text;

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

  -- Marcar la venta como anulada
  update public.sales
  set voided_at = now(),
      voided_by = p_voided_by,
      voided_reason = coalesce(p_reason, 'Anulación manual')
  where id = p_sale_id;

  -- Devolver el stock al producto
  update public.products
  set current_stock = current_stock + v_sale.quantity,
      updated_at = now()
  where id = v_sale.product_id;

  -- Registrar el movimiento de reversión para trazabilidad
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
