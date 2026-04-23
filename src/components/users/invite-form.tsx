'use client';

import { useState, type FormEvent } from 'react';
import { Loader2, MailPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type InviteFormProps = {
  accessToken: string;
  onInvited?: () => void | Promise<void>;
};

export function InviteForm({ accessToken, onInvited }: InviteFormProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'worker' | 'admin'>('worker');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!email.trim()) {
      toast.error('Falta el email del invitado.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: email.trim(),
          name: name.trim() || undefined,
          role,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo enviar la invitación.');
        return;
      }

      toast.success(`Invitación enviada a ${email.trim()}.`);
      setEmail('');
      setName('');
      setRole('worker');
      await onInvited?.();
    } catch (error) {
      console.error('invite submit', error);
      toast.error('Error de conexión al enviar la invitación.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email del invitado</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nuevo@tienda.com"
          autoComplete="off"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Nombre (opcional)</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ana Pérez"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="role">Rol</Label>
        <Select value={role} onValueChange={(v) => setRole(v as 'worker' | 'admin')}>
          <SelectTrigger id="role">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="worker">Worker (ventas + inventario)</SelectItem>
            <SelectItem value="admin">Admin (acceso completo)</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          Los admin pueden crear productos, hacer ajustes de inventario e invitar usuarios.
        </p>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Enviando...
          </>
        ) : (
          <>
            <MailPlus className="mr-2 size-4" />
            Enviar invitación
          </>
        )}
      </Button>
    </form>
  );
}
