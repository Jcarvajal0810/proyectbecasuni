-- 0005_alert_dedupe.sql
-- Estado de "ya avisado" para el alerting del cron.
--
-- No se guarda en memoria: el proceso de Vercel es efímero y un `Map` se pierde
-- en cada invocación, así que el cron nunca sabría que ya notificó y repetiría
-- la alerta cada día hasta que el usuario la silenciara — que es exactamente
-- como deja de funcionar el alerting.
--
-- `sync_runs.source_id` referencia `sources(id)`, pero un marcador de alerta no
-- es una fuente: es un estado del sistema ("staleness"). Una FK aquí obligaría
-- a inventar una fuente ficticia por cada alerta, así que la clave es texto con
-- un CHECK de prefijo que la ata a este módulo.

CREATE TABLE IF NOT EXISTS alert_state (
  key          text PRIMARY KEY
               CHECK (key LIKE 'alert:%'),
  last_sent_at timestamptz NOT NULL DEFAULT now(),
  last_result  text        NOT NULL DEFAULT 'sent'
               CHECK (last_result IN ('sent','failed','not_configured'))
);

-- La clave es la clave primaria, así que la consulta natural es por clave. Este
-- índice cubre el barrido de "qué está viejo", que usa la vista de abajo.
CREATE INDEX IF NOT EXISTS alert_state_sent_idx
  ON alert_state (last_sent_at);

-- Vista de lectura para el barrido. Derivada, no columna almacenada: una
-- antigüedad cacheada en tabla se desincroniza del `last_sent_at` que la
-- justifica, que es el mismo error que un `countdown_raw` guardado.
CREATE OR REPLACE VIEW v_alerts_requiring_attention AS
SELECT
  key,
  last_sent_at,
  EXTRACT(HOUR FROM (now() - last_sent_at))::int AS hours_since,
  last_result
FROM alert_state
ORDER BY last_sent_at ASC;