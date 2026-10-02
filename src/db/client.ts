import postgres from 'postgres';

/**
 * Cliente Postgres. Server-only: la URL nunca lleva prefijo `NEXT_PUBLIC_`
 * (technical-blueprint §2). Una sola instancia por proceso.
 */
const globalForDb = globalThis as unknown as { __db?: ReturnType<typeof postgres> };

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === '') {
    throw new Error(
      `Falta la variable de entorno ${name}. Sin conexión a la base de datos no se puede leer el catálogo.`,
    );
  }
  return value;
}

export function getDb() {
  if (globalForDb.__db !== undefined) return globalForDb.__db;

  const client = postgres(required('DATABASE_URL'), {
    // En desarrollo el pool es de 1 porque el pooler de Supabase (Transaction
    // mode) multiplexa por transacción. Con max=1 dos escrituras concurrentes
    // desde el mismo proceso se serializan en el cliente y nunca llegan a
    // solaparse en Postgres, así que un bug de concurrencia no se reproduciría.
    max: process.env.NODE_ENV === 'production' ? 5 : 10,
    idle_timeout: 20,
    connect_timeout: 10,
    // El pooling lo gestiona el proveedor; el cliente no debe abrir conexión
    // al importar el módulo.
    prepare: false,
    onnotice: () => {},
  });

  if (process.env.NODE_ENV !== 'production') globalForDb.__db = client;
  return client;
}

/** Identificador de la instalación; solo lectura. */
export function isDatabaseConfigured(): boolean {
  return process.env.DATABASE_URL !== undefined && process.env.DATABASE_URL !== '';
}