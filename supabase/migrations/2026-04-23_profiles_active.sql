-- Migration: soporte para desactivar usuarios sin borrarlos.
--
-- Al borrar un usuario se destruiría su historial de ventas/movimientos.
-- En su lugar, agregamos un flag `active` en profiles que el middleware de
-- auth usa para rechazar requests de usuarios desactivados.
--
-- Un usuario desactivado puede tener sesión iniciada (su JWT sigue siendo válido)
-- pero todos los endpoints lo rechazan porque getRequestUser verifica active.

alter table public.profiles
  add column if not exists active boolean not null default true;
