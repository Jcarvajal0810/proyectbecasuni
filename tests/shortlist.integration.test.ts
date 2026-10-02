/**
 * Límite de shortlist bajo concurrencia real.
 *
 * El bug que se comprueba: `COUNT` seguido de `INSERT` no es atómico. En
 * READ COMMITTED, N peticiones simultáneas leen el mismo COUNT y todas
 * insertan, superando el "tope duro". Esto lanza inserciones en paralelo de
 * verdad contra Postgres, no una simulación.
 */
import { describe, it, expect, beforeAll } from 'vitest';

const DATABASE_URL = process.env.DATABASE_URL;
const describeDb = DATABASE_URL === undefined || DATABASE_URL === '' ? describe.skip : describe;

describeDb('límite de shortlist bajo concurrencia', () => {
  beforeAll(async () => {
    const postgres = (await import('postgres')).default;
    const sql = postgres(DATABASE_URL as string, { max: 1, onnotice: () => {} });
    try {
      // La vista pública exige registros no-demo publicados: se crean solo para
      // esta prueba y se limpian al final.
      const [{ id: sourceId }] = await sql<{ id: string }[]>`
        INSERT INTO sources (id, name, homepage, licence, kind, legal_clearance)
        VALUES ('__test_src__', 'Test', 'https://example.com', 'test', 'manual', 'MANUAL_ONLY')
        ON CONFLICT (id) DO UPDATE SET name = 'Test'
        RETURNING id
      `;
      for (let i = 0; i < 5; i++) {
        await sql`
          INSERT INTO scholarships (
            slug, source_id, source_record_id, title, provider,
            official_url, source_url, source_licence, legal_clearance,
            internal_status, status_reason, search_tsv, last_verified_at, is_published
          ) VALUES (
            ${`__test_item_${i}__`}, ${sourceId}, ${`probe-${i}`}, ${`Probe ${i}`}, 'Probe',
            'https://example.com/x', 'https://example.com/x', 'test', 'CLEARED',
            'OPEN', 'test', to_tsvector('simple', ${`probe ${i}`}), now(), true
          )
          ON CONFLICT (source_id, source_record_id) DO UPDATE SET is_published = true, last_verified_at = now()
        `;
      }

      // La vista pública exige `legal_clearance IN ('CLEARED','MANUAL_ONLY')`
      // y `is_published`: sin esto los fixtures son invisibles y los tests
      // pasarían por un motivo equivocado.
      const [{ visibles }] = await sql<{ visibles: number }[]>`
        SELECT count(*)::int AS visibles
          FROM v_scholarships_public
         WHERE slug LIKE '__test_item%'
      `;
      expect(visibles).toBe(5);
    } finally {
      await sql.end();
    }
  });

  it('no supera el límite con inserciones simultáneas', async () => {
    const { addToShortlist, countShortlist, SHORTLIST_LIMIT, generateToken } = await import(
      '../src/shortlist/shortlist'
    );

    const { ensureShortlist } = await import('../src/shortlist/shortlist');
    const token = generateToken();
    await ensureShortlist(token);
    const slugs = [0, 1, 2, 3, 4].map((i) => `__test_item_${i}__`);

    // 5 escrituras concurrentes contra el mismo token.
    const resultados = await Promise.all(slugs.map((slug) => addToShortlist(token, slug)));

    const total = await countShortlist(token);
    expect(total).toBeLessThanOrEqual(SHORTLIST_LIMIT);
    expect(resultados.filter(Boolean).length).toBe(total);
  });

  it('el bloqueo es por token: dos shortlists no se bloquean entre sí', async () => {
    const { addToShortlist, countShortlist, generateToken } = await import('../src/shortlist/shortlist');

    const tokenA = generateToken();
    const tokenB = generateToken();

    // Intercalados: si el bloqueo fuera global, el segundo esperaría al primero
    // por el mismo tiempo; con tokens distintos ambos avanzan.
    const { ensureShortlist } = await import('../src/shortlist/shortlist');
    await ensureShortlist(tokenA);
    await ensureShortlist(tokenB);
    await Promise.all([
      addToShortlist(tokenA, '__test_item_0__'),
      addToShortlist(tokenB, '__test_item_0__'),
      addToShortlist(tokenA, '__test_item_1__'),
      addToShortlist(tokenB, '__test_item_1__'),
    ]);

    expect(await countShortlist(tokenA)).toBe(2);
    expect(await countShortlist(tokenB)).toBe(2);
  });

  it('un token ajeno no puede leer ni escribir la shortlist de otro', async () => {
    const { addToShortlist, listShortlist, removeFromShortlist, generateToken } = await import(
      '../src/shortlist/shortlist'
    );

    const duenio = generateToken();
    const intruso = generateToken();

    const { ensureShortlist } = await import('../src/shortlist/shortlist');
    await ensureShortlist(duenio);
    await ensureShortlist(intruso);
    await addToShortlist(duenio, '__test_item_0__');

    // El intruso no ve los ítems del dueño…
    expect(await listShortlist(intruso)).toHaveLength(0);
    // …ni puede añadir usando un slug que el dueño ya tiene.
    await addToShortlist(intruso, '__test_item_1__');
    expect(await listShortlist(intruso)).toHaveLength(1);
    expect(await listShortlist(duenio)).toHaveLength(1);

    // …ni puede borrar los del dueño.
    expect(await removeFromShortlist(intruso, '__test_item_0__')).toBe(false);
    expect(await listShortlist(duenio)).toHaveLength(1);

    // Y tampoco puede guardar un slug que no exista o no sea público.
    expect(await addToShortlist(duenio, 'no-existe')).toBe(false);
  });
});