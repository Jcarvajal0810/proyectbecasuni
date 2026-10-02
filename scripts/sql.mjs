#!/usr/bin/env node
/**
 * Ejecuta una sentencia SQL suelta desde la línea de comandos.
 * Para diagnóstico puntual durante el desarrollo; no forma parte del pipeline.
 *
 *   node --env-file-if-exists=.env.local scripts/sql.mjs "SELECT 1"
 */

import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL;
if (DATABASE_URL === undefined || DATABASE_URL === '') {
  console.error('Falta DATABASE_URL');
  process.exit(1);
}

const statement = process.argv[2];
if (statement === undefined || statement === '') {
  console.error('Uso: npm run sql -- "<sql>"');
  process.exit(1);
}

const sql = postgres(DATABASE_URL, { max: 1, connect_timeout: 10, onnotice: () => {} });

try {
  const rows = await sql.unsafe(statement);
  console.log(JSON.stringify(rows, null, 2));
} catch (error) {
  console.error('ERROR:', error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
} finally {
  await sql.end();
}