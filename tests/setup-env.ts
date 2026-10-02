/**
 * Carga .env.local para que los tests de integración contra la DB real puedan
 * conectarse. Si no existe, los tests se omiten solos: `npm test` funciona
 * sin base de datos.
 */
import { loadEnvFile } from 'node:process';

try {
  loadEnvFile('.env.local');
} catch {
  // Sin .env.local: los tests de integración se saltan.
}