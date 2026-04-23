'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { Loader2, MailPlus } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { inviteFormSchema, type InviteFormValues } from '@/lib/form-schemas';

type InviteFormProps = {
  accessToken: string;
  onInvited?: () => void | Promise<void>;
};

const defaults: InviteFormValues = {
  email: '',
  name: '',
  role: 'worker',
};

export function InviteForm({ accessToken, onInvited }: InviteFormProps) {
  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: defaults,
  });

  async function onSubmit(values: InviteFormValues) {
    try {
      const response = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          email: values.email,
          name: values.name?.trim() || undefined,
          role: values.role,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        toast.error(data?.error ?? 'No se pudo enviar la invitación.');
        return;
      }

      toast.success(`Invitación enviada a ${values.email}.`);
      form.reset(defaults);
      await onInvited?.();
    } catch (error) {
      console.error('invite submit', error);
      toast.error('Error de conexión al enviar la invitación.');
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email del invitado</FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="nuevo@tienda.com"
                  autoComplete="off"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre (opcional)</FormLabel>
              <FormControl>
                <Input placeholder="Ana Pérez" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="worker">Worker (ventas + inventario)</SelectItem>
                  <SelectItem value="admin">Admin (acceso completo)</SelectItem>
                </SelectContent>
              </Select>
              <FormDescription>
                Los admin pueden crear productos, hacer ajustes de inventario e invitar usuarios.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? (
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
    </Form>
  );
}
