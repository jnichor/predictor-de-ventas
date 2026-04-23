'use client';

import { useEffect } from 'react';
import { supabase } from '@/lib/supabase/client';

type RealtimeTableOptions = {
  /** Tabla de Supabase a suscribirse */
  table: string;
  /** Schema, default 'public' */
  schema?: string;
  /** Callback al recibir un evento INSERT/UPDATE/DELETE */
  onChange: () => void | Promise<void>;
  /** Si false, la suscripción no se activa (útil para toggling por prop) */
  enabled?: boolean;
};

/**
 * Hook que se suscribe a cambios en una tabla de Supabase vía Realtime.
 *
 * REQUIERE: habilitar Realtime para la tabla en Supabase Dashboard →
 *   Database → Replication → seleccionar la tabla → "Enable Realtime".
 *
 * Uso:
 *   useRealtimeTable({
 *     table: 'sales',
 *     onChange: () => loadData(),
 *   });
 *
 * El callback se dispara UNA vez por evento (INSERT/UPDATE/DELETE).
 * Nota: el evento NO trae la data del cambio — sólo avisa que hay cambio.
 * El callback debe volver a fetchear la data fresca.
 */
export function useRealtimeTable({
  table,
  schema = 'public',
  onChange,
  enabled = true,
}: RealtimeTableOptions) {
  useEffect(() => {
    if (!enabled || !supabase) return;

    const channel = supabase
      .channel(`realtime:${schema}:${table}`)
      .on(
        'postgres_changes',
        { event: '*', schema, table },
        () => {
          void onChange();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [table, schema, onChange, enabled]);
}
