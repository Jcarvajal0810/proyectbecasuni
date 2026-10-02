import { NextResponse } from 'next/server';
import { isDatabaseConfigured } from '@/db/client';
import { getCorpusStats } from '@/db/queries';
import { dataHealth, healthDegraded, type DataHealth } from '@/core/deadline/freshness';

/**
 * Health check para Vercel y para el smoke test.
 *
 * Distingue dos fallos que un simple `status: ok` mezcla: que la app no esté
 * desplegada, y que esté desplegada pero sirviendo datos viejos. El segundo es
 * el peligroso — el sitio sigue online y verificador, solo que miente sobre su
 * frescura. Por eso devuelve 503 cuando el corpus está crítico.
 *
 * No revela nada sensible: ni credenciales, ni rutas, ni detalle de la DB.
 */
export async function GET(): Promise<NextResponse> {
  let database: 'configured' | 'unconfigured' = 'unconfigured';
  let health: DataHealth | null = null;

  if (isDatabaseConfigured()) {
    try {
      const stats = await getCorpusStats();
      database = 'configured';
      health = dataHealth(stats);
    } catch {
      database = 'unconfigured';
    }
  }

  const degraded = health !== null && healthDegraded(health);

  return NextResponse.json(
    {
      status: degraded ? 'degraded' : 'ok',
      database,
      // El estado de frescura solo significa algo si hay datos que medir.
      data: health,
      now: new Date().toISOString(),
    },
    {
      status: degraded ? 503 : 200,
      headers: { 'cache-control': 'no-store' },
    },
  );
}