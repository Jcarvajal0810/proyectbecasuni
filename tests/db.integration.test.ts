/**
 * Integración contra la DB real. Solo corre si DATABASE_URL está definida, así
 * que `npm test` sigue funcionando sin base de datos.
 */
import { describe, it, expect } from 'vitest';

const DATABASE_URL = process.env.DATABASE_URL;
const describeDb = DATABASE_URL === undefined || DATABASE_URL === '' ? describe.skip : describe;

describeDb('integración con Postgres real', () => {
  it('conecta y resuelve public.f_unaccent sin acentos', async () => {
    const postgres = (await import('postgres')).default;
    const sql = postgres(DATABASE_URL as string, { max: 1, onnotice: () => {} });
    try {
      const [{ limpio }] = await sql.unsafe<{ limpio: string }[]>(
        "SELECT public.f_unaccent('Café Ñandú') AS limpio",
      );
      expect(limpio).toBe('Cafe Nandu');
    } finally {
      await sql.end();
    }
  });

  it('la búsqueda full-text distingue con y sin tilde', async () => {
    const { searchScholarships } = await import('../src/db/queries');
    const conTilde = await searchScholarships({ q: 'Máster', limit: 10 });
    const sinTilde = await searchScholarships({ q: 'Master', limit: 10 });
    // El corpus demo tiene "Master" pero no "Máster": la normalización debe
    // hacer que ambos términos den el mismo resultado.
    expect(conTilde.total).toBe(sinTilde.total);
  });

  it('getCorpusStats devuelve números, no NaN', async () => {
    const { getCorpusStats } = await import('../src/db/queries');
    const stats = await getCorpusStats();
    for (const valor of Object.values(stats)) {
      if (typeof valor === 'number') expect(Number.isFinite(valor)).toBe(true);
    }
  });

  it('la vista pública no expone is_demo ni borrados', async () => {
    const postgres = (await import('postgres')).default;
    const sql = postgres(DATABASE_URL as string, { max: 1, onnotice: () => {} });
    try {
      const [{ filtrados }] = await sql.unsafe<{ filtrados: number }[]>(
        `SELECT count(*)::int AS filtrados
           FROM v_scholarships_public
          WHERE is_demo OR NOT is_published`,
      );
      expect(filtrados).toBe(0);

      // Invariante: si is_demo aparece en la vista, siempre vale false. Se
      // selecciona junto a los demás campos pero el WHERE lo filtra, así que no
      // puede usarse para descubrir registros ocultos.
      const [{ demos }] = await sql.unsafe<{ demos: number }[]>(
        'SELECT count(*)::int AS demos FROM v_scholarships_public WHERE is_demo',
      );
      expect(demos).toBe(0);

      // deleted_at nunca se expone: no hay forma de observar un borrado lógico.
      const [{ borrados }] = await sql.unsafe<{ borrados: number }[]>(
        `SELECT count(*)::int AS borrados
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'v_scholarships_public'
            AND column_name = 'deleted_at'`,
      );
      expect(borrados).toBe(0);
    } finally {
      await sql.end();
    }
  });

  it('status_history guarda el estado anterior, no NULL', async () => {
    const postgres = (await import('postgres')).default;
    const sql = postgres(DATABASE_URL as string, { max: 1, onnotice: () => {} });
    try {
      const [{ nulls }] = await sql.unsafe<{ nulls: number }[]>(
        'SELECT count(*)::int AS nulls FROM status_history WHERE from_status IS NULL',
      );
      expect(nulls).toBe(0);
    } finally {
      await sql.end();
    }
  });
});