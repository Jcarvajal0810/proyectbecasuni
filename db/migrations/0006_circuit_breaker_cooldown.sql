-- Circuit breaker con cooldown: una fuente caída debe poder volver.
--
-- Antes, `health_status = 'circuit_open'` era un estado ABSORBENTE: el sync la
-- saltaba para siempre y, como no hacía fetch, nunca acumulaba el éxito que la
--llibera. Un solo corte de red dejaba una fuente muerta de forma permanente.
--
-- `circuit_opened_at` marca cuándo se abrió. Pasado el cooldown se permite UN
-- fetch de prueba (half-open): si funciona vuelve a `healthy`; si falla, el
-- circuito se reabre y el cooldown arranca de nuevo.

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS circuit_opened_at timestamptz;

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS circuit_threshold integer NOT NULL DEFAULT 3;

ALTER TABLE sources
  ADD COLUMN IF NOT EXISTS circuit_cooldown interval NOT NULL DEFAULT interval '6 hours';

-- El umbral y el cooldown son configurables por fuente, no constantes en el
-- código: una API con rate limit necesita más cooldown que un feed estático.
ALTER TABLE sources
  DROP CONSTRAINT IF EXISTS sources_circuit_threshold_positive;
ALTER TABLE sources
  ADD CONSTRAINT sources_circuit_threshold_positive CHECK (circuit_threshold > 0);

ALTER TABLE sources
  DROP CONSTRAINT IF EXISTS sources_circuit_cooldown_positive;
ALTER TABLE sources
  ADD CONSTRAINT sources_circuit_cooldown_positive CHECK (circuit_cooldown > interval '0');

COMMENT ON COLUMN sources.circuit_opened_at IS
  'Momento en que el circuito se abrió. NULL = circuito cerrado.';
COMMENT ON COLUMN sources.circuit_threshold IS
  'Fallos consecutivos antes de abrir el circuito.';
COMMENT ON COLUMN sources.circuit_cooldown IS
  'Espera antes de permitir un fetch de prueba (half-open).';