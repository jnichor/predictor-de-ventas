'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { MailPlus, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { InviteForm } from '@/components/users/invite-form';
import { useAuth } from '@/hooks/use-auth';

export default function UsuariosPage() {
  const router = useRouter();
  const { session, currentUser, status } = useAuth();
  const accessToken = session?.access_token ?? null;

  useEffect(() => {
    if (status === 'authenticated' && currentUser?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [status, currentUser, router]);

  if (!accessToken || currentUser?.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Administración
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Invitá a nuevos miembros del equipo por email. Reciben un link para completar su contraseña.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MailPlus className="size-4" /> Nueva invitación
            </CardTitle>
            <CardDescription>El invitado recibe un correo con un link único</CardDescription>
          </CardHeader>
          <CardContent>
            <InviteForm accessToken={accessToken} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4" /> Cómo funciona
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-muted-foreground">
            <p>
              El sistema <strong className="text-foreground">no permite auto-registro</strong>. Todos los
              accesos son controlados: cuando invitás a alguien, Supabase le envía un link para que
              configure su propia contraseña.
            </p>
            <p>
              Si el invitado no recibe el email, verificá en el panel de Supabase (Authentication
              &gt; Users) que tenga el rol asignado, y copiá el magic link desde ahí.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Worker</strong>: puede registrar ventas y movimientos de
                inventario de tipo entrada/salida.
              </li>
              <li>
                <strong className="text-foreground">Admin</strong>: todo lo anterior + crear productos,
                hacer ajustes y gestionar usuarios.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
