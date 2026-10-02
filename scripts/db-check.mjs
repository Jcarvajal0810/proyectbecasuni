#!/usr/bin/env node
/**
 * Comprueba la conexión a la base de datos SIN imprimir la URL.
 *
 *   npm run db:check
 *
 * Existe para poder validar la URL antes de correr migraciones destructivas:
 * si el puerto es el equivocado o la contraseña está mal codificada, este
 * script falla en un segundo con un mensaje claro, en vez de dejar una
 * migración a medias.
 *
 * La URL lleva la contraseña, así que **nunca** se imprime. Solo se reportan
 * host, puerto, base y usuario.
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined || DATABASE_URL === '') {
  console.error('Falta DATABASE_URL. Copia .env.example a .env.local y rellénala.');
  process.exit(1);
}

// Extrae las partes sin resolver la contraseña para no mostrarla.
const parsed = new URL(DATABASE_URL);
const safe = {
  host: parsed.hostname,
  port: parsed.port || '5432',
  database: parsed.pathname.replace(/^\//, ''),
  user: parsed.username,
};

console.log('Probando conexión…');
console.log(`  host     : ${safe.host}`);
console.log(`  port     : ${safe.port}`);
console.log(`  database : ${safe.database}`);
console.log(`  user     : ${safe.user}`);

if (safe.port === '6543') {
  console.warn(
    '\n  AVISO: puerto 6543 = Transaction mode. Se usa el 5432 (Session mode).',
  );
}

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 10, onnotice: () => {} });

try {
  const [row] = await sql`
    SELECT current_database() AS database,
           current_user       AS user,
           version()          AS version
  `;

  console.log('\nConexión OK.');
  console.log(`  server   : ${String(row.version).split(' ').slice(0, 2).join(' ')}`);

  // Las extensiones son el primer fallo posible de `db:migrate`: si `unaccent`
  // o `pg_trgm` no están disponibles, falla el CREATE EXTENSION.
  const extensions = await sql`
    SELECT extname FROM pg_extension ORDER BY extname
  `;
  const installed = extensions.map((e) => e.extname);
  console.log(`  ext      : ${installed.join(', ')}`);

  const required = ['pgcrypto', 'unaccent', 'pg_trgm'];
  const missing = required.filter((name) => !installed.includes(name));
  if (missing.length > 0) {
    console.warn(`\n  AVISO: faltan extensiones: ${missing.join(', ')}`);
    console.warn('  La migración 0001 intenta crearlas. Si no tienes permiso, actívalas');
    console.warn('  en el panel: Database → Extensions.');
  }

  const tables = await sql`
    SELECT count(*)::int AS n
      FROM information_schema.tables
     WHERE table_schema = 'public'
  `;
  console.log(`  tablas   : ${tables[0].n} en public`);
  console.log(
    tables[0].n === 0
      ? '\nBase vacía. Ejecuta: npm run db:migrate'
      : '\nEl esquema ya existe. Las migraciones pendientes se aplican igual.',
  );

  await sql.end();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('\nConexión FALLIDA.');
  console.error(`  ${message}`);

  if (/password authentication failed/i.test(message)) {
    console.error('\n  → La contraseña es incorrecta, o tiene caracteres especiales');
    console.error('    sin percent-encodear (@ → %40, : → %3A, / → %2F, # → %23).');
  } else if (/ENOTFOUND|EAI_AGAIN/i.test(message)) {
    console.error('\n  → El host no resuelve. Comprueba el nombre del pooler.');
  } else if (/timeout|ETIMEDOUT|ECONNREFUSED/i.test(message)) {
    console.error('\n  → Timeout. Prueba el pooler Session (puerto 5432), no el directo.');
  } else if (/password must be percent-encoded|invalid URI/i.test(message)) {
    console.error('\n  → La URL está mal formada. Codifica los caracteres especiales.');
  }

  await sql.end().catch(() => {});
  process.exit(1);
}