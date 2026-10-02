-- Shortlist anónima (D5). Sin login: un token opaco en cookie httpOnly es la
-- única credencial, y se guarda SOLO hasheado para que un dump de la tabla no
-- sirva para autenticarse.
--
-- El scoping por `owner_token_hash` está en cada consulta, no en el código: un
-- fallo de scoping sería entonces un fallo de SQL, revisable.

CREATE TABLE IF NOT EXISTS shortlists (
  owner_token_hash char(64) PRIMARY KEY,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shortlist_items (
  owner_token_hash  char(64)   NOT NULL REFERENCES shortlists(owner_token_hash) ON DELETE CASCADE,
  scholarship_slug  text       NOT NULL,
  added_at          timestamptz NOT NULL DEFAULT now(),

  PRIMARY KEY (owner_token_hash, scholarship_slug)
);

-- Un slug no puede repetirse para el mismo propietario (ya está en la PK), pero
-- sí hace falta el índice inverso para "cuánta gente guardó esto".
CREATE INDEX IF NOT EXISTS shortlist_items_by_slug_idx
  ON shortlist_items (scholarship_slug);

-- Tope duro de 200 elementos por shortlist. Se aplica en el endpoint porque un
-- CHECK con subconsulta no es posible en Postgres.
COMMENT ON TABLE shortlists IS
  'Shortlists anónimas sin login. El token es un secreto de portador: quien lo '
  'tiene, tiene la lista. No contiene datos personales ni es recuperable.';