#!/usr/bin/env node
/**
 * Fixture de desarrollo. Todo entra con `is_demo = true`, y la vista pública
 * filtra `NOT is_demo`, así que nada de esto llega al sitio.
 *
 * Sirve para probar la UI y el read model sin tocar la red ni el corpus real.
 *
 *   npm run db:seed
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined || DATABASE_URL === '') {
  console.error('Falta DATABASE_URL.');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

/**
 * Campos que se inventan y solo existen para probar. Deliberadamente incluye
 * `deadline_at` en pasado y en futuro, y un caso sin deadline, para ejercitar
 * las ramas del countdown.
 */
const DEMO = [
  {
    slug: 'demo-master-verificacion-deja-diez-dias',
    title: 'Demo · Master de Verificación con deadline en 10 días',
    provider: 'Demo University',
    officialUrl: 'https://example.edu/demo/verificacion',
    level: 'MASTER',
    fundingType: 'PARTIAL',
    countryIso2: 'ES',
    deadlineOffsetDays: 10,
    sourceStatus: 'OPEN',
    deadlineBasis: 'publisher_stated',
    deadlinePrecision: 'DATE',
    deadlineTz: 'Europe/Madrid',
  },
  {
    slug: 'demo-master-pasado-debe-salir-expirado',
    title: 'Demo · Master con deadline ya pasado',
    provider: 'Demo University',
    officialUrl: 'https://example.edu/demo/pasado',
    level: 'MASTER',
    fundingType: 'FULL',
    countryIso2: 'DE',
    deadlineOffsetDays: -3,
    sourceStatus: null,
    deadlineBasis: 'publisher_stated',
    deadlinePrecision: 'DATE',
    deadlineTz: 'Europe/Berlin',
  },
  {
    slug: 'demo-master-sin-deadline-no-debe-mostrar-cuenta-atras',
    title: 'Demo · Master sin deadline publicado',
    provider: 'Demo Polytechnic',
    officialUrl: 'https://example.edu/demo/sin-deadline',
    level: 'MASTER',
    fundingType: 'UNKNOWN',
    countryIso2: 'NL',
    deadlineOffsetDays: null,
    sourceStatus: null,
    deadlineBasis: 'unknown',
    deadlinePrecision: 'UNKNOWN',
    deadlineTz: null,
  },
  {
    slug: 'demo-doctorado-proximos-48-horas',
    title: 'Demo · Doctorado con fecha límite en horas',
    provider: 'Demo Institute',
    officialUrl: 'https://example.edu/demo/horas',
    level: 'PHD',
    fundingType: 'STIPEND',
    countryIso2: 'FR',
    deadlineOffsetHours: 30,
    sourceStatus: 'OPEN',
    deadlineBasis: 'publisher_stated',
    deadlinePrecision: 'HOUR',
    deadlineTz: 'Europe/Paris',
  },
];

async function main() {
  await sql`
    INSERT INTO sources (id, name, homepage, licence, kind, legal_clearance)
    VALUES ('demo', 'Demo (solo desarrollo)', 'https://example.edu', 'N/A — datos ficticios',
            'manual', 'CLEARED')
    ON CONFLICT (id) DO NOTHING
  `;

  for (const row of DEMO) {
    const deadlineAt =
      row.deadlineOffsetHours !== undefined
        ? new Date(Date.now() + row.deadlineOffsetHours * 3_600_000)
        : row.deadlineOffsetDays !== null
          ? new Date(Date.now() + row.deadlineOffsetDays * 86_400_000)
          : null;

    await sql`
      INSERT INTO scholarships (
        slug, source_id, source_record_id, title, provider, university,
        official_url, source_url, application_url, country_iso2, level, fields,
        funding_type, source_status, internal_status, status_confidence,
        status_reason, deadline_at, deadline_basis, deadline_precision,
        deadline_tz, source_licence, legal_clearance, discovered_via, curator,
        last_verified_at, last_seen_at, is_published, is_demo, search_tsv
      ) VALUES (
        ${row.slug}, 'demo', ${row.slug}, ${row.title}, ${row.provider}, NULL,
        ${row.officialUrl}, ${row.officialUrl}, ${row.officialUrl},
        ${row.countryIso2}, ${row.level}, ${[row.level]},
        ${row.fundingType}, ${row.sourceStatus},
        ${row.deadlineOffsetDays !== null && row.deadlineOffsetDays < 0 ? 'EXPIRED' : 'OPEN'},
        'HIGH', 'Registro de demostración', ${deadlineAt}, ${row.deadlineBasis},
        ${row.deadlinePrecision}, ${row.deadlineTz},
        'N/A — datos ficticios', 'CLEARED', 'manual', 'seed',
        now(), now(), true, true,
        to_tsvector('simple', ${`${row.title} ${row.provider}`})
      )
      ON CONFLICT (slug) DO NOTHING
    `;
  }

  console.log(`Demo insertados: ${DEMO.length} (is_demo=true, invisibles en el sitio)`);
  await sql.end();
}

main().catch(async (error) => {
  console.error('Fallo el seed:', error instanceof Error ? error.message : error);
  await sql.end();
  process.exit(1);
});