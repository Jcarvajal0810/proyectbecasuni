# Discovery — Value & Impact Assessment

**Phase:** 1 (Discovery) · **Scope of this document:** value proposition, users, scope, metrics, risks. No implementation.
**Status of evidence:** everything marked *(observed)* was checked against a live source on 2026-09-30. Everything else is a hypothesis or a proposed threshold. **No user interviews, keyword volume data, or traffic estimates exist yet.** Any number below that looks like a market fact is not one.

---

## 1. Problem framing

### 1.1 What the user is actually up against

An applicant does not have a "search problem". They have a **deadline problem wearing a search problem's clothes**. The decision they are making is:

> *"Which of the ~10–30 opportunities I am plausibly eligible for should I spend the next 6 hours on, and did I miss anything that closes this week?"*

The real friction is not discovery. It is **verification**: confirming that a listing is real, that this year's cycle is still open, that the deadline is the deadline (not a placeholder), and that the eligibility rules match their situation. Every existing option degrades exactly here.

### 1.2 Concrete failure modes of existing options

| # | Failure mode | How it manifests in practice | Solved by which part of the plan |
|---|---|---|---|
| F1 | **Stale data presented as current** | Aggregator listings keep last year's deadline and a green "OPEN" badge. DAAD itself carries a disclaimer that it "cannot guarantee that the information is correct or complete" *(observed: www2.daad.de scholarship database)*. Source pages themselves are frequently undated. | `internal_status` + `LAST_KNOWN_STATUS` + `last_verified_at`; surfacing "last verified X days ago" in the UI |
| F2 | **No single source of truth** | The same programme appears on DAAD, on Chevening, on 20 university funding pages, and on 3 aggregators — with conflicting amounts, conflicting eligibility text, conflicting deadlines. GrantMe publicly reports that on a typical re-check pass, a meaningful share of records have to be flagged or hidden because "the provider's page changed and we could not re-read the details" *(observed: scholarships.grantme.ca/accuracy)*. | `source_url` as a first-class field rendered on every card; `duplicate_group_id` + `needs_review` so the conflict is collapsed instead of shown twice |
| F3 | **Open/closed status is not trustworthy** | Two distinct bugs: (a) a fetch or parse failure gets interpreted as "gone"; (b) a future date gets interpreted as "open". Both produce a confident wrong answer, which is the single most damaging error this product can make. | The six-state model with `UNKNOWN`; never infer CLOSED from failure; never infer OPEN from a future date; explicit `source_status` vs `internal_status` split |
| F4 | **No geographic discovery** | "Which countries can I study in if I have a fully-funded master's in public health?" is answerable only by manually visiting 20 bilateral programme sites. Chevening alone lists one award per country across 160+ countries/territories *(observed: chevening.org/apply, 10 paginated pages of country-specific awards)*. | Country facet + map-based coverage view |
| F5 | **Aggregator noise and monetisation incentive** | ScholarshipOwl is its own scholarship provider and runs a paid application funnel *(observed: scholarshipowl.com/about-us — "aggregator… avoiding repetitive application forms")*; Fairly warns readers about services charging hundreds of dollars for information that is "very easy to find… through targeted internet searches" *(observed)*. Any surface that mixes *discovery* with *lead-selling* cannot be maximally honest about data quality, because confidence is a conversion asset. | Non-commercial discovery surface; money never on the table, therefore no incentive to show more items than we can verify |
| F6 | **Trap-guarding is done ad hoc by universities** | UMD's own page says every Scholarship Universe listing "has been vetted to ensure it came from a reliable source"; UCSB markets vetting "so you never have to worry about scholarship scams" *(observed)*. That capability is real but it is scoped to one campus's students — exactly the gap an international, multi-country, multi-provider product fills. | Trust surface: official source link, source domain, last-verified date, scam red-flag checklist, explicit "we did not invent this" labelling |
| F7 | **Application logistics are unmanaged** | People are tracking applications in spreadsheets. A paid tracker product exists precisely because "searching for scholarships is a full-time research job nobody told you about" *(observed: getfundedhq.com tracker product page)*. | Saved items + application-state tracking (Should-Have, not MVP) |
| F8 | **Deadline correctness across timezones** | Chevening states deadlines as "6 October 2026, at 11:00 (UTC)" *(observed)*. Most portals publish a bare date with no timezone and no stated cutoff hour, so "closes 15 Oct" is ambiguous. Aggregators that compute a "days left" countdown from the wrong basis produce actively harmful warnings. | Store deadline as a date **plus** an explicit confidence/cutoff basis; render countdown only when the basis is known |

### 1.3 The honest summary

F1, F2, F3, F5 and F6 are the **trust cluster** — that is the product. F4 is a real discovery gap but it is a *secondary* job. F7 is a genuine pain with an existing paid workaround, so it is a competitive-parity item, not a differentiator.

The strongest defensible claim is not "the biggest international scholarship database". It is:

> **A smaller, narrower database where every record is traceable to a named official source, has a visible verification date, and admits what it does not know.**

That claim is hard to fake, cheap to verify by the user, and it is the thing the incumbents structurally cannot do (F5).

---

## 2. Jobs To Be Done (max 4, prioritized)

Ordered by frequency × urgency × willingness to return.

### J1 — "Don't let me miss a deadline" (highest priority)

- **Role:** postgraduate / master's applicant (primary), also undergraduate and PhD applicant.
- **When I am shortlisting international scholarships, I want to see only the ones that are genuinely open right now and how many days I have left, so I can prioritise what to apply to this week and do not waste an evening on something that closed three weeks ago.**
- **Current workaround:** the source portal's own search (DAAD, Chevening), plus a personal spreadsheet, plus calendar reminders.
- **Why the workaround fails:** it is correct but siloed. It answers "what does DAAD offer" not "what is open anywhere for me". The manual cross-check is the expensive part, and it is exactly the part that gets skipped. Deadline ambiguity (F8) means the applicant's own calendar reminder is built on a guess.

### J2 — "Prove this listing is real before I invest time in it"

- **Role:** all applicant roles; acute for undergrads and first-generation applicants.
- **When I find an opportunity that looks good, I want to see who publishes it, when it was last checked, and what is not stated, so I can decide whether to trust it and spend hours on the application.**
- **Current workaround:** reverse-engineering the URL, opening a dozen tabs, looking for a `.gov`/`.edu`/official-org domain, and searching for the programme name to see if a scam warning exists.
- **Why the workaround fails:** absence of a warning reads as absence of a scam — a false negative that costs real money and hours. Scam pressure is documented and active (BBB scam-tracker reports, FTC and US Dept. of Education OIG guidance *(observed)*), and the standard advice "never pay to apply" is checkable only if you can already see the real programme.

### J3 — "Understand my geographic and field options"

- **Role:** undergraduate student, academic advisor.
- **When I do not yet have a specific programme in mind, I want to see which countries fund my field and at what level, so I can narrow a large decision to two or three realistic destinations.**
- **Current workaround:** reading programme websites, browsing 20 bilateral schemes, or asking an advisor who has stale knowledge.
- **Why the workaround fails:** coverage is genuinely unknown to the applicant. There is no honest way to ask "is this under-served?" without a dataset that is itself honest about gaps. Note: this is the job the 3D globe is nominally for — see §4.

### J4 — "Give my advisees a list they can act on" (lowest frequency, highest leverage per session)

- **Role:** academic advisor / counselor.
- **When I advise a cohort of students, I want a short, current, linkable list of verified opportunities with clear deadlines, so I can hand out advice I am not embarrassed by six months later.**
- **Current workaround:** building their own spreadsheet, forwarding links, or pointing students at a campus tool that does not cover international funding.
- **Why the workaround fails:** advisors need *defensibility and completeness* for their cohort, not personalisation. A single `source_url` + `last_verified_at` column is the entire feature request; a per-user matching engine is not.

**Explicitly not a job:** "apply to 40 scholarships automatically". That is a different product (and drifts toward F5's monetised model).

---

## 3. Users

### Persona U1 — Lucía, 20, undergrad in Colombia, applying abroad

- **Context:** finishing a tecnólogo degree, English B2, family income low-to-mid, applying to full-funding master's programmes for 2027 intake. 6–10 tabs open, one spreadsheet.
- **Goals:** find fully-funded options, avoid deadlines she will miss, get to the official application page fast.
- **Technical proficiency:** high on phones, medium on desktop, zero interest in configuration.
- **Devices:** **mobile-first.** She checks on a mid-range Android in 20-minute gaps; desktop only for essay writing. Timezones matter (UTC-5).
- **Anxieties:** (a) dead-closing without warning; (b) eligibility — "do I qualify, am I reading the rules right?"; (c) scams and fake "guaranteed scholarship" services; (d) paying money for information.
- **Trusts:** a visible official domain, a "verified N days ago", a link to the official source, and an honest "No especificado" where the source is silent.
- **Abandons on:** invented-looking data, a countdown that says 0 días on a page that is still open, a signup wall before the first result, anything that asks for a fee.

### Persona U2 — Kwame, 29, mid-career professional, Chevening-track master's applicant (Nigeria)

- **Context:** 4 years work experience, needs a one-year funded master's in the UK/EU; applying on Chevening (1,000+ awards/year, one per eligible country *(observed)*). High research capacity, will read PDFs.
- **Goals:** rank by funding coverage (tuition only vs. full), by deadline cluster, and by "does my country have a priority field".
- **Technical proficiency:** high. Comfortable with a dense table if the columns are real.
- **Devices:** desktop primary, phone for deadline checks.
- **Anxieties:** deadline precision to the hour (Chevening uses UTC cutoffs *(observed)*), whether the programme has changed its terms this cycle, competition odds.
- **Trusts:** exact deadlines with timezone, history/change visibility ("deadline moved from X to Y"), the ability to sort by deadline rather than by marketing prominence.
- **Abandons on:** a beautiful visualisation that hides the deadline column; ambiguity between "deadline to apply for the scholarship" and "deadline for university admission" (two different dates that must not be collapsed into one).

### Persona U3 — Dr. Ana, 34, PhD candidate / early-career researcher (Mexico, applying to Germany)

- **Context:** looking for doctoral and postdoc funding (DAAD alone surfaces doctoral schemes with rolling and annual cycles, 100–200 filtered options *(observed)*).
- **Goals:** supervisor-dependent funding, project-based grants, 6–24 month durations, specific host institutions.
- **Technical proficiency:** high, comfortable with raw dates and PDFs.
- **Devices:** desktop.
- **Anxieties:** supervisor eligibility ("does my advisor qualify as host?"), duration and extension rules, whether a "scholarship" is actually a paid research contract.
- **Trusts:** explicit host/supervisor requirements and duration, not marketing language. Sees a gap field as honest; sees a filled-in guess as disqualifying.
- **Abandons on:** undergrad-oriented eligibility defaults applied to a doctoral listing; soft "research funding" mixed with "tuition scholarship" without separation.

### Persona U4 — Patricia, 48, university scholarship advisor / financial-aid counselor

- **Context:** advises 300+ students; runs a scholarship newsletter; personally fields "is this real?" questions weekly. Owns the reputational risk.
- **Goals:** a defensible, current shortlist; a way to say "this came from X, checked on date Y"; fewer repeated questions.
- **Technical proficiency:** high but time-poor; will not learn a new tool.
- **Devices:** desktop, email links, spreadsheet export.
- **Anxieties:** being wrong publicly; a student wasting a week on a dead listing; not knowing whether your database is smaller than a competitor's.
- **Trusts:** an explicit methodology page, the size of your verified set stated honestly, export, and a "report an error" path that is visibly acted on.
- **Abandons on:** any claim of coverage the data does not support.

### Cross-cutting design implications

1. **Trust is the product; search is the interface.** The single most valuable pixel on a card is the verification date and source domain. If trust metadata is visually secondary to amount/cover image, the product reads as another aggregator.
2. **Deadline-first information architecture.** Default sorts and default landing content must be deadline-driven. Deadline proximity is the decision variable; amount is a filter.
3. **Mobile is the primary context**, not a responsive afterthought. Filters must be operable one-handed; "days left" must be legible at arm's length.
4. **Anonymous value before any auth.** A student must be able to see useful, verified results before creating an account. Friction here converts directly into abandonment for U1.
5. **Explicit uncertainty is a feature, not a gap.** `UNKNOWN` must be rendered in human language ("No podemos verificar el estado") with the reason, not as a blank or a red badge.
6. **Never infer.** For every display of status there is a `last_verified_at` and a `source_status`. If either is missing, do not render a confident state.

---

## 4. Value vs. complexity audit

### 4.1 The verdict in one line

The plan as scoped contains roughly **one very valuable, one moderately valuable, and four plausible-but-unproven** components, and the most expensive component (3D globe + adapter framework) is currently the least defensible.

| Component | Real value? | Cost | Keep / Cut for MVP |
|---|---|---|---|
| Status state machine (6 states, no inference on failure) | **Very high.** Directly kills the failure mode that destroys credibility (F3). | Low–med | **Keep.** Simplify implementation to one pure function. |
| `source_url` / `source_name` / `last_verified_at` surfaced in UI | **Very high.** This is the differentiated value proposition. | Low | **Keep.** Must be visually primary. |
| Verifiable, dated seed dataset | **Very high.** Without it there is no product. | High (human) | **Keep.** Make it the main engineering constraint. |
| Dedupe + `needs_review` | **High.** Duplicate/conflicting listings directly cause missed applications. | Med | **Keep, minimal.** Manual merge is fine at MVP scale. |
| Full-text search + facets | **High.** Core interface for J1/J2. | Med | **Keep.** |
| Saved items | **Medium.** Exists as a free spreadsheet/tab workaround. | Low | **Keep, anonymous-first** (no auth). |
| Adapter/sync framework (plugin architecture) | **Medium at scale, low at MVP.** Useful when you have 10+ sources; premature when you have 3. | High | **Cut to:** 3 source-specific scripts + one shared normalise function. No registry, no generic base class. |
| 3D globe | **Conditional.** See §4.2. | High | **Cut from MVP.** Ship 2D choropleth + country facet. |
| Auth (Supabase) | **Low for MVP.** | Med | **Cut from MVP.** Anonymous session token + local saved list. |
| Generic job orchestration / admin dashboard | **Low.** | High | **Cut.** One cron, one SQL query, one internal page. |

### 4.2 The 3D globe: defensible answer

**Default answer: no. In the MVP it is a wow gimmick, not a value driver.** Here is the reasoning, and the conditions under which it changes.

**Argument 1 — The job it serves is a filter, not an exploration.** J3 asks "which countries fund my field?". A filter answers that in one click: `field = public health` + `funding = full` + `level = master's` → country list with counts. The globe adds a *spatial metaphor* to a question that is categorical. The cartographic literature is consistent that for categorical count-and-compare tasks, plain thematic maps outperform more realistic displays (choropleth best across the analytical tasks tested in *ICA-ABS 3, 269, 2021* *(observed)*).

**Argument 2 — 3D hurts the tasks users actually perform.** Tory et al., *IEEE TVCG* 2006, comparing 2D, 3D and combined displays: 3D was effective for *approximate navigation and relative positioning* but "not effective for precise navigation and positioning" *(observed)*. Scholarship lookup is a precise lookup: "how many are there, which ones, when do they close". And 3D is fine for orientation/hover, which the MVP does not need because there is no prior mental map of global funding to orient within.

**Argument 3 — Naïve realism is a known measurable failure mode.** ICA-ABS 1, 20 (2018): participants "completed tasks significantly faster on the 2D display", and most "misjudged which display they were most accurate or fastest with" — users prefer the realistic display while performing worse *(observed)*. If we ship a globe, we will receive qualitative praise that is not evidence of task success. That is a trap for a team optimising for visible differentiation.

**Argument 4 — It consumes the exact resources MVP is short of.** WebGL bundle, device thermal/memory pressure on the mid-range Android of persona U1, and, most importantly, *engineering attention that should go into dataset verification*. Every hour spent on globe polish is an hour not spent checking the 30 high-value programmes' deadlines. Value/cost ratio is poor.

**Argument 5 — It can actively damage trust.** A globe that renders a country with scholarships while implying "everything is shown" is a coverage claim. If our dataset has 4 records for Kenya and 2 for France, a choropleth invites "how many? are these all?" — and a spin-globe with glowing arcs says "the world of funding", which is a lie at MVP scale. Honest visualisation requires showing *gaps*, not hiding them.

**Conditions under which the globe MUST earn its place (all measurable, via PostHog funnel instrumentation):**

1. **It is an entry point, not an ornament.** ≥20% of sessions that begin on the geography view reach a scholarship detail page (compare against country-facet navigation as baseline).
2. **It beats the 2D baseline on a comparison task.** In a moderated test (n≥8, mixed roles) time-to-correct-answer on *"which countries fund master's-level public health?"* must be **≥20% faster** on the globe than on the 2D choropleth, with no increase in wrong answers.
3. **No regression in the primary job.** Mobile LCP on any route containing the globe must stay within budget, and J1 (deadline discovery) must not require passing through the globe.
4. **Coverage honesty is solved first.** Before the globe is user-facing, the dataset must reach a defensible coverage threshold (§5.2), otherwise it overstates supply.
5. **Accessibility parity.** Full keyboard operation and a non-canvas, screen-reader-navigable country list must exist; a decorative canvas-only globe fails as a primary interface for users with low bandwidth or assistive tech.

**Where a 2D fallback is fully sufficient — in fact preferable:**

- MVP and most of post-MVP. 2D choropleth (TopoJSON, colour = verified open count, grey = no data, explicit "0 / sin datos" pattern) + a country facet list + a sortable results table.
- Any mobile-first flow.
- Any situation where the user already knows the country and wants a list.
- Any screen-reader or reduced-bandwidth user.
- Advisor-facing reporting.

**Recommendation:** ship 2D choropleth in the MVP. Build the globe only behind a separate route after the coverage threshold is met and instrumented, and evaluate it against the four measurable conditions above. The TopoJSON asset is reusable either way, so nothing is lost by deferring.

### 4.3 Over-engineering candidates to cut from MVP — explicit list

- 3D globe (React Three Fiber, drei, animation loop) — cut; 2D TopoJSON only.
- Adapter plugin architecture — cut; three scripts + one normaliser.
- Generic workflow/job engine — cut; one scheduled sync and a retry counter column.
- Supabase Auth and user accounts — cut; anonymous saved-items token.
- Auto-dedupe by fuzzy matching across providers — cut; `duplicate_group_id` set manually during curation, plus a simple normalised-title+source check.
- Notification/email digest — cut; it depends on accounts and on deadline correctness we have not yet proven.
- Matching/scoring engine ("compatibility score") — cut. Premature and it invites the invented-inference failure we are trying to avoid.
- Optimistic "N scholarships" marketing counters — cut until the data supports them.

---

## 5. Scope

### 5.1 Must-Have (MVP) — minimum that is both useful AND trustworthy

The MVP is one sentence: **search verified scholarships, see who publishes them and when we last checked, know exactly how many days remain, and never be told anything we cannot back.**

1. **Verifiable seed dataset** (see §5.2 for "enough").
2. **Search + filters** — level (undergrad / master's / PhD / research), field, country of destination, funding type, deadline window, status. Postgres FTS over title + provider + description.
3. **Result cards that lead with decision variables** — status badge, days remaining, deadline date with basis, provider, funding amount (`No especificado` when absent), and the source domain.
4. **Detail page** — full fields with explicit "No publicado" for missing values, source link (prominent, not buried), `last_verified_at` rendered in the user's timezone, status with reason when `UNKNOWN`, and a plain-language note distinguishing *scholarship* application deadline from *university admission* deadline.
5. **Status engine** — six states, source-explicit-wins, no CLOSED-on-failure, no OPEN-from-future-date, `LAST_KNOWN_STATUS` preserved. Implemented as a pure function with a unit-test suite covering every failure path.
6. **Anonymous saved items** — shortlist stored against an anonymous token, no login. Shareable shortlist URL (read-only).
7. **Trust surface** — a public methodology page stating: how many records, how many sources, when last run, what "verified" means precisely, what we do not claim.
8. **Dead-links / freshness monitor** — per-source last success + last status-change time; a record not re-checked within N days visibly ages.
9. **3 source integrations + shared normaliser** — chosen for programmatic stability and licence clarity, not for fame.
10. **Basics of abuse-resistance** — no fee path, no "guaranteed" language, no affiliate links, scam red-flag checklist.

**Deliberately excluded from Must-Have:** auth, globe, email alerts, matching score, application-state pipeline, admin panel beyond one internal status page.

### 5.2 How we get enough real scholarships to prove the product works, and what "enough" means

**"Enough" is a coverage-and-trust threshold, not a record count.** A large number of unverified records makes the product worse, because every unverified record is a place where trust can be lost.

Proposed MVP gate — all must hold before declaring the MVP proven:

- **≥300 real records** (not demo), across **≥20 countries** of destination and **≥15 source domains**.
- **≥90% of records have a resolvable `source_url` on an official or named-organisational domain.** Records without one are not published.
- **100% of published records have a non-null `last_verified_at`** and **≥80% have been verified within the last 14 days** at the moment of the milestone check.
- **≤5% of records in `UNKNOWN`** on OPEN/UPCOMING records specifically (a closed record being unverifiable is acceptable; an open one is not).
- **Duplicate rate ≤2%** measured as `records in a duplicate_group_id with >1 member ÷ total published`.
- **Seasonal truth test:** the dataset contains the current cycle for at least 3 of the 5 highest-volume annual programmes, verified by hand within 7 days of their public opening. Chevening's annual cycle opening in September *(observed)* is the natural MVP test event.
- **Intent coverage:** for the 20 highest-volume search intents (derived from Google Search Console once live, plus a hand-built list before launch), at least 8 return real results. If a query returns 0, the page must say so honestly rather than widening filters silently.

**Where the seed comes from (strategy, not list of scraping targets):** prefer programmes with (a) a stable public URL pattern, (b) a clear annual cycle, (c) explicit deadline wording, (d) licence/robots terms that permit reading. Government and intergovernmental programmes (Chevening, DAAD, Erasmus Mundus, CSC/Nuffic, Canada/Australia awards, MEXT, ASEAN) fit this profile far better than university microsites. **Do not build the MVP on aggregator data.** Aggregators are our competitors, they are the noise source we are removing, and their terms are the riskiest.

**Manual curation is a legitimate MVP strategy, not a fallback.** For 300 records with 2–4 fields each, careful manual entry with mandatory `source_url` and `last_verified_at` may be *more* reliable and faster than building extraction infrastructure — and it is the honest way to seed. Automation is for maintenance, not for first fill.

### 5.3 Should-Have (post-MVP, in priority order)

1. Application-state tracking per saved item (saved / preparing / applied / result) — highest-value expansion of J1.
2. Deadline digest (email / WhatsApp) once correctness is proven.
3. Provider/funder pages (e.g. "all Chevening awards") — SEO and trust surface.
4. Shortlist export (CSV / printable) for advisors.
5. Advisor view: bulk verification state + "report an error" that visibly changes `needs_review`.
6. More source adapters, chosen by measured user demand (search-with-zero-results analytics), not by ambition.
7. "Programme changed" change log (deadline moved, amount changed) — differentiating and cheap once you have history.
8. Live coverage/"gaps" view — which countries/fields we do not cover, stated openly.

### 5.4 Nice-to-Have

- i18n beyond Spanish/English.
- 3D globe (only under §4.2 conditions).
- Mobile app or PWA install prompt.
- Comparador side-by-side of 2–3 scholarships.
- Amount normalisation to USD with explicit "conversion indicative" labelling.
- Community corrections with moderation.

### 5.5 Explicitly out of scope for MVP

- Applying on behalf of the user or autofill/application automation.
- Any monetisation, lead-gen, paid placement, or "unlock to see results".
- Personalised eligibility scoring.
- Guarantees, predictions, or "match" percentages.
- Anything requiring PII collection (no CV upload, no profile with grades).
- Full university-programme-level catalogue (hundreds of thousands of records).
- Mobile native apps.

### 5.6 Two MVP variants

**Variant A — Search-first (recommended)**

Landing is a search/filter interface; deadline-ordered results; detail pages as described. Geography is a filter and a 2D choropleth on a secondary panel.

- *Why:* it serves J1 (the top job) immediately, it is the fastest path to real, verifiable value, it is the most accessible and the fastest on mid-range phones, and it produces the search-with-zero-results and filter-usage data needed to decide whether the globe or anything geographic deserves investment.
- *Cost:* low. Reuses the same dataset, status engine and detail page.
- *Risk:* less immediately impressive in a demo. Mitigation: show verification dates and source provenance loudly; a demo with 300 traceable records beats a globe with 30,000 unverifiable ones.

**Variant B — Globe-first**

Landing is the 3D globe; click a country → scholarships.

- *Why someone might pick it:* fast visual differentiation, and it foregrounds J3.
- *Why not:* it optimises the lowest-frequency job, it front-loads the highest-risk, least-evidenced component, it overstates coverage at MVP data scale (§4.2, argument 5), it degrades on the primary mobile device, and it makes the primary job (deadline) a second-class path. It also risks the team optimising for "looks impressive" feedback rather than task success (§4.2, argument 3).

**Recommendation: build A. Instrument it. Consider the globe afterwards, as an evaluated addition under the four conditions, not as the front door.**

---

## 6. Success metrics

Constraint: self-hosted / analytics-light. Every metric below is computable from the Postgres database plus PostHog (already in the proposed stack) plus Sentry. **No metric requires a third-party panel.**

| # | Metric | Definition | Target (proposed threshold, to be validated) | How measured in a light stack |
|---|---|---|---|---|
| M1 | **Search-to-action rate** | Sessions with ≥1 search that reach a scholarship detail and click the official source, ÷ sessions with ≥1 search | ≥40% | PostHog funnel `search_submitted → detail_viewed → source_outbound_click`; server-side `outbound_click` event so it works without JS-heavy client tracking |
| M2 | **Zero-result rate** | Distinct search intents returning 0 published results, ÷ total distinct intents | ≤10% for the top-20 intents; monitored as a coverage backlog | Postgres query on a `search_events` table: normalized query string, result count |
| M3 | **Verifiable-source rate** | Published records with a resolvable `source_url` on an official/named domain, ÷ published | **100%** (records without one are unpublished, not published-with-gap) | SQL; make it a blocking constraint in the publish pipeline |
| M4 | **Status freshness** | Published records with `last_verified_at` within 14 days, ÷ published | ≥80%; alert when <60% | SQL by `source_id`; expose publicly on the methodology page |
| M5 | **UNKNOWN share on actionable records** | Records in `UNKNOWN` whose source claims to be open (i.e. `source_status` indicates open), ÷ total records claiming to be open | ≤5% | SQL on `internal_status='UNKNOWN' AND source_status IN ('OPEN','UPCOMING')` — this is the exact cohort where a wrong state does damage |
| M6 | **Duplicate rate** | Published records belonging to a `duplicate_group_id` with >1 published member, ÷ published | ≤2% | SQL; surfaced as a "N merged programmes" transparency stat |
| M7 | **Sync success rate** | Source fetches returning a parseable payload AND a recognized status, ÷ attempts, per source, over 7 days | ≥90% per source; any source <70% for 3 consecutive days is flagged | `sync_runs` table: `source_id, started_at, outcome, parse_ok, status_extracted, record_count`; Sentry only for hard failures |
| M8 (quality) | **Fresh returning users** | Users with ≥2 sessions in a 14-day window, ÷ users with ≥1 session | ≥25% | PostHog; on Supabase, a first-party `sessions`/`shortlist_items` table suffices if PostHog is dropped |

**Why these and not vanity metrics:** M1–M2 measure whether the core job is being served. M3–M7 measure the asset the entire product rests on. M8 measures whether returning behaviour exists at all. Record count, page views and social shares are explicitly *not* success metrics here — they are the metrics that let a low-trust aggregator look successful.

**Deliberately not measurable at MVP:** actual scholarship outcomes, money saved, admissions gained. Those require longitudinal contact with users, which conflicts with the "no PII" scope decision. If we want them eventually, ask via an optional, unlinked self-report in the detail page. Do not fabricate them in the meantime.

---

## 7. Risks and trade-offs (value-level, not technical)

| # | Risk | Why it is a value risk, not a bug | Mitigation / trade-off accepted |
|---|---|---|---|
| R1 | **Legal / terms of use** | Scraping government and university portals may breach terms, rate limits, or copyright in the provider's jurisdiction. Also: we will be republishing third-party programme content, and we will be making claims about deadlines that affect real decisions. | Prefer sources with permissive terms or explicit open-data; respect robots and rate limits; store facts + link rather than copying long descriptions; publish a per-source provenance and terms page; take legal advice before scaling beyond a handful of sources. Accepted trade-off: lower volume, higher defensibility. |
| R2 | **Data availability / markup churn** | Public portals have no stable API and change layout without notice. GrantMe's own accuracy page documents routine breakage: pages that "changed and we could not re-read the details", links going dead *(observed)*. If our sync degrades quietly, every record's status becomes a guess — which is the one thing we promised not to do. | Per-source health metrics (M7), `UNKNOWN` on failure (already decided), explicit ageing in UI, and a stated position that degraded sources get *removed from "open" views* rather than guessed. |
| R3 | **Trust erosion (the terminal risk)** | This audience is anxious and deadline-sensitive. One confidently wrong "ABIERTA con 3 días restantes" on a closed programme, or one invented field, can cost a user an application and end the relationship permanently. Trust does not recover quietly — it recovers slowly or not at all. | Non-negotiable: never infer, always date, always link, never silently fill. Treat any single trust incident as a Sev-1 product defect. Publish corrections when we are wrong. |
| R4 | **Discoverability / SEO conflict** | We will compete for queries like `"DAAD scholarship deadline 2027"`, where the official portal is the correct answer and we are a worse one. A third-party index that outranks the source of truth for the source's own programmes is both bad for users and legally risky. Conversely, if we are not indexable we have no acquisition channel. | Position on long-tail and comparative/coverage queries we can win honestly ("becas de posgrado enmtdad full funding para salud pública", "becas DAAD 2027 por país"); canonical-link or noindex pages that duplicate a single source's listings where appropriate; prioritise the internal methodology page for trust queries. Explicitly accept that we will not win head queries. |
| R5 | **Cold-start content problem** | With <300 records, both the product and the marketing claim are thin. Users arrive expecting thousands and find dozens; that reads as failure regardless of honesty. | Threshold in §5.2; a visible "cobertura actual" statement; seed from a few complete annual cycles rather than a scatter of programmes; prioritise depth in a few countries over token coverage in many. Accepted trade-off: slow, narrow, credible. |
| R6 | **Deadline timezone correctness** | Deadlines published as bare dates with no hour invite off-by-one-day errors; UTC-based cutoffs (Chevening: "6 October 2026, at 11:00 (UTC)") differ from local expectations. A wrong "days remaining" is a direct, immediate, visible harm. | Store date + basis + timezone; render countdown only when the basis is known; show the publisher's raw wording verbatim; never render a countdown from an assumed cutoff. Never show a countdown for `UNKNOWN`. |
| R7 | **UNKNOWN misread as CLOSED** | Six states is a data-model win and a UX risk. If a user sees a grey badge they may infer "closed", which is worse than not knowing. Conversely, if we render UNKNOWN too loudly we look unreliable. | Treat UNKNOWN as a first-class, human, reassuring state: "No verificable ahora — última verificación: hace N días", with the source link. Never grey. Never adjacent to the CLOSED badge. Measure M5 and monitor whether users click source links from UNKNOWN records — if they do, the state is working. |
| R8 | **Scope pressure / feature gravity** | The 3D globe, matching engine and notification system are all attractive and all non-differentiating. Effort spent there is effort taken from verification, which is the only moat. | Written MVP gate (§5.2). Any addition requires naming the failure mode it fixes. "It looks impressive" is not a failure mode. |
| R9 | **Commercial drift** | The scholarship vertical has a documented pattern of monetising the anxious (fee-based services, aggregator-owned scholarships). Even indirect pressure — a partner deal, a paid placement, a lead-gen contract — degrades exactly the property we are selling. | Written, published no-monetisation stance. It is both an ethical and a competitive position: it is the one thing the incumbents cannot copy. |
| R10 | **Silent coverage decay** | Sources rot, programmes close, staff time goes elsewhere. Users who had a good experience return to a site that quietly stopped working. | Publish freshness publicly (M4), alert on decay, and state coverage honestly rather than letting the dataset rot invisibly. |

---

## 8. Anti-generic principles — rules for the team

These are decision rules, not decoration guidance. They exist to prevent the product from reading as a template *without* costing clarity.

1. **Trust metadata outranks promotional metadata in the visual hierarchy.** Status, source domain and verification date occupy the highest-attention zone of every card. Amount and cover imagery never do. If a layout cannot show both, the trust metadata wins and the layout is wrong.
2. **No decorative imagery of anything a user could mistake for a place.** Stock campus photos, flags-as-decoration, students-looking-happy. The only visual geography allowed is the data choropleth.
3. **No invented illustration of a real thing.** If a programme has no logo and no banner, the card has no image. No stock image standing in for a scholarship.
4. **Empty is a designed state with real copy.** "No especificado" is not a placeholder; it is a claim we are making on purpose, and it should look like that.
5. **Numbers appear only when we can source them.** No "10,000+ becaas" unless a query supports it. No percentages we cannot compute at render time. No counters that inflate.
6. **One accent colour, reserved for state and action.** Status colours are semantic and are never used decoratively. No gradients-as-identity, no glassmorphism on data surfaces, no purple-to-blue hero.
7. **Type and layout over effects.** Identity comes from a real type scale, dense-but-legible tables, and a distinctive information architecture — not from shadow stacks or scroll animations. Motion only where it explains state change.
8. **No generic hero.** The landing page's primary content is a working search with real, dated records — not a headline, not a "Trusted by 50,000 students" banner we cannot verify.
9. **Honesty outranks polish in every review.** A PR that looks like the reference but invents one field is a regression. A PR that looks plain but is fully traceable is an improvement.
10. **Test every screen against persona U1's phone and persona U4's reputational risk.** If U1 cannot read the deadline at arm's length, or U4 could not defend what she sees to a student, the screen is not done.
11. **Demo the data, not the features.** In demos and screenshots, show a card with `No especificado` and a stale verification date — because that is what earns trust with this audience. Never show a synthetic record without its demo label.
12. **Every new component must be justified by a numbered failure mode or JTBD in this document.** Unjustified surface area is removed, not deferred.

---

## 9. What I would need to raise or lower confidence

Honest statement of gaps in this analysis:

- **No primary user research.** The personas are constructed from observed behaviour of comparable products and are plausible, not validated. First 10 interviews would change the ranking of J1 vs. J3 immediately.
- **No keyword or traffic data.** The intent-coverage list in §5.2 and the SEO posture in R4 are reasoned, not measured. Search Console data post-launch is the only honest input.
- **No source viability audit.** §5.2 describes the *criteria* for picking sources; nobody has yet checked robots.txt, terms, or layout stability for a specific list. That audit is the first task of Phase 2 and it can invalidate the 300-record target.
- **Target thresholds (40% search-to-action, 80% freshness, ≤5% UNKNOWN, ≥90% sync) are proposals.** They are defensible starting points grounded in what operators like GrantMe report as achievable, not measured benchmarks for this product. They must be reviewed after the first 30 days and may move.
- **M8 and outcome metrics are weak by construction.** With no accounts and no PII, we cannot measure whether anyone actually got a scholarship. That is an accepted trade-off for privacy and scope, and it means the product's ultimate value is asserted rather than proven — a position we should hold honestly rather than paper over.