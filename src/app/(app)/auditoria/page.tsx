'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FileClock, HelpCircle } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DataTable } from '@/components/ui/data-table';
import { FacetedFilter } from '@/components/ui/faceted-filter';
import { useAuth } from '@/hooks/use-auth';
import type { ColumnDef } from '@tanstack/react-table';

type AuditEntry = {
  id: string;
  tableName: string;
  recordId: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  actorId: string | null;
  actorName: string | null;
  actorEmail: string | null;
  oldValues: Record<string, unknown> | null;
  newValues: Record<string, unknown> | null;
  changedFields: string[];
  createdAt: string;
};

function formatValue(v: unknown): string {
  if (v == null) return '—';
  if (typeof v === 'boolean') return v ? 'sí' : 'no';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function ActionBadge({ action }: { action: AuditEntry['action'] }) {
  if (action === 'INSERT')
    return <Badge className="bg-primary/15 text-primary hover:bg-primary/20">Creación</Badge>;
  if (action === 'DELETE') return <Badge variant="destructive">Eliminación</Badge>;
  return <Badge variant="secondary">Modificación</Badge>;
}

function TableBadge({ table }: { table: string }) {
  const labels: Record<string, string> = {
    products: 'Producto',
    profiles: 'Usuario',
  };
  return <Badge variant="outline">{labels[table] ?? table}</Badge>;
}

const columns: ColumnDef<AuditEntry>[] = [
  {
    accessorKey: 'createdAt',
    header: 'Fecha',
    meta: { label: 'Fecha' },
    cell: ({ row }) => (
      <div className="text-xs text-muted-foreground tabular-nums whitespace-nowrap">
        {new Date(row.original.createdAt).toLocaleString('es-PE', {
          dateStyle: 'short',
          timeStyle: 'medium',
        })}
      </div>
    ),
    sortingFn: 'datetime',
  },
  {
    accessorKey: 'actorName',
    header: 'Usuario',
    meta: { label: 'Usuario' },
    cell: ({ row }) => (
      <div className="flex flex-col">
        <span className="font-medium">{row.original.actorName ?? 'Sistema'}</span>
        {row.original.actorEmail ? (
          <span className="text-xs text-muted-foreground">{row.original.actorEmail}</span>
        ) : null}
      </div>
    ),
  },
  {
    accessorKey: 'tableName',
    header: 'Tabla',
    meta: { label: 'Tabla' },
    cell: ({ row }) => <TableBadge table={row.original.tableName} />,
  },
  {
    accessorKey: 'action',
    header: 'Acción',
    meta: { label: 'Acción' },
    cell: ({ row }) => <ActionBadge action={row.original.action} />,
  },
  {
    id: 'changes',
    header: 'Cambios',
    meta: { label: 'Cambios' },
    enableSorting: false,
    cell: ({ row }) => {
      const e = row.original;
      if (e.action === 'INSERT') {
        const record = e.newValues ?? {};
        const name = record.name ?? record.barcode ?? e.recordId.slice(0, 8);
        return <span className="text-sm">Creó <strong>{formatValue(name)}</strong></span>;
      }
      if (e.action === 'DELETE') {
        const record = e.oldValues ?? {};
        const name = record.name ?? record.barcode ?? e.recordId.slice(0, 8);
        return <span className="text-sm">Eliminó <strong>{formatValue(name)}</strong></span>;
      }
      // UPDATE — mostrar diff de cada campo cambiado
      const fields = e.changedFields.filter(
        (f) => f !== 'updated_at' && f !== 'created_at',
      );
      if (fields.length === 0) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <div className="flex flex-col gap-0.5 text-xs">
          {fields.slice(0, 3).map((field) => (
            <div key={field}>
              <span className="font-medium text-foreground">{field}:</span>{' '}
              <span className="text-muted-foreground line-through">
                {formatValue(e.oldValues?.[field])}
              </span>{' '}
              <span className="text-primary">→ {formatValue(e.newValues?.[field])}</span>
            </div>
          ))}
          {fields.length > 3 ? (
            <span className="text-muted-foreground">+{fields.length - 3} más…</span>
          ) : null}
        </div>
      );
    },
  },
];

export default function AuditoriaPage() {
  const router = useRouter();
  const { session, currentUser, status } = useAuth();
  const accessToken = session?.access_token ?? null;
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTables, setSelectedTables] = useState<string[]>([]);
  const [selectedActions, setSelectedActions] = useState<string[]>([]);

  useEffect(() => {
    if (status === 'authenticated' && currentUser?.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [status, currentUser, router]);

  const loadAudit = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/audit', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        const data = await response.json();
        setEntries(Array.isArray(data.entries) ? data.entries : []);
      }
    } catch (error) {
      console.error('loadAudit', error);
    } finally {
      setIsLoading(false);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAudit();
  }, [loadAudit]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      if (selectedTables.length > 0 && !selectedTables.includes(e.tableName)) return false;
      if (selectedActions.length > 0 && !selectedActions.includes(e.action)) return false;
      return true;
    });
  }, [entries, selectedTables, selectedActions]);

  if (!accessToken || currentUser?.role !== 'admin') return null;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
          Administración
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Auditoría</h1>
        <p className="text-sm text-muted-foreground">
          Registro de cambios en productos y usuarios con trazabilidad de autor.
        </p>
      </div>

      <Card>
        <Accordion type="single" collapsible>
          <AccordionItem value="help" className="border-0">
            <AccordionTrigger className="px-6 py-4 hover:no-underline">
              <div className="flex items-center gap-2 text-sm">
                <HelpCircle className="size-4 text-primary" />
                <span className="font-medium">¿Qué se audita?</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-6 pb-6">
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Cada vez que se <strong className="text-foreground">crea, modifica o elimina</strong>{' '}
                  un producto o un usuario, el sistema registra quién lo hizo, cuándo, y qué campos
                  cambiaron. El log es <strong className="text-foreground">inmutable</strong>: no se
                  puede editar ni borrar desde la UI.
                </p>
                <p>
                  Se mantienen los últimos <strong className="text-foreground">200 eventos</strong>.
                  Las ventas y los movimientos de inventario tienen su propia trazabilidad en sus
                  tablas con <code>sold_by</code>, <code>created_by</code> y
                  <code>voided_by</code>.
                </p>
              </div>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <FileClock className="size-4" /> Eventos registrados
          </CardTitle>
          <CardDescription>
            {isLoading ? 'Cargando...' : `${entries.length} evento${entries.length === 1 ? '' : 's'} — ordenados por fecha descendente`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable
            columns={columns}
            data={filteredEntries}
            isLoading={isLoading}
            globalFilterPlaceholder="Buscar por usuario, tabla, acción..."
            emptyTitle="Sin eventos"
            emptyDescription="Cuando modifiques productos o usuarios, los cambios aparecen acá."
            pageSize={15}
            toolbar={
              <>
                <FacetedFilter
                  title="Tabla"
                  options={[
                    { label: 'Productos', value: 'products' },
                    { label: 'Usuarios', value: 'profiles' },
                  ]}
                  selected={selectedTables}
                  onChange={setSelectedTables}
                />
                <FacetedFilter
                  title="Acción"
                  options={[
                    { label: 'Creación', value: 'INSERT' },
                    { label: 'Modificación', value: 'UPDATE' },
                    { label: 'Eliminación', value: 'DELETE' },
                  ]}
                  selected={selectedActions}
                  onChange={setSelectedActions}
                />
              </>
            }
            csv={{
              filename: `auditoria-${new Date().toISOString().slice(0, 10)}`,
              columns: [
                { header: 'Fecha', accessor: (r) => new Date(r.createdAt).toLocaleString('es-PE') },
                { header: 'Usuario', accessor: (r) => r.actorName ?? 'Sistema' },
                { header: 'Email', accessor: (r) => r.actorEmail ?? '' },
                { header: 'Tabla', accessor: (r) => r.tableName },
                { header: 'Acción', accessor: (r) => r.action },
                { header: 'Record ID', accessor: (r) => r.recordId },
                { header: 'Campos cambiados', accessor: (r) => r.changedFields.join('; ') },
                { header: 'Valores nuevos', accessor: (r) => JSON.stringify(r.newValues) },
              ],
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
