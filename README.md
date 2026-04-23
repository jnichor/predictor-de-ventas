# Sistema de tienda

Inventario, ventas, scanner por camara, reportes y prediccion simple de demanda.

## Requisitos
- Node.js 24+
- Cuenta de Supabase
- Cuenta de Vercel

## Variables de entorno
Crear un archivo `.env.local` con:

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

## Base de datos
1. Abrir el panel de Supabase.
2. Ejecutar `supabase/schema.sql` en el SQL Editor.
3. En **Authentication → Providers → Email**, desactivar **"Enable Signups"**. El sistema NO permite auto-registro — todos los usuarios entran por invitación del admin.
4. Configurar un SMTP real en **Authentication → SMTP Settings** (Resend, SendGrid, etc.) para que las invitaciones lleguen. El SMTP por defecto de Supabase tiene un límite de 3 emails/hora y los mensajes suelen caer en spam.
5. Crear el primer administrador manualmente (ver sección **Primer admin**).

## Actualizando una instalación existente
Si ya corriste `schema.sql` antes del 2026-04-22, aplicá las migrations acumuladas ejecutando cada archivo de `supabase/migrations/` en orden cronológico en el SQL Editor. Cada migration es idempotente (usa `create or replace`) así que es seguro correrla más de una vez.

## Primer admin
El sistema no permite auto-registro: todos los usuarios son invitados por un admin. Para crear el primer admin:

1. En Supabase Dashboard → **Authentication → Users**, crear un usuario manualmente con email y contraseña.
2. En el **SQL Editor**, ejecutar:
   ```sql
   update public.profiles
     set role = 'admin'
     where id = (select id from auth.users where email = 'tu-email@tienda.com');
   ```
3. Entrar al sistema con esas credenciales.
4. Desde el panel **Operaciones → Usuarios**, invitar al resto del equipo.

## Desarrollo local
```bash
npm install
npm run dev
```

## Despliegue en Vercel
1. Subir el repo a GitHub.
2. Importar el proyecto en Vercel.
3. Configurar estas variables en Vercel:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Desplegar.

## Notas
- El scanner usa la camara del celular desde el navegador.
- `admin` puede crear productos, invitar usuarios y registrar ajustes de inventario.
- `worker` puede registrar ventas, entradas y salidas de inventario.
- Los reportes y la prediccion salen del historial de ventas.
- Las invitaciones se envían desde **Operaciones → Usuarios** (solo admin).
