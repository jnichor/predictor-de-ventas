# Roadmap — Sistema de tienda

Features complejos que requieren decisiones de negocio o integraciones con servicios externos.
Están documentados acá porque ya tienen una arquitectura pensada; la implementación queda pendiente.

---

## Multi-tienda (sucursales)

**Objetivo**: soportar que el mismo sistema maneje múltiples tiendas/sucursales con stock, ventas y usuarios separados.

### Por qué no está implementado
Requiere reescribir el schema de base de datos y todas las policies RLS. Para una tienda única, el overhead no se justifica.

### Esquema propuesto

```sql
create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.products add column store_id uuid references public.stores(id);
alter table public.sales add column store_id uuid references public.stores(id);
alter table public.inventory_movements add column store_id uuid references public.stores(id);
alter table public.profiles add column default_store_id uuid references public.stores(id);

-- Pertenencia many-to-many (un admin puede manejar varias tiendas)
create table public.store_members (
  store_id uuid not null references public.stores(id),
  user_id uuid not null references auth.users(id),
  role text not null default 'worker',
  primary key (store_id, user_id)
);
```

### Cambios de UI necesarios
- Selector de tienda activa en el topbar (dropdown con las tiendas accesibles del user)
- Context global `CurrentStoreProvider` que inyecta el `storeId` en todas las queries
- Una pantalla `/tiendas` (admin-only) para CRUD de sucursales
- Reportes con opción "todas las tiendas" vs filtro por tienda

### RLS policies
Todas las policies existentes se re-escriben para chequear que el user pertenece al `store_members` del registro accedido:
```sql
using (
  exists (
    select 1 from public.store_members
    where store_id = products.store_id and user_id = auth.uid()
  )
)
```

### Esfuerzo estimado
- 1 semana de desarrollo (migration, RLS, UI, tests)
- 2 días de migración de datos existentes a la tienda #1 default

---

## Facturación electrónica SUNAT (Perú)

**Objetivo**: emitir boletas y facturas electrónicas conformes con SUNAT para poder operar legalmente una tienda formal en Perú.

### Por qué no está implementado
Requiere:
- Cuenta con un proveedor de facturación electrónica (Nubefact, Efact, Facturedo, etc.) — con costo mensual
- Datos fiscales del negocio: RUC, razón social, dirección fiscal, series autorizadas
- Certificado digital (.pfx) para firmar los XMLs
- Integración específica con la API del proveedor elegido
- Tiempo de pruebas en ambiente de homologación de SUNAT

### Stack propuesto

**Proveedor recomendado**: Nubefact
- API REST simple
- Soporta boletas (B001), facturas (F001), notas de crédito/débito
- Trial gratis hasta 50 comprobantes/mes
- Manejan la firma digital y envío a SUNAT internamente

### Arquitectura

Nueva tabla:
```sql
create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales(id),
  document_type text not null check (document_type in ('boleta', 'factura')),
  series text not null,  -- B001, F001
  number integer not null,
  customer_doc_type text,  -- '1' DNI, '6' RUC
  customer_doc_number text,
  customer_name text,
  total_amount numeric(12,2) not null,
  tax_amount numeric(12,2) not null,
  xml_url text,
  pdf_url text,
  cdr_url text,  -- Constancia de recepción de SUNAT
  status text not null default 'pending',
  error_message text,
  issued_at timestamptz,
  created_at timestamptz not null default now()
);
```

Nuevo endpoint:
```
POST /api/sales/:id/invoice
  body: { documentType, customerDocNumber, customerName }
  → crea invoice en DB en status 'pending'
  → llama Nubefact API con los datos
  → actualiza invoice con XML/PDF/CDR URL en status 'issued'
  → devuelve la URL del PDF
```

Nueva pantalla `/facturacion` (admin) con configuración de RUC, series, credenciales del proveedor.

### Consideraciones legales
- El sistema debe generar un código único por comprobante (no duplicar series+número)
- Los XMLs deben estar firmados digitalmente
- El CDR de SUNAT debe almacenarse (prueba legal de emisión)
- Período de retención legal: 5 años mínimo

### Esfuerzo estimado
- 2 semanas desde cero (incluye pruebas con Nubefact homologación)
- Más 1 día de integración por cada proveedor alternativo

---

## Prioridades recomendadas si se implementa

1. **SUNAT primero** si el sistema va a una tienda real peruana — es requisito legal
2. **Multi-tienda después** cuando tengas segunda sucursal

## Alternativas para tiendas no peruanas

Si la tienda NO está en Perú, SUNAT no aplica. Otras opciones según país:
- México: CFDI con PAC (Facturama, Fiscalpop)
- Argentina: AFIP FE con servicios como Talo, Mokriya
- España: FacturaE con Wolters Kluwer
- Chile: SII con Openfactura, Haulmer

El patrón arquitectónico es el mismo; cambia el proveedor de integración.
