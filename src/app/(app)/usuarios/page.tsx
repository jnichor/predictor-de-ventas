'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MailPlus, ShieldCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { InviteForm } from '@/components/users/invite-form';
import { buildUsersColumns, type UserRow } from '@/components/users/users-columns';
import { useAuth } from '@/hooks/use-auth';

type ConfirmState =
  | null
  | { kind: 'role'; user: UserRow; nextRole: 'admin' | 'worker' }
  | { kind: 'toggle'; user: UserRow };

export default function UsuariosPage() {
  const router = useRouter();
  const { session, currentUser, status } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [users, setUsers] = useState<UserRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirm, setConfirm] = useState<ConfirmState>(null);
  const [isMutating, setIsMutating] = useState(false);

  useEffect(() => {
    if (status === 'authenticated' && currentUser?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [status, currentUser, router]);

  const loadUsers = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(Array.isArray(data.users) ? data.users : []);
      }
    } catch (error) {
      console.error('usuarios loadData', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  async function patchUser(userId: string, body: Record<string, unknown>, successMsg: string) {
    if (!accessToken) return;
    setIsMutating(true);
    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo actualizar el usuario.');
        return;
      }
      toast.success(successMsg);
      setConfirm(null);
      await loadUsers();
    } catch (error) {
      console.error('patch user', error);
      toast.error('Error de conexión.');
    } finally {
      setIsMutating(false);
    }
  }

  async function handleConfirm() {
    if (!confirm) return;
    if (confirm.kind === 'role') {
      await patchUser(
        confirm.user.id,
        { role: confirm.nextRole },
        `${confirm.user.name} ahora es ${confirm.nextRole === 'admin' ? 'Admin' : 'Worker'}.`,
      );
    } else if (confirm.kind === 'toggle') {
      const next = !confirm.user.active;
      await patchUser(
        confirm.user.id,
        { active: next },
        next
          ? `${confirm.user.name} reactivado.`
          : `${confirm.user.name} desactivado.`,
      );
    }
  }

  const columns = useMemo(
    () =>
      buildUsersColumns({
        currentUserId: currentUser?.id ?? '',
        onChangeRole: (user, nextRole) => setConfirm({ kind: 'role', user, nextRole }),
        onToggleActive: (user) => setConfirm({ kind: 'toggle', user }),
      }),
    [currentUser?.id],
  );

  if (!accessToken || currentUser?.role !== 'admin') return null;

  const confirmTitle =
    confirm?.kind === 'role'
      ? confirm.nextRole === 'admin'
        ? `¿Promover a ${confirm.user.name} a Admin?`
        : `¿Pasar a ${confirm.user.name} a Worker?`
      : confirm?.kind === 'toggle'
        ? confirm.user.active
          ? `¿Desactivar a ${confirm.user.name}?`
          : `¿Reactivar a ${confirm.user.name}?`
        : '';

  const confirmDescription =
    confirm?.kind === 'role'
      ? confirm.nextRole === 'admin'
        ? 'Va a poder crear productos, invitar usuarios, hacer ajustes de inventario y anular ventas.'
        : 'Ya no va a tener permisos de admin. Solo podrá vender y registrar movimientos de entrada/salida.'
      : confirm?.kind === 'toggle'
        ? confirm.user.active
          ? 'No va a poder usar el sistema hasta que lo reactives. Su historial se conserva intacto.'
          : 'Va a volver a tener acceso con su email/password habitual.'
        : '';

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Administración
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Usuarios</h1>
        <p className="text-sm text-muted-foreground">
          Invitá nuevos miembros, cambiá roles y desactivá accesos cuando alguien deja el equipo.
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
            <InviteForm accessToken={accessToken} onInvited={loadUsers} />
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
              El sistema <strong className="text-foreground">no permite auto-registro</strong>.
              Todos los accesos son controlados: cuando invitás a alguien, Supabase le envía un link
              para que configure su propia contraseña.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <strong className="text-foreground">Worker</strong>: puede registrar ventas y
                movimientos de inventario de tipo entrada/salida.
              </li>
              <li>
                <strong className="text-foreground">Admin</strong>: todo lo anterior + crear
                productos, ajustes, anular ventas e invitar usuarios.
              </li>
              <li>
                <strong className="text-foreground">Desactivar</strong> impide el acceso sin
                borrar el historial.
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="size-4" /> Equipo
          </CardTitle>
          <CardDescription>
            {isLoading
              ? 'Cargando...'
              : `${users.length} usuario${users.length === 1 ? '' : 's'} registrado${users.length === 1 ? '' : 's'}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={users}
            isLoading={isLoading}
            globalFilterPlaceholder="Buscar por nombre, email o rol"
            emptyTitle="Sin usuarios"
            emptyDescription="Invitá al primero con el formulario de arriba."
            pageSize={10}
          />
        </CardContent>
      </Card>

      <AlertDialog
        open={confirm !== null}
        onOpenChange={(open) => {
          if (!open) setConfirm(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMutating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void handleConfirm();
              }}
              disabled={isMutating}
            >
              {isMutating ? 'Aplicando...' : 'Confirmar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
