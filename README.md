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
3. Crear el primer usuario desde la pantalla de login del sistema.
4. Ese primer usuario queda como `admin`.

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
- `admin` puede crear productos.
- `worker` puede registrar ventas y movimientos de inventario.
- Los reportes y la prediccion salen del historial de ventas.
