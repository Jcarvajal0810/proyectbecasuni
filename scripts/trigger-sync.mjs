#!/usr/bin/env node
/**
 * Dispara el sync firmando la petición como haría QStash.
 *
 *   node scripts/trigger-sync.mjs
 *
 * Genera una clave de idempotencia nueva en cada invocación: reutilizarla a
 * propósito devolvería 409, que es la respuesta correcta ante un replay.
 */

import { createHmac, randomBytes } from 'node:crypto';

const SECRET = process.env.JOB_HMAC_SECRET;
if (SECRET === undefined || SECRET === '') {
  console.error('Falta JOB_HMAC_SECRET.');
  process.exit(1);
}

const TARGET =
  process.env.SYNC_URL ?? 'http://localhost:3000/api/jobs/sync';
const BODY = JSON.stringify({ reason: process.argv[2] ?? 'manual' });
const IDEM_KEY = randomBytes(12).toString('base64url');

const timestamp = Date.now();
const signature = createHmac('sha256', SECRET)
  .update(`${timestamp}.${IDEM_KEY}.${BODY}`)
  .digest('hex');

const response = await fetch(TARGET, {
  method: 'POST',
  headers: {
    'content-type': 'application/json',
    'x-job-signature': `${timestamp}.${IDEM_KEY}.${signature}`,
    'x-job-idem-key': IDEM_KEY,
  },
  body: BODY,
});

console.log(`${response.status} ${response.statusText}`);
console.log(await response.text());