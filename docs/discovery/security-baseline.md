# Security Baseline — Scholarship Search Platform

Phase 1 (Discovery). Status: normative for Phase 7 (architecture), re-verified in Phase 12.
Owner: @security. This document defines constraints, not implementation.

Scope: server-side source adapters that fetch third-party pages/feeds, a parse layer
(HTML/JSON/GeoJSON), a sync orchestrator, scheduled jobs, a public read API, admin /
manual-verify endpoints, auth, user saved-items storage, and a static frontend with 3D WebGL.

**Core rule of this project: third-party source content is UNTRUSTED INPUT.** Anything that
originates outside our systems (HTML, JSON, RSS/Atom, CSV, PDF metadata, GeoJSON, HTTP headers,
redirect targets, error pages) is attacker-influenceable. A source operator, a compromised CDN,
a MITM on a misconfigured source, or a scraped page carrying ads/UGC may inject scripts, markup,
payloads, or simply enormous and malformed data. It must be parsed as data, never as code, never
as trusted markup, and never with unbounded resources.

---

## 1. Threat model and attack surface

Legend for trust level:
- **T0 Untrusted remote** — fully attacker-controlled bytes.
- **T1 Semi-trusted** — third-party but curated (official scholarship pages, partner feeds).
- **T2 Internal** — our own services, our stored data as produced by adapters.
- **T3 User-supplied** — authenticated end-user input (saved items, search terms, filters).

| # | Surface | Trust | Reachable by | Worst credible damage |
|---|---|---|---|---|
| 1 | Source adapters (HTTP fetch of third-party pages/feeds) | T0/T1 | Anyone who can influence the source, any network attacker on a bad TLS path, DNS | SSRF into internal services and cloud metadata; credential/secret theft via metadata endpoint; stored XSS in any field later rendered; resource exhaustion (huge payloads, slow-loris, infinite redirects); DoS of our sync capacity; pulling malicious URLs from a source record and having us fetch them |
| 2 | Parse layer (HTML/JSON/GeoJSON/exports) | T0 | Same as #1 | Parser-level RCE or DoS if a permissive/unsafe parser is used; unterminated entity expansion; prototype pollution via deep-merge of JSON; billion-laughs / zip bomb in archives; unbounded arrays becoming huge DB rows; fields silently truncated or type-coerced, corrupting the corpus |
| 3 | Sync orchestrator (diff/merge/dedup/write) | T2 but fed by T0 | Internal jobs | Poisoning the canonical dataset: mass-marking live scholarships CLOSED, overwriting good records with junk, wrong merge creating a false scholarship, silent deletes erasing history |
| 4 | Scheduler / cron endpoints | T2 | Whoever can reach them: cron provider, admin, or the public internet if misconfigured | Unauthenticated re-trigger = cost/DoS amplification and race conditions with concurrent runs; exposure of job internals and source URLs |
| 5 | Public read API | Public | Everyone, bots, scrapers | Unbounded enumeration/scrape of the dataset, key abuse, resource exhaustion, info leak of internal fields via over-broad SELECT or verbose errors |
| 6 | Admin / manual-verify endpoints | High value | Authenticated staff; unauthenticated attacker if not enforced | Data corruption, need re-verify to "unknown" (DoS of trust), mass-edit, disclosure of notes/raw payloads |
| 7 | Auth | — | Everyone | Account takeover, session fixation/hijack, privilege escalation, enumeration of user records |
| 8 | User saved-items storage | T3 | Owner + any IDOR | Cross-user data access (user A reads user B's saved items), deletion of others' items, PII exposure |
| 9 | Static frontend with 3D WebGL | T3 + T0-rendered content | Everyone | Stored XSS in a rich 3D UI is high impact (global app shell, token theft), window opener abuse, GPU resource exhaustion, client bundle leaking internal IDs/endpoints |

### Untrusted-input catalogue (must be treated as hostile even when the source is "official")

- Stored XSS payloads and HTML/script fragments in every free-text field (title, description, notes, eligibility).
- HTML/markdown injection into any rendered surface, including tooltips, map labels, and 3D text sprites.
- Oversized payloads: single HTML page of hundreds of MB, an "application/json" that is a 2 GB array.
- Decompression and expansion bombs: zip/gzip nested, JSON with deep nesting (stack exhaustion on recursive parse/merge).
- Malformed GeoJSON: coordinates out of range, non-finite numbers, self-intersecting polygons, huge coordinate arrays, non-UTF8 encodings.
- Malicious URLs inside source records: `http://169.254.169.254/...`, `file:///etc/passwd`, `gopher://`, `data:text/html,...`, credential-embedded hosts, unicode/punycode homoglyphs, `user@host` confusion.
- HTTP-layer abuse: redirect chains to internal hosts, `Refresh` headers, HTML meta-refresh, HTTP auth challenges, absurd `Content-Length`, chunked bodies that never end.
- Hostile error and challenge pages (Cloudflare interstitial, login walls) that a naive parser would scrape as if they were content.

---

## 2. SSRF — highest risk item

This is the top threat because the server performs outbound fetches and source records may
contain URLs we are tempted to "follow". Cloud metadata (`169.254.169.254`) plus internal
admin services is the classic escalation to full environment compromise.

### 2.1 Mandatory controls

1. **Allowlist of exact hosts per adapter.** Each adapter declares its own exact host list
   (scheme + host + optional port). No wildcards, no suffix matching (`evil-scholarship-org.com`
   must not match `scholarship-org.com`), no user-controlled hosts, no URL derived from user input.
   Matching is on the normalized, lowercased, IDNA-ascii host with the default port stripped.
2. **Scheme allowlist.** Only `https:` and `http:` (prefer https-only per adapter). Reject
   `file:`, `gopher:`, `ftp:`, `data:`, `blob:`, `javascript:`, `dict:`, `ldap:`, `jar:`,
   `netdoc:`, `php:`, `sftp:`, `scp:`, `tftp:`, `ws:`/`wss:`, and any custom scheme.
3. **No cross-scheme/protocol redirects.** Never follow a redirect that changes scheme to something
   outside the allowlist; never allow http → file-style or https → http downgrade by default.
4. **DNS resolution checks on the actual resolved address, not the hostname string.** After
   resolution, every returned A/AAAA record must be public. Reject the request if *any* resolved
   address falls in a blocked range. Blocks at minimum:
   - `0.0.0.0/8`, `10.0.0.0/8`, `100.64.0.0/10` (CGNAT), `127.0.0.0/8`, `169.254.0.0/16`
     (includes `169.254.169.254` cloud metadata), `172.16.0.0/12`, `192.0.0.0/24`,
     `192.0.2.0/24`, `192.88.99.0/24`, `192.168.0.0/16`, `198.18.0.0/15`,
     `198.51.100.0/24`, `203.0.113.0/24`, `224.0.0.0/4` (multicast), `240.0.0.0/4` (reserved),
     `255.255.255.255/32`, IPv4-mapped/compatible IPv6, `::/128`, `::1/128`, `::ffff:0:0/96`,
     `fc00::/7` (ULA), `fe80::/10` (link-local), `ff00::/8` (multicast), `2001:db8::/32`,
     `64:ff9b::/96` (NAT64), `2002::/16` (6to4), Teredo `2001::/32`.
   - Also block hostnames that are literally IP literals for blocked ranges, and `.local`, `.internal`,
     `.localhost`, and single-label intranet names.
5. **Rebinding / TOCTOU defence.** Resolve once, validate the addresses, then **pin the connection to
   the validated IP** while keeping the correct TLS SNI/Host header. Do not re-resolve per redirect
   and do not hand the hostname to a client that will resolve it again. Re-validate every hop.
6. **Redirect policy.** Default `followRedirects: false` — most adapters must not redirect. Where
   redirects are genuinely needed: max 3 hops, absolute cap on total time, and every hop's scheme +
   host + resolved IP re-validated against the same allowlist. A redirect to a non-allowlisted host is
   a hard failure, logged as `redirect_violation`.
7. **Timeouts.** Connect timeout ~5s, total (TTFB + body) timeout ~20–30s per request, plus an overall
   deadline per adapter run and per source. No request may hang.
8. **Response size caps.** Hard cap per response (e.g. 5 MB HTML, 20 MB JSON export, configurable per
   adapter) enforced while streaming — abort the transfer the moment the cap is exceeded, do not buffer
   first. Also cap compressed decompressed bytes (decompression bomb defence), header size, header count,
   and total bytes per run.
9. **Content-type validation.** Only accept an allowlisted content type per adapter
   (`text/html`, `application/json`, `application/geo+json`, `application/rss+xml`,
   `application/atom+xml`, `text/csv`, ...). Ignore or reject `text/html` served as
   `application/octet-stream`, and reject `text/html` bodies for JSON adapters. Detect
   encoding from the body with an explicit allowlist (UTF-8), never trust a bogus charset.
10. **TLS verification on.** No `rejectUnauthorized: false`. Minimum TLS 1.2. Fixed or pinned trust
    store; no custom CA injection from source data.
11. **No proxy env leakage.** Ignore `HTTP_PROXY`/`HTTPS_PROXY`/`NO_PROXY` from the environment for
    adapter calls unless deliberately configured; an attacker who can set env should not redirect
    our egress.
12. **Outbound egress control.** Preferred defence-in-depth: run sync workers in a sandbox/egress-restricted
    environment with no route to the internal network and no access to the cloud metadata address, and
    restrict egress to the allowlisted destinations via egress proxy or host firewall. This is what
    makes the DNS checks non-bypassable in practice. Document the chosen model in Phase 7.
13. **No user-supplied fetch primitive — hard rule.** The public API, search box, admin forms, and URL
    preview/unfurl features must **never** accept a URL and fetch it. If a "test this source" tool is
    ever wanted, it must target a pre-registered source id, never a URL. If a link-preview feature is
    ever added, it goes through a separate hardened service with the same allowlist and a cache — and
    it is out of scope until it is designed.
14. **Request hygiene.** Fixed header set, no user-controlled headers, no credential forwarding on
    redirect, strip `Authorization`/`Cookie` on cross-host redirects, and never follow
    `Refresh`/meta-refresh (treat as an untrusted hint, log and stop).

---

## 3. Responsible scraping / politeness controls

The platform is a guest on other people's infrastructure. Aggressive syncing can take down a small
university scholarship page, which is both a harm to third parties and the fastest way to get our
source URLs blocked or IP-banned.

### 3.1 Request discipline (per domain and per adapter)

- **Per-domain rate limit** and **concurrency cap** (e.g. 1 concurrent request per host, max N workers
  per run). One scheduler job must never fan out to a single site aggressively.
- **Minimum inter-request delay** per domain (e.g. ≥ 2–3 s, jittered).
- **Exponential backoff with full jitter** on 429/5xx/timeouts: e.g. base 5 s, cap 30 min, full jitter.
- **Honour `Retry-After`** (including long values) when present.
- **Circuit breaker per adapter/domain**: after N consecutive failures or a 429/403, open the circuit
  and stop hitting that domain for the rest of the run and for a cooling period. Never hammer a
  site that is telling us to stop.
- **Conditional requests**: persist `ETag` and `Last-Modified` per URL, send `If-None-Match` /
  `If-Modified-Since`, treat `304` as "no change" and skip parsing entirely. Also honour
  `Cache-Control`/`Expires` when larger than our minimum interval.
- **Caching of parsed results** so unchanged sources are never re-parsed.
- **Off-peak scheduling**: full crawls in low-traffic local hours; incremental sync spread across the day.
- **Descriptive `User-Agent`** identifying the project and a real contact address
  (`ScholarshipsPlatformBot/1.0 (+https://<domain>/bot; contact: <email>)`), plus a link to
  `/robots.txt` and a documented policy page. Bots that identify themselves are treated better and
  are easier for admins to allow-list.
- **robots.txt compliance** with a real parser (allow/disallow, longest-match wins, `User-agent`
  grouping, crawl-delay). Caveat to document: robots.txt is **not a licence and not a legal
  authorisation**. Following it is necessary but not sufficient; where content is personal,
  licensed, or non-redistributable, we must not store or republish it regardless of robots.
- **No bypassing** CAPTCHAs, login walls, paywalls, rate limits, IP blocks, or any other access
  control. No user-agent rotation or spoofing, no proxy rotation, no scraping behind an auth barrier.
  If a source is inaccessible, it stays inaccessible.
- **Soft-fail classification**: detect 403, 429, 5xx, empty shells, CAPTCHA/challenge/interstitial
  pages, and "login required" markers. Mark affected records `UNKNOWN` + `needs_review = true` with a
  reason. Never escalate difficulty, never retry aggressively, never treat a challenge page as content.

### 3.2 Fair-use framing

- **Minimise pages fetched.** Prefer feeds, sitemaps, APIs, open datasets, and bulk exports whenever
  a source publishes them. Prefer a listing/detail split: fetch the list, fetch only the details that
  changed (by conditional request or by a cheap freshness check).
- **Only re-verify what needs re-verification.** A **priority queue**:
  P0 records whose deadline is imminent (going CLOSED soon) or whose `needs_review` flag is set;
  P1 records whose source returned 304-worthy freshness signals; P2 stale records well before their
  deadline; P3 archival/expired records.
- **Never re-fetch the whole corpus on every run.** Full refresh is a periodic, deliberate, off-peak
  operation with a documented budget. Incremental runs touch a bounded number of URLs.
- **Cache by content hash** so unchanged pages cost zero parse time and zero write amplification.
- **Log every fetch decision** — URL, adapter, reason (scheduled/priority/re-verify/manual),
  decision (fetch/skip/304/blocked/backoff/circuit-open), status, bytes, duration, ETag. This log is the
  audit trail for "are we being fair?", and it is also the forensic trail for a poisoning incident.
- Per-run budgets: max requests per domain, max total bytes, max wall-clock, then stop cleanly and resume
  next run.

---

## 4. Secrets and configuration

- **Server-only secrets.** Anything sensitive lives in environment variables / a secret manager and is
  read only in server code. `NEXT_PUBLIC_*` variables are inlined into the client bundle and therefore
  public — **no `NEXT_PUBLIC_` secret may ever exist**: no API keys, no database URLs, no admin tokens,
  no signing keys, no source credentials.
- **Type/flow enforcement, not convention.** Add a build-time lint rule and/or CI check that fails on
  `NEXT_PUBLIC_*` names matching secret-ish patterns, and a grep gate for likely credentials in `src/`.
  Also assert in tests that the admin token is not reachable from any client module.
- **Rotation**: every secret has an owner, a rotation procedure and a documented cadence; the admin/job
  token must be rotatable without downtime. Support **two valid secrets during rotation** where feasible,
  then retire the old one.
- **Least privilege**: DB role with only the tables/operations needed (no DDL at runtime); read-only
  credentials for read APIs; separate credentials for cron vs. admin; cloud IAM scopes narrowed to what
  sync needs. The sync worker should not need broad cloud API access at all — ideally not even the
  metadata address is reachable.
- **Per-source credentials**: if a source requires auth (basic auth, API key, session), store per-source
  credentials separately from global secrets, encrypt at rest, never log them, never echo them into
  `fetch` logs, and never forward them on a cross-host redirect. Document the lawful basis for each one.
- **`.env` hygiene**: `.env*` files gitignored; only `.env.example` with empty/placeholder values is
  committed; no secrets in committed `.env`; CI injects secrets from the CI secret store. Add a
  pre-commit secret scan and audit history for any secret ever committed.
- **If a key leaks**: treat as compromised immediately. (1) revoke/rotate at the provider first, (2)
  deploy the new secret, (3) then investigate. Never "rotate later". Review provider logs and audit
  records for use, check for data exfiltration, check whether the leaked value was ever in a bundle or a
  log, and purge it from history if it was committed. Document this as a rehearsed runbook.
- **Fail closed**: a missing or invalid secret must disable the protected feature, not degrade to
  unauthenticated access.

---

## 5. API security

### 5.1 Public read API

- **Rate limiting** per IP (sliding window, e.g. 60–120 req/min with burst allowance) and per
  authenticated user, with stricter limits on expensive endpoints (search, geo queries).
- **Pagination caps**: mandatory `limit`, default 20, hard max 100. Cap `offset`/cursor depth and reject
  absurd values instead of silently clamping (or clamp with an explicit header so behaviour is honest).
- **Input validation** on every parameter: allowlisted sort fields, bounded numeric params, rejected
  unknown params, string length caps, and a strict query filter allowlist (no raw filter expression, no
  field-level injection into queries).
- **CORS policy**: explicit origin allowlist (the app's own origin, plus named staging origins). No
  `Access-Control-Allow-Origin: *` on credentialed requests, no reflection of the `Origin` header, no
  `null` origin. `Access-Control-Allow-Credentials: true` only when the allowlist matched.
- **Response content type** is `application/json; charset=utf-8` (never `text/html`), so a JSON response
  can never be sniffed/rendered as HTML on an old browser path.
- **No-store / private caching** on anything user-scoped (see §9). Public catalogue endpoints may be
  publicly cacheable with a clear `Cache-Control` and a cache key that contains no private dimensions.
- **Errors**: generic client errors with a request id. Never return stack traces, SQL, file paths,
  internal hostnames, adapter configuration, or source raw payloads.
- **HTTP hygiene**: `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, HSTS, no
  `Server`/`X-Powered-By` version disclosure.
- **No admin or job surface reachable from the public API**, not even as an undocumented route.
- Set `Access-Control-Expose-Headers` minimally; do not echo request headers back.

### 5.2 Internal job and admin endpoints

- **Strong shared secret or signed token** (prefer HMAC-signed token with expiry, or a proper
  service-to-service auth scheme). High-entropy, ≥ 32 bytes, generated not hand-written.
- **Never publicly guessable**: no predictable path names relied upon as protection; long random
  component is acceptable as an extra layer but is not the control.
- **Reject any request without a valid signature** — fail closed, no fallback path, no "dev mode" bypass
  that can ship enabled. Signature comparison must be constant-time.
- **Token must be server-only** and must never appear in the client bundle, a URL query string, a log
  line, or an error message. Prefer a header.
- **Least privilege on job endpoints**: separate tokens/authorisations for "run sync" vs "re-verify one
  record" vs "edit record". A job token must not be an admin token.
- **Idempotency and single-flight**: only one sync run per adapter at a time (distributed lock), so a
  triggered endpoint cannot be used to create parallel-write corruption or cost amplification.
- **Non-public network placement where possible**: scheduler/internal routes bound to a private interface
  or an internal-only origin, in addition to the token.
- Audit-log every job trigger, admin action, and re-verify with actor identity and target id.

### 5.3 CSRF and cookies

- Any **cookie-authenticated state-changing** request requires CSRF defence: synchroniser token or
  `SameSite=Lax|Strict` + double-submit, with `Origin`/`Referer` verification as an additional layer.
  Safe methods (GET/HEAD/OPTIONS) must never mutate.
- Cookies: `HttpOnly`, `Secure`, `SameSite` appropriate to the flow, host-only (no `Domain=` widening),
  short or rolling session lifetime, `__Host-` prefix where possible.
- Cross-origin form POSTs must not be able to hit mutations; verify `Origin` on all non-GETs.
- No state-changing actions in `GET`, no open redirects on logout/return-to flows.

### 5.4 Auth and authorization

- **Sessions**: random ≥128-bit session id, server-side or signed with rotation on privilege change;
  regenerate on login and on logout; invalidate on password change; idle + absolute timeout; bind to
  user agent/network risk heuristics where cheap.
- **Local password auth (if any)**: Argon2id (or bcrypt with cost ≥12) with per-user salt, pepper in
  secrets if used, constant-time comparison, generic "invalid credentials" message, no user
  enumeration via timing or differing messages, throttled and backed-off login attempts, and no password
  in logs. Prefer delegating to an established identity provider over building this.
- **MFA for admin accounts** — staff surface gets the strongest control available.
- **Authorization on saved items — IDOR is the expected bug.** Every read/update/delete of a saved item
  must be scoped by owner id *derived from the session server-side*, never from a client-supplied
  `userId`/`ownerId` parameter. Ownership checked in the query itself (single-statement
  `WHERE id = ? AND user_id = session.userId`), returning indistinguishable 404 for not-found vs
  not-yours. Automated tests must include a horizontal-privilege test for every saved-item route.
- **No client-controlled authorization signals**: role/permission decisions server-side only.
- **Account recovery, email verification and password reset** must be token-based, single-use,
  short-lived, rate-limited, and must not disclose whether an email exists.

---

## 6. Data integrity and supply-chain risk of the data

A malicious or merely buggy source can mark good scholarships CLOSED, change a deadline to a past date,
swap an official link, or inject misleading content. Silent data corruption is worse than an outage
because users act on it.

### 6.1 Integrity guards

- **Source-authoritative status only from allowlisted fields.** Status comes from an explicit enum field
  the source publishes (`status`, `state`, `open`/`closed`, deadline presence). Never infer CLOSED from
  "page looks different", never from an error, never from a failed fetch. Unknown source field ⇒
  `UNKNOWN`, never a guess.
- **Enum allowlists everywhere.** Statuses, funding types, levels, and country lists are closed sets;
  unknown values are preserved in a raw field and mapped to `UNKNOWN` rather than coerced. Never
  write an unvalidated source string into a field that later drives logic or filtering.
- **Sanity checks (soft, non-destructive)**: deadline not before ~1970 and not in the 1900s; not more
  than ~5 years in the future; start ≤ end; amount > 0 when present; country is an ISO-3166 code;
  URL scheme is http/https; title length within bounds. Violations ⇒ `needs_review = true` + the raw
  value retained, **and the previous good value kept** so we never destroy a working record on a parse bug.
- **Provenance per field where feasible**: `source_id`, `source_url`, `fetched_at`, `source_updated_at`,
  and (per-field) `source_field_path` for values that drive user-visible facts like deadline and status.
  "Where feasible" means: not for bulk narrative text, but definitely for status, deadline, amount,
  eligibility, official link.
- **Review queue (`needs_review`)**: surfaced in the admin UI with the raw value, the diff, and the reason.
  Blocking review is the release valve for poisoning.
- **Audit trail of every state transition**: append-only log of `{record_id, field, old, new, source_id,
  run_id, timestamp, actor}` for all mutations, including automated ones. Records need a
  `content_hash` and a `version` so we can diff and roll back.
- **No silent deletes.** Records are soft-deleted with a reason and retained for a defined period.
  A "missing from source listing" is not deletion. Bulk disappearance of many records from one source
  is an **anomaly signal** (possible source outage or feed change) that must trip an alert, not a deletion
  sweep. Postmortem: the worst failure mode of this system is silently wiping real scholarships.
- **Conservative dedup/merge.** Merge only on strong identifiers (canonical URL + normalised title, or an
  official programme id). When records disagree on a user-visible fact (different deadlines, different
  amounts), **do not merge** — keep both and mark for review. Never let "similarity" heuristics
  (fuzzy title, same organisation, same amount) merge two genuinely different programmes; a wrong merge
  is a silent data-integrity breach. Keep a `possible_duplicate_of` pointer instead of acting.
- **Parser hardening**: no unsafe HTML/XML parsing (`XXE` off: disable external entities and DTDs
  entirely), depth and size limits on nested JSON, prototype-pollution-safe merge (reject `__proto__`,
  `constructor`, `prototype` keys), bounded arrays, explicit encoding, and strip/never execute script,
  event handlers, `javascript:` URLs, and `style` payloads from any source HTML we keep.
- **Anomaly alerting**: sudden drop in records, sudden mass status flip to CLOSED, sudden mass
  `needs_review`, one source dominating errors → alert, because these are the signature of a source
  change or an attack.

### 6.2 Dependency / supply chain

- **Lockfile committed and enforced**; `npm ci` in CI, never `npm install` on a floating range.
- **Dependency audit in CI** (`npm audit` / equivalent) with a policy that fails on known high/critical
  issues, and a documented exception process.
- **Minimal dependencies**: prefer the standard library / platform primitives over adding packages. No
  new heavy dependency (parser, scraping, ORM, WebGL helper) without written justification in Phase 7 —
  each new package is attack surface and supply-chain risk. Re-review transitive counts.
- **Automated dependency updates** with a human reviewing the diff, not blind auto-merge of majors.
- **No unpinned git/URL/tarball dependencies.** No install scripts from untrusted sources where avoidable.
- Pin base image / runtime versions; no `latest`.
- Secrets never in CI logs; mask and rotate.

---

## 7. Client-side (frontend / WebGL) security

- **No `dangerouslySetInnerHTML` on source-derived content — hard rule.** Scholarship titles,
  descriptions, eligibility text, and source snippets come from T0 data. Render them as text
  (`textContent` semantics). Any HTML we ever display from a source must pass a maintained sanitizer
  with an explicit allowlist (tags, attributes, protocols) — sanitize on the server at ingest *and*
  defensively at render; do not hand-roll sanitizers, and do not use regex-based stripping.
- **Strict CSP** with no `unsafe-inline` and no `unsafe-eval` in script. Because React/Next inline some
  bootstrap, prefer hashes or nonces. `default-src 'self'`; `img-src`, `connect-src`, `object-src 'none'`,
  `frame-src 'none'`, `base-uri 'none'`, `form-action 'self'`. `frame-ancestors 'none'`. `require-trusted-types-for 'script'` where the browser support envelope allows — this is the single strongest defence against DOM XSS in a rich client.
- **Official source links**: `target="_blank"` **always** paired with `rel="noopener noreferrer"`
  (`noopener` prevents `window.opener` reverse tabnabbing; `noreferrer` suppresses referrer leakage).
  Validate outbound `href` scheme before rendering; block `javascript:`/`data:`/`vbscript:`.
- **Three.js/WebGL specifics**: shader sources are string-built — never interpolate untrusted data
  into GLSL/JS shader source without escaping; if a data string reaches a shader, it must be a sanitised
  numeric/JSON payload. Treat `textureLoader` URLs as untrusted: only load from same-origin or
  allowlisted asset hosts. Handle `webglcontextlost` / `webglcontextrestored` gracefully (pause render
  loop, show a recovery UI) so a hostile or resource-starved context cannot wedge the page; cap
  devicePixelRatio, cap simultaneous textures/geometries, dispose geometries/materials on unmount to
  bound GPU memory, and cap requestAnimationFrame work on hidden tabs. Also guard against
  clickjacking-relevant canvas overlay attacks and do not trust `IntersectionObserver`/pointer events
  as security signals.
- **No internal data in client bundles**: no DB ids in user-visible URLs unless necessary, no source
  credentials, no admin endpoints, no internal hostnames, no internal notes/flags in props sent to the
  client. Only serialise the fields the UI renders; keep `fetch logs`, `raw payloads`, `internal notes`,
  `needs_review` reasons and `admin flags` out of any server component payload or API response consumed
  by the client.
- **Minimize enumerable identifiers**: avoid sequential/predictable ids in URLs where avoidable; random
  public slugs for shareable links; do not expose admin entity counts or internal object keys.
- **Dependency hygiene on the client** too: the 3D stack and any rich text/markdown library are XSS
  vectors. If markdown is rendered, sanitize its output before injecting HTML.
- **Third-party scripts**: each one is full JS execution. Have an explicit allowlist of origins in CSP and
  a justification per script. Analytics must not be able to read sensitive form input (see §8).

---

## 8. Privacy

- **Data minimisation by design.** The platform's purpose is public scholarship information. Collect the
  minimum: for saved items, the record id, the owning user id, and optional user notes. No sensitive
  personal data about applicants (nationality beyond what a public scholarship requires, income,
  health, religion, political affiliation, immigration status, disability) is stored or processed.
  If a future feature collects such data it needs explicit, granular, opt-in consent and a different
  threat model.
- **What we store for saved items**: `user_id`, `scholarship_id`, timestamps, optional free-text note.
  Free-text notes are user content: they are rendered as text only, are size-capped, and are treated as
  untrusted in the same pipeline as source content.
- **Retention**: define and document retention windows — closed/expired records (archival),
  fetch logs and raw payload captures (short, e.g. 30–90 days, because raw payloads are the biggest
  accidental-PII store), sessions, deleted-account data, and audit logs (longer, immutable).
  Provide user-facing deletion of account and of saved items, and honour erasure requests including
  downstream processors.
- **Analytics privacy (PostHog)**: no session replay on pages containing personal data or note fields;
  no event payloads containing emails, names, notes, free-text search queries, or record ids that are
  private; IP handling configured for privacy; consent mode respected; analytics loaded only after
  consent where required; document what is collected in the privacy policy.
- **GDPR posture**: identify controller vs processor roles; lawful basis per processing purpose; a records
  of processing; DPA with subprocessors (hosting, DB, analytics, email); data-subject rights
  (access, rectification, erasure, portability, objection); breach notification procedure;
  privacy notice and cookie/consent banner. Age considerations: if users may be minors (likely for
  scholarships), do not profile them and keep consent requirements conservative.
- **Third-party source data**: public scholarship info is republished, but verify no source imposes
  non-redistribution terms, and attribute sources properly.

---

## 9. Data exposure and enumeration

- **Public catalogue data is intentionally public.** That is not a finding.
- **Internal-only fields must never leave the server**: fetch logs, raw stored payloads, adapter config,
  internal notes, admin flags, `needs_review` reasons, parse errors containing raw HTML, sync run
  metadata, source credentials, reviewer identity. Enforce with an explicit serialisation allowlist
  per response type (never `SELECT *` into a public route, never pass the whole ORM object to a
  component). Add a test that asserts a known internal field name never appears in any public API response.
- **Caching must not leak private data through shared keys.** Rules:
  - Any response that varies by user (saved items, drafts, entitlements) is `Cache-Control: private, no-store`
    (or a CDN path configured to bypass cache and key on user).
  - Never let a CDN cache key collapse authenticated requests: include auth/user identity in the key
    or bypass the cache for those routes entirely.
  - Cache only public catalogue responses, keyed by normalised method + path + sorted query params
    (+ locale), with no auth-derived variation and no `Vary` on cookies.
  - Never let saved items live in a shared ISR/static cache path.
- **Verbose errors and stack traces** in production: no. No `console.log` of full response bodies,
  headers with cookies, or source payloads on the client.
- **Common enumeration**: prevent trivial ID-walking by using random public slugs where practical, and
  rate-limit enumeration-shaped access patterns; keep total counts approximate where they reveal nothing
  of value, and do not expose internal row counts or source-level statistics publicly.
- **Metadata leakage**: no `ETag`/`Last-Modified` revealing source sync cadence, no source URL in the
  public payload unless intended, no internal service names in errors or headers.

---

## 10. Pre-launch security checklist

**SSRF / egress**
- [ ] Every adapter has an exact host allowlist; no wildcards, no user-controlled hosts (code review + test).
- [ ] Scheme allowlist enforced; `file:`/`gopher:`/`ftp:`/`data:`/etc. rejected (negative test).
- [ ] Resolved-IP checks block loopback, RFC1918, CGNAT, link-local `169.254.0.0/16` (incl. `169.254.169.254`), multicast, reserved, IPv6 ULA/link-local/mapped; test hits metadata and a local admin port and must fail closed.
- [ ] Connection pinned to validated IP (rebinding/TOCTOU); re-validation on every redirect hop.
- [ ] Redirects off by default; max hops when enabled; `Authorization` stripped on cross-host hop.
- [ ] Timeouts, per-response size cap enforced during streaming, per-run budget.
- [ ] Content-type allowlist per adapter; unexpected type rejected.
- [ ] Egress restricted at network level (sandbox / firewall / egress proxy) to the allowlist.
- [ ] No public endpoint accepts a URL and fetches it (verified by route inventory).

**Secrets / config**
- [ ] No `NEXT_PUBLIC_*` secrets; CI guard in place.
- [ ] `.env*` ignored; only `.env.example` committed with placeholders; secret scan clean.
- [ ] Rotation runbook exists and secrets have owners/cadence.
- [ ] Least-privilege DB/cloud credentials; sync worker cannot reach metadata or broad cloud APIs.
- [ ] Logs never contain secrets, cookies, or per-source credentials.

**API / endpoints**
- [ ] Rate limits (per IP, per user) on public API; bounded concurrency.
- [ ] `limit` default 20 / max 100; deep pagination rejected or clamped explicitly.
- [ ] Input validation + allowlisted filters/sorts; unknown params rejected.
- [ ] CORS explicit origin allowlist; no wildcard; no origin reflection; credentials only on match.
- [ ] Job/admin endpoints: strong signed token, constant-time compare, fail closed, no dev bypass in prod config, single-flight locks.
- [ ] Generic errors with request id; no stack traces, SQL, paths, hostnames.
- [ ] Security headers: CSP, HSTS, `nosniff`, `X-Frame-Options: DENY`, no version disclosure.

**Auth / sessions / CSRF**
- [ ] Cookie flags `HttpOnly`, `Secure`, `SameSite`, `__Host-` prefix; CSRF token on all cookie-auth mutations; `Origin` verified.
- [ ] Session id rotation on login/logout; idle + absolute expiry; revoke on password change.
- [ ] Password hashing Argon2id (or bcrypt ≥12) with per-user salt; no enumeration via messages/timing; login throttling.
- [ ] MFA enforced for admin accounts.
- [ ] **IDOR tests pass: user A cannot read/update/delete user B's saved items on any route.**
- [ ] Password reset single-use, short-lived, rate-limited, non-enumerable.

**Data integrity**
- [ ] Status/deadline/amount taken only from allowlisted source fields; unknown ⇒ UNKNOWN + needs_review.
- [ ] Sanity checks in place; previous good value retained on violation.
- [ ] Audit trail of every state transition; append-only.
- [ ] No silent deletes; soft delete with reason; anomaly alerts on mass changes.
- [ ] Dedup conservative: conflicting records never auto-merged.
- [ ] Parsers: XXE disabled, depth/size limits, prototype-pollution-safe merge.

**Client / WebGL**
- [ ] Zero `dangerouslySetInnerHTML` on source-derived content; sanitizer used and tested if HTML shown.
- [ ] CSP strict, no `unsafe-inline`/`unsafe-eval`, Trusted Types where feasible.
- [ ] All `_blank` links carry `rel="noopener noreferrer"`; href schemes validated.
- [ ] WebGL: context-loss handling, pixel ratio and memory caps, disposal on unmount, hidden-tab pause.
- [ ] Client bundle contains no secrets, internal endpoints, internal notes/flags, or internal IDs.

**Privacy**
- [ ] Retention windows defined and implemented for records, raw payloads, logs, sessions.
- [ ] Analytics: no PII/free-text in events, replay disabled on sensitive pages, consent respected.
- [ ] Privacy notice, cookie banner, DPA with subprocessors, DSAR (access/erasure) flow working.

**Supply chain / ops**
- [ ] Lockfile committed; CI uses `npm ci`; dependency audit gate; new-dependency justification policy.
- [ ] Base image/runtime pinned; no `latest`.
- [ ] Backup + restore tested; incident response and secret-leak runbook rehearsed.
- [ ] robots.txt compliance implemented and tested; User-Agent includes contact; per-domain rate limits and circuit breakers active; fetch-decision logging complete.

---

## 11. Blockers before enabling any live adapter

A live adapter must not be enabled until **all** of the following are true:

1. Exact host allowlist defined and enforced; redirects disabled or re-validated per hop.
2. Resolved-IP SSRF checks implemented and **tested against** `127.0.0.1`, `10/8`, `172.16/12`,
   `192.168/16`, `169.254.169.254`, `100.64/10`, `::1`, `fc00::/7`, `fe80::/10`, plus a DNS-rebinding
   scenario. Any failure here blocks launch.
3. Scheme, content-type, size, and timeout limits configured for that adapter.
4. robots.txt reviewed for that source; User-Agent identifies the bot with a contact address; per-domain
   rate limit, concurrency cap, and circuit breaker configured; conditional-request (ETag) storage in place.
5. Integrity guards active: allowlisted status field, sanity checks, provenance, `needs_review`,
   audit trail, no silent deletes, conservative dedup.
6. Legal/policy check: content is public and redistributable; no access control to bypass.
7. Owner assigned and fetch-decision logging verified for that adapter.
8. If the source requires credentials: per-source secret stored, encrypted, scoped, rotation owner named.

---

## Top risks (summary)

1. **SSRF via adapters / source-derived URLs** — can reach cloud metadata and internal services → full
   environment compromise. Mitigated only by exact-host allowlists + resolved-IP blocking + connection
   pinning + network egress control.
2. **Stored XSS from third-party content** — the whole corpus is hostile-by-default text rendered in a
   rich 3D app; one injection hijacks the app shell and user sessions. Mitigated by text-only rendering,
   strict CSP, Trusted Types, no `dangerouslySetInnerHTML`.
3. **Data poisoning** — a buggy or malicious source silently closing or corrupting scholarships. Users
   act on it, so this is a safety issue, not just data quality. Mitigated by allowlisted status fields,
   sanity checks, provenance, review queue, audit trail, no silent deletes.
4. **Secrets in the client bundle or repository** — immediate, irreversible blast radius. Mitigated by
   `NEXT_PUBLIC_*` prohibition plus CI enforcement and rotation runbook.
5. **Unauthenticated job/admin endpoints** — cost amplification, DoS of sync capacity, data corruption.
6. **IDOR on saved items** — cross-user PII exposure; must be tested explicitly.
7. **Unbounded scraping** — harm to third parties, IP bans, source shutdown, plus a public DoS lever.
8. **Internal fields leaking through public API or shared caches** — raw payloads and admin flags exposed
   to anyone if serialisation and cache keys are sloppy.

---

*Baseline established in Phase 1. Re-verify in Phase 7 (architecture) and formally audit in Phase 12
against §10 and §11.*
