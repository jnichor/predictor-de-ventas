import { NextResponse } from 'next/server';
import { adminSupabase } from '@/lib/supabase/server';

/**
 * GET /api/health
 *
 * Endpoint público de healthcheck — responde si el servidor está vivo.
 * Opcionalmente chequea la conexión a Supabase con un SELECT trivial.
 *
 * Uso:
 *   - Monitoreo uptime (UptimeRobot, BetterStack, etc.)
 *   - Debug rápido si la app cae: ¿es frontend o backend?
 *   - Vercel health checks para deployments canary
 */
export async function GET() {
  const startedAt = Date.now();

  const checks: Record<string, { ok: boolean; latencyMs?: number; message?: string }> = {
    server: { ok: true },
  };

  // Chequeo de Supabase (si está configurado)
  if (adminSupabase) {
    const supaStart = Date.now();
    try {
      // Query trivial: cuenta filas de una tabla pública sin leer data
      const { error } = await adminSupabase
        .from('profiles')
        .select('id', { count: 'exact', head: true });
      checks.supabase = {
        ok: !error,
        latencyMs: Date.now() - supaStart,
        message: error?.message,
      };
    } catch (error) {
      checks.supabase = {
        ok: false,
        latencyMs: Date.now() - supaStart,
        message: error instanceof Error ? error.message : 'unknown',
      };
    }
  } else {
    checks.supabase = { ok: false, message: 'not configured' };
  }

  const allOk = Object.values(checks).every((c) => c.ok);

  return NextResponse.json(
    {
      status: allOk ? 'ok' : 'degraded',
      checks,
      totalLatencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
    },
    {
      status: allOk ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store',
      },
    },
  );
}
