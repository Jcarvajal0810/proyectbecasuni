-- 0004_sync_run_outcomes.sql
-- Corrige el CHECK de `sync_runs.outcome`.
--
-- El pipeline de sync emite seis outcomes distintos, pero la CHECK de 0001 solo
-- admite cuatro ('ok','not_modified','failed','skipped_locked'). Cualquier corrida
-- de una fuente manual o con kill switch habría violado el CHECK y abortado el
-- INSERT: la auditoría del sync fallaría justo en los casos que más importan
-- registrar. Los outcomes se separaron en el código; el schema se iguala aquí.
--
-- Nota: los outcomes de salto llevan `fetch_outcome = NULL` porque no hubo fetch.

ALTER TABLE sync_runs DROP CONSTRAINT IF EXISTS sync_runs_outcome_check;

ALTER TABLE sync_runs
  ADD CONSTRAINT sync_runs_outcome_check
  CHECK (outcome IN (
    'ok',
    'not_modified',
    'failed',
    'skipped_locked',
    'skipped_manual',
    'skipped_kill_switch',
    'skipped_circuit_open'
  ));