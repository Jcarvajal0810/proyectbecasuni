#!/usr/bin/env node
/**
 * Runner de migraciones. Aplica los .sql de db/migrations en orden lexicográfico
 * y los registra en schema_migrations, de modo que un run repetido es no-op.
 *
 *   npm run db:migrate
 */

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined || DATABASE_URL === '') {
  console.error('Falta DATABASE_URL. No se puede migrar.');
  process.exit(1);
}

const MIGRATIONS_DIR = join(process.cwd(), 'db', 'migrations');
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });

async function main() {
  await sql`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )
  `;

  const rows = await sql`SELECT name FROM schema_migrations`;
  const applied = new Set(rows.map((row) => row.name));
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  for (const file of files) {
    if (applied.has(file)) {
      console.log(`= ${file} (ya aplicada)`);
      continue;
    }
    const body = readFileSync(join(MIGRATIONS_DIR, file), 'utf8');
    await sql.unsafe(body);
    await sql`INSERT INTO schema_migrations (name) VALUES (${file})`;
    console.log(`+ ${file}`);
  }

  console.log(`\nMigraciones aplicadas: ${files.length - applied.size} de ${files.length}`);
  await sql.end();
}

main().catch(async (error) => {
  console.error('Fallo la migración:', error instanceof Error ? error.message : error);
  await sql.end();
  process.exit(1);
});