# Legal / Ethical Feasibility Matrix — Scholarship Source Adapters

**Phase 1 (Discovery).** This document is a **gate**: it decides which source adapters may be
implemented in MVP and under which acquisition method. It is analysis only — no code.

**Owner:** @legal. **Date all URLs were checked: 2026-09-30.** Every factual claim below is tied to a
URL that was fetched or read on that date, or is explicitly marked `UNVERIFIED`.

## How to read this document

Three hard rules of interpretation:

1. **`robots.txt` is not a licence.** It is a crawler-preference request (see the operator's own file at
   `https://studyineurope.eu/robots.txt`, which says so in its own comments: *"robots.txt is a REQUEST, not
   a control"*). Passing robots.txt does **not** create a right to copy, store, or redistribute content.
   A permissive robots.txt **plus** an absent or restrictive copyright statement is still **AMBIGUOUS**.
2. **This is not legal advice.** Every verdict below is a risk-screen for prioritisation. Where the
   answer depends on jurisdiction, contract, licence, or facts we cannot check, it is marked
   `UNVERIFIED` and the missing information is named. A qualified lawyer must clear anything we mark
   AMBIGUOUS before we ship it commercially.
3. **`UNVERIFIED` is a valid outcome, not a failure.** Several items could not be verified on the check
   date and are recorded as such rather than guessed. Nothing in this document invents ToS text or URLs.

**Verdict vocabulary:**

| Verdict | Meaning | Engineering consequence |
|---|---|---|
| **HABILITABLE** | Licence/permission is clear and automated acquisition is contemplated or granted | Adapter may be built |
| **AMBIGUOUS** | Silent, conflicting, or unverifiable; risk is manageable but not zero | Manual curation only, or written permission first |
| **DO-NOT-USE** | An explicit prohibition or a clear all-rights-reserved-no-grant position exists | No adapter, no crawler |

---

## 0. Verdicts summary

| # | Source | Licence signal | Automated acquisition | Verdict | MVP? |
|---|---|---|---|---|---|
| 2 | **EACEA Erasmus Mundus Catalogue** (official RSS feed, EU-owned) | CC BY 4.0 (Commission Decision 2011/833/EU) | **Feed is published for this purpose** | **HABILITABLE** | ✅ **Ship first** |
| 2b | **erasmus-plus.ec.europa.eu** (programme info pages) | CC BY 4.0, EU-owned | Sitemap/list crawling permitted (`/search/` disallowed) | **HABILITABLE** | ✅ Ship as discovery |
| 1 | **Chevening** (chevening.org) | Crown copyright asserted; OGL v3.0 seen on *sibling system only* | `UNVERIFIED` — robots.txt unreachable on 6 attempts | **AMBIGUOUS** | ⚠️ Manual curation only |
| 3 | **DAAD** (daad.de, www2.daad.de) | **All rights reserved**, no grant | No. Internal API path is *disallowed*; sibling imprint says non-commercial only | **DO-NOT-USE** | ❌ Drop |
| 4 | **Universities (generic)** | Per-institution; many explicitly prohibit scraping | No, absent written permission | **DO-NOT-USE** by default / AMBIGUOUS per case | ❌ Not in MVP |
| 5 | **Gov / embassy notices (incl. Fulbright / IIE)** | Fulbright/IIE: **explicit no-scraping ToS** | No | **DO-NOT-USE** for Fulbright/IIE; AMBIGUOUS for generic gov | ❌ Manual only |
| 6 | **studyineurope.eu** | **Private commercial company**, all rights reserved, ToS bans scraping | No | **DO-NOT-USE** | ❌ Drop entirely |

---

## 1. Chevening — https://www.chevening.org/

### a) Terms of Use / robots.txt

| Item | Finding |
|---|---|
| Website ToS | **Not found.** Checked `https://www.chevening.org/about/terms-of-use/` (timed out), searched the site. The only "terms" documents published are **award** terms for grant holders, not website-use terms. |
| Award T&Cs | `https://www.chevening.org/wp-content/uploads/2026/08/Terms-Conditions-Scholarships_-August-2026-1.pdf` — governs the Scholar's obligations (work limits, conduct, data use). **Silent on automated access and content reuse.** Not a website-use contract. |
| Policies hub | `https://www.chevening.org/resource-hub/scholar-support/policies` — "By accepting a Chevening Award, you agree to adhere to Chevening's terms and conditions." Again award-scoped. |
| Copyright statement | Site footer, verified on multiple pages (e.g. `https://www.chevening.org/cheveners/business-and-finance`): **"© Crown copyright 2021 Chevening Awards are supported by the Foreign, Commonwealth and Development Office (FCDO) and partner organisations."** |
| Licence statement on main site | **`UNVERIFIED`.** The main public site footer asserts Crown copyright. **No OGL statement was observed on the public marketing site.** |
| Licence statement on sibling system | `https://asams.chevening.org/terms` (Applicant Scholar Alumni Management System) states: **"All content is available under the Open Government Licence v3.0, except where otherwise stated"**. ⚠️ This is a **different system**, not the public site. It cannot be assumed to license the public site. |
| robots.txt | **`UNVERIFIED`.** `https://www.chevening.org/robots.txt` was attempted 6× on 2026-09-30 (`https`, bare `https://chevening.org/`, `http`, and via search). All attempts returned `Request timed out` or `Transport error`. We do not know whether it exists, nor whether it sets a `Crawl-delay`. **Do not crawl until resolved.** |
| Social/branding rule | `https://www.chevening.org/resource-hub/alumni/social-media-and-messaging` — clause 7: *"not permitted to create a Chevening group, page, profile, or website … This extends to the use of the word 'Chevening' or its derivatives in the name of any group, page, profile, domain, etc., and use of the logo."* Written permission required for the name/branding. |

**Key clause on automated access / reuse:** *None found on the public site.* Silence, not permission.

### b) Official API / RSS / sitemap / bulk download

**None found.** No API, no RSS/Atom link, no documented open dataset, no bulk download surfaced on the
public site. `https://www.chevening.org/sitemap_index.xml` also timed out — `UNVERIFIED`.
The only Chevening data on the public web sits behind the `asams.chevening.org` application portal
(**not public API; requires an account; contains applicant PII**).

### c) Explicit permission?

**Silent = AMBIGUOUS.** Two readings are defensible and we cannot choose between them without more facts:

- *Optimistic:* Chevening is Crown copyright administered under the UK Government Licensing Framework
  (see `https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright` — "The Keeper … decides whether Crown copyright material can be made available on terms other than the Open Government Licence"). If Chevening content is OGL v3.0, reuse is broadly permitted with attribution.
- *Pessimistic:* the public site's footer asserts Crown copyright and does **not** display an OGL grant. "Crown copyright" is a rights assertion, not a licence. Chevening is delivered by the **British Council** (a private company), which may hold its own rights in editorial content.

**What must be verified:** (1) does `chevening.org` publish an OGL v3.0 statement we failed to load?
(2) Who is the copyright owner of the editorial content — FCDO, British Council, or both?
(3) Does the site's robots.txt exist and what does it say?

### d) Licensing of the underlying content

- Individual **facts** (award name, funding amount, deadline, eligibility criteria) are largely
  uncopyrightable facts in most jurisdictions — but **not in all**, and the *selection and
  arrangement* of a curated catalogue can attract **database rights** (`sui generis`, e.g. EU
  Directive 96/9/EC; UK CDPA 1988 s.85ff; German UrhG §87a).
- Chevening's own text (programme descriptions, "areas of impact" copy) is authored editorial
  material → copyrightable.
- **Practical rule for us:** store **facts + a link**, never Chevening's prose. Compose our own
  descriptions; do not copy Chevening paragraphs.

### e) Attribution requirements

- If OGL v3.0 applies: attribution = *"Contains public sector information licensed under the Open Government Licence v3.0"* + a link to `https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3`, plus the Crown copyright notice, plus an indication of any changes we made. The licence itself requires the licence notice be prominent.
- Brand attribution is **separate and stricter**: do not use "Chevening" in our domain, product name, or as a logo. Use it only in factual reference text naming the programme, subject to legal sign-off.

### f) Rate limits / crawl-delay

**`UNVERIFIED`** (robots.txt unreachable). Assume a conservative default until resolved: **1 request per 5
seconds, max 1 concurrency, 24 h re-check cadence, hard 404/changed-page backoff.**

### g) Personal data

- `https://www.chevening.org/about/privacy-notice/` — **timed out on 2026-09-30, `UNVERIFIED`.**
- The award T&Cs (verified) state: *"The FCDO and British Council will handle all information about
  Scholars … in accordance with the Secretariat's privacy notice"* and *"the FCDO and British Council
  may use and share a Scholar's details for purposes necessary for the administration of the Scholarship."*
- Chevening publishes **named alumni/scholar profiles** with photos, countries, and career histories.
- **Hard rule:** we store **no** applicant, scholar, or alumni personal data. Programme-level facts only.

### h) VERDICT: **AMBIGUOUS**

Justification: the programme is genuinely official and the content is plausibly Crown-copyright/OGL, but
**(i)** we could not retrieve the site's robots.txt at all, **(ii)** the OGL grant is only evidenced on a
different system, and **(iii)** there is no API/feed. Assuming permission would mean assuming the exact
fact the project's hard requirement forbids.

### i) Recommended acquisition method

**Manual curation by a human reviewer + written permission request.** Not an adapter.
- Build a **seed dataset** of the ~1 top-level Chevening scheme (Chevening Scholarship + Fellowships) from
  the official pages, with `source_url` = the official page, `discovered_via = "manual-seed"`, and
  `curator` + `curated_at`.
- Send a formal permission request to Chevening before any automation.
- If permission is granted in writing → build an adapter (still with crawl-delay, no PII).
- Do **not** ship an automated Chevening adapter in MVP.

---

## 2. Erasmus+ / Erasmus Mundus Joint Master Degrees

Assessed across three distinct properties, which have different risk profiles. `erasmus-plus.ec.europa.eu`
is managed by DG EAC; `www.eacea.ec.europa.eu` is the European Education and Culture Executive Agency.
Both are European Union bodies, so the EU reuse policy applies.

### 2a. `https://erasmus-plus.ec.europa.eu/` (programme information)

**a) ToS / robots.txt**
- robots.txt: `https://erasmus-plus.ec.europa.eu/robots.txt` — **verified 2026-09-30.** Standard Drupal
  config: `User-agent: *` with `Disallow: /admin/`, `/comment/reply/`, `/filter/tips`, `/node/add/`,
  **`/search/`**, `/search?`, `/user/register|password|login|logout`, `/media/oembed`, `/*/media/oembed`,
  `/core/`, `/profiles/`, and various `README` files. **No `Crawl-delay`.** Content pages are allowed.
- Legal notice (inherited): `https://commission.europa.eu/legal-notice_en` — **verified.**
- Platform-specific terms: `https://erasmus-plus.ec.europa.eu/projects/terms-use` — **verified**
  ("Last updated: 7 June 2024"). Scoped to the *Project Results Platform* (uploads/downloads by project
  beneficiaries) and explicitly **incorporates by reference** the Europa legal notice.

**Key clause — the EU reuse policy** (`https://commission.europa.eu/legal-notice_en`, verbatim):
> "Unless otherwise indicated (e.g. in individual copyright notices), content owned by the EU on this
> website is licensed under the **Creative Commons Attribution 4.0 International (CC BY 4.0)** licence.
> This means that reuse is allowed, provided appropriate credit is given and changes are indicated."

> "You may be required to clear additional rights if a specific content depicts identifiable private
> individuals or includes third-party works. … Software or documents covered by industrial property
> rights, such as **patents, trade marks, registered designs, logos and names, are excluded** from the
> Commission's reuse policy and are not licensed to you."

Legal basis cited on the page: **Commission Decision of 12 December 2011 on the reuse of Commission
documents** — `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011D0833`.

**EU emblem restriction** (`https://erasmus-plus.ec.europa.eu/projects/terms-use`, verbatim):
> "You agree not to: … **use the European Union emblem or otherwise use the official name and credentials
> of the European Union** if it is likely to create confusion between the platform user and the European
> Union or the Council of Europe …"

→ **This directly constrains our branding.** We may name "Erasmus Mundus Joint Master Degree" factually
but must not use the EU emblem, the Erasmus logo, or anything implying EU endorsement or affiliation.

**b) API / feed / dataset:** No public API found for the main Erasmus+ site. Content is CC BY 4.0 and
crawl-permitted. For *data*, the better answer is the EACEA feed in §2b.

**c) Permission:** **Explicit.** CC BY 4.0, subject to attribution and change-indication.

**d) Licensing:** Programme descriptions and the Erasmus Mundus catalogue metadata are **EU-owned content
under CC BY 4.0**. Excluded: logos, names, trade marks, third-party works, anything depicting identifiable
private individuals. Project results submitted by beneficiaries are **not** covered — the platform's own
disclaimer (verified on `https://erasmus-plus.ec.europa.eu/projects/search/details/2025-1-ES01-KA121-VET-000325170`)
states: *"All content on the Erasmus+ Project Result Platform is provided as submitted by the (coordinating)
beneficiary … respect of pre-existing intellectual property rights and image rights falls outside the
control of the European Commission and is the explicit responsibility of (coordinating) beneficiaries."*
→ **Do not ingest free-text project-result descriptions. Ingest catalogue metadata only.**

**e) Attribution:** *"© European Union, 1995-2026. Content licensed under CC BY 4.0"* + link to
`http://creativecommons.org/licenses/by/4.0/` + *"Source: European Commission, DG EAC — Erasmus+"* +
indication that we normalised/extracted the data.

**f) Rate limits:** No `Crawl-delay`. Still: 1 req / 2 s, max 2 concurrent, respect `/search/` disallow
(never automate search URLs — use sitemaps instead).

**g) Personal data:** Verified on the terms-of-use page — DG EAC.A3 processes *"professional information
about the contact person in the contracting organisation, including … name, first name, e-mail, address,
telephone number, fax and url"* and *"personal data of participants contained in project results and
outputs."* → **We ingest no contact-person fields and no participant data.**

**h) VERDICT: HABILITABLE**
**i) Method:** sitemap-driven discovery + the official page as source of truth. Restricted to
programme-level factual metadata.

---

### 2b. EACEA Erasmus Mundus Catalogue — **the safest source found**

**This is the single best candidate for MVP.**

| Item | Finding |
|---|---|
| Catalogue URL | `https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en` — **verified 2026-09-30** |
| Official RSS feed | **`https://www.eacea.ec.europa.eu/node/253/rss_en`** — **verified working, retrieved 2026-09-30.** Localised variants `/rss_de`, `/rss_fr`. Filtered variant observed: `https://www.eacea.ec.europa.eu/node/253/rss_en?f%5B0%5D=studies_for_emjmd_studies_for_emjmd_project%3A25` |
| Feed licence | `<copyright>© European Union, 1995-2026</copyright>` in the channel — **verified.** EU-owned → CC BY 4.0 via Commission Decision 2011/833/EU. |
| robots.txt | `https://www.eacea.ec.europa.eu/robots.txt` — **verified 2026-09-30.** `User-agent: *`, disallows `/admin/`, `/comment/reply/`, `/filter/tips`, `/node/add/`, **`/search/`**, `/user/*`, `/core/`, `/profiles/`, `/README.txt`, `/web.config`. **`Sitemap: https://www.eacea.ec.europa.eu/sitemap.xml`.** No `Crawl-delay`. |
| Update frequency | The catalogue page states it *"is **updated annually** and lists the master's programmes currently supported by the European Union."* **Verified.** Corroborated by `https://erasmusplus.rs/erasmus-mundus-joint-masters`: *"All the programmes are listed in the EMJM Catalogue, which is updated annually."* |

**What the RSS feed actually contains** (verified, parsed 2026-09-30) — and this is the key design gift:

Per `<item>`: `<title>` (official programme name), `<link>`/`<guid>` (**the programme's own official
consortium website** — this is the source-of-truth URL, handed to us directly), `<description>` (short
label + link to the Erasmus+ project overview), `<pubDate>` (last changed), and machine-readable
`<category>` fields including `ECTS Duration` (`"24 months / 120 ECTS"`), `Studies`,
`Thematic global`, `Years for EMJMD`, and `EMJMD Universities` (full consortium membership).

> **This means the EU feed itself performs discovery AND supplies the canonical official programme URL.**
> It is precisely the "aggregator for discovery, official page as source of truth" architecture this
> project requires, operated by the EU itself.

**⚠️ Important limitation of the feed (verified, must be documented in code):**
- The feed is **not a complete canonical list**. It returned ~25 items mixing three different catalogue
  collections: `Eramus Mundus catalogue` (current), `Eramus Mundus catalogue Legacy`, and
  `Intra-Africa Scholarships Legacy`.
- The catalogue listing pages indicate different sizes per filter (e.g. `Erasmus Mundus Catalogue (220)`
  vs `Erasmus Mundus Catalogue (43)` with a 2025 filter), so **the RSS is a bounded delta/recent-changes
  feed, not an exhaustive export.**
- Items already in `Legacy` collections may be expired programmes.

**Consequence for our architecture:** the RSS is the **change-discovery trigger**, not the seed of the
full corpus. The full corpus must be seeded by human-curated records and then kept current by the feed.
This is a feature, not a bug — it enforces our no-invented-data rule.

- **c) Permission:** **Explicit.** CC BY 4.0, feed published for machine consumption.
- **d) Licensing:** Catalogue metadata is EU-owned CC BY 4.0. **Excluded:** the logos/emblems excluded by
  the Commission legal notice. The linked consortium websites are **third-party** — we do **not** license
  them by virtue of appearing in the feed, which is exactly why they remain `source_url` and not
  copied content.
- **e) Attribution:** Per record, in the UI: *"Erasmus Mundus Joint Master Degree — data from the European
  Education and Culture Executive Agency (EACEA), licensed under
  [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)."* Plus a site-level `Sources & attribution` page.
- **f) Rate limits:** None specified. **Policy: fetch the RSS once per day, 1 concurrent request.** Do not
  crawl the catalogue listing pages at all — the feed makes it unnecessary.
- **g) Personal data:** The feed contains **zero personal data** — only institution names. Cleanest
  source in the matrix.
- **h) VERDICT: HABILITABLE**
- **i) Method:** **Official RSS feed for discovery.** One HTTP GET per day. Store:
  `name`, `consortium_url` (= `source_url`), `ects`, `duration_months`, `study_field`, `thematic_area`,
  `consortium_members[]`, `catalogue_year`, `eacea_node_id`, `feed_pub_date`,
  `source_licence = "CC BY 4.0"`. Fetch **no** HTML. Deepen details (deadlines, tuition, contacts)
  **only** from the consortium's own page, which becomes a separate, permission-gated adapter.

---

## 3. DAAD — https://www.daad.de/

**This is the source where the licence position is worst among the "official" programmes.**

### a) Terms of Use / robots.txt

**Imprint — the decisive document.** `https://www.daad.de/en/imprint` — **verified 2026-09-30**, under
heading **"Copyright"**, verbatim:
> "All contents of this website (in particular texts, images and graphics) are protected by copyright.
> The respective authors of the images are named."

German version `https://www.daad.de/de/impressum` — **verified**, under **"Urheberrecht"**:
> "Alle Inhalte dieses Internetauftritts (insbesondere Texte, Bilder und Grafiken) sind urheberrechtlich
> geschützt."

→ **All rights reserved. No open licence. No grant of any kind for reuse, aggregation, or redistribution.**

**A second, stricter DAAD imprint.** `https://www.meindaad.de/en/imprint` (DAAD's own alumni platform,
same publisher), **verified 2026-09-30**, under **"Copyright"**:
> "Copyright holders of text and graphic design for all DAAD-pages are the DAAD and the named authors.
> **Downloading and printing is permitted for personal, private and non-commercial use only.**"

→ DAAD's own subsidiary platform states a **non-commercial-only** permission. It does not state one on
`daad.de`, but it establishes DAAD's house position. **A commercial platform is outside this grant.**

**robots.txt** — `https://www.daad.de/robots.txt` — **verified 2026-09-30.** A large disallow list
(`/pdf/`, `/pics/`, `/js/`, `/ausland/*.pdf$`, `/deutschland/*.pdf$`, `/de/suche.html`, `/en/suche.html`,
`/app-rise/`, `/phd-portal/`, many country sub-sites, plus staging/print variants of the scholarship
database). Ends with:
```
Host: https://www.daad.de
Crawl-delay: 2
```

**⚠️ Critical finding — an API exists and is explicitly walled off:**
```
Disallow: /app/bsa/api/
```
An internal application API path is present **and disallowed**. Reading robots.txt correctly means:
*DAAD has an API and has asked automated agents not to use it.* Calling it anyway would be the clearest
possible ToS breach. **We must not.**

**Second host, unresolved.** The scholarship database itself runs on a **different host**:
`https://www2.daad.de/deutschland/stipendium/datenbank/en/21148-scholarship-database/` (linked from
`https://www.daad.de/en/studying-in-germany/scholarships/`). **`https://www2.daad.de/robots.txt` returns
HTTP 404 — `UNVERIFIED`** whether that host has any crawl policy at all.

**DAAD's own legal caveat about the data** (`https://www2.daad.de/deutschland/stipendium/datenbank/de/21148-stipendiendatenbank`, **verified**), verbatim:
> "Rechtlicher Hinweis: Die Informationen über die Fördermöglichkeiten anderer Organisationen hat der DAAD
> mit größtmöglicher Sorgfalt zusammengestellt. Trotzdem kann der DAAD für die Richtigkeit und
> Vollständigkeit keine Gewähr geben."
*(Legal notice: DAAD has compiled the funding information of other organisations with the greatest care.
Nevertheless DAAD cannot guarantee its accuracy or completeness.)*

→ **Rights chain is broken by DAAD's own admission:** the database aggregates **other organisations'**
programmes. DAAD cannot license us rights it does not hold. Even a generous reading of DAAD's own
copyright would not cover third-party funder content.

### b) API / feed / sitemap / bulk download
- Sitemap exists: `https://www.daad.de/sitemap.xml` — **verified to exist** (exceeded the 5 MB fetch
  limit, so contents not inspected).
- No public API, no RSS for scholarships, no open dataset, no bulk download. The one API path that exists
  is disallowed.

### c) Explicit permission?
**No.** Silence on permission + an explicit all-rights-reserved copyright claim = **not permitted**.

### d) Licensing of the content
- DAAD's editorial text and the compiled database: **all rights reserved**, no licence.
- Database rights (`Datenbankhersteller`, UrhG §87a) additionally likely apply to the curated selection
  of the Stipendien-Datenbank — an independent reason not to reproduce the compilation.
- Aggregated third-party funding content: **rights not held by DAAD; unusable by us.**
- Programme facts (amounts, deadlines) remain facts, but the *only* practical way to obtain them is to
  read DAAD's expression, which is protected.

### e) Attribution requirements
There is **no licence to comply with**, so there is no attribution that would make copying acceptable.
DAAD's own copyright notice would have to be reproduced verbatim — which does not cure the absence of a grant.

### f) Rate limits
`Crawl-delay: 2` (verified). Moot — we are not crawling.

### g) Personal data
- `https://www.daad.de/en/data-privacy-statement/` — **verified**; DAAD processes personal data per
  GDPR/DSGVO. DPO contact: `datenschutz@daad.de`.
- `https://www.daad.de/rise/en/data-protection-notice` — **verified**: covers **applicant** personal data
  in the scholarship application process, including transfer of scholar data to universities and to
  DAAD-Stiftung.
- → **We ingest no applicant data. Programme-level facts only — which we have no licence to obtain here.**

### h) VERDICT: **DO-NOT-USE**

Justification: three independent, sufficient grounds —
1. **Express all-rights-reserved** with no grant on both the `daad.de` imprint and the DAAD-operated
   `meindaad.de` imprint (the latter limited to personal, private, non-commercial use).
2. **An API exists and robots.txt explicitly disallows it** — using it would be a knowing breach.
3. **Rights chain is broken** for third-party funding information by DAAD's own legal notice, plus
   probable German database rights in the compilation.

This is the clearest DO-NOT-USE in the matrix apart from an express no-scraping clause.

### i) Recommended acquisition method
**Drop.** No adapter, no crawler, no seed dataset derived from DAAD's expression.

**The legitimate alternatives:**
- **Link, don't copy.** Deep-link to `https://www.daad.de/en/studying-in-germany/scholarships/` as a
  user-facing outbound link with a clear "official source" label. Linking is not reproduction.
- **Direct applicant relationship.** DAAD serves candidates directly; our value-add is discovery and
  tracking, not re-publishing DAAD's catalogue.
- **Written permission** if DAAD ever wants a partnership — realistic for a charity-adjacent public body
  but not an MVP dependency.

---

## 4. University-level sources (generic) — responsible policy when there is no API

Universities are the single largest category for this kind of platform and the hardest to generalise,
because terms are per-institution and frequently **hostile to automated collection even when
robots.txt is silent or open**. Four real examples were checked on 2026-09-30:

### Example 1 — University of Melbourne (explicit scraping ban)
`https://www.unimelb.edu.au/legal/website-terms` — **verified.**
> "You may only use content on a University website for **non-commercial purposes**. Unless otherwise
> indicated, you may save or print out a copy of that content … provided that you: do not modify the
> content …; and include the copyright notice 'Copyright © The University of Melbourne 1994 - 2017'…"
>
> "You must not: … **use automated means to retrieve information from a University website without our
> permission, for example, 'scraping'**; … do anything which would impose an unreasonably large or
> disproportionate load on the University's networks…"

Permission route is documented: `copyright-office@unimelb.edu.au`.

### Example 2 — University of Oxford (rights asserted, no grant)
`https://www.ox.ac.uk/legal` — **verified** (via indexed content; page footer reads "© University of
Oxford, 2015").
> "Unless otherwise indicated, this Website and its contents are the property of the University of
> Oxford … The copyright in the material contained on this Website belongs to the University or its
> licensors."
> "…those gaining access to this Website are authorised to make use of it … for any lawful purposes. The
> following is a non-exclusive list of uses which are **expressly prohibited**: … using the Website to
> commit or encourage unlawful acts, **including unlawful copying of copyright material**…"
Governing law: English law, exclusive jurisdiction of the Courts of England.

robots.txt `https://www.ox.ac.uk/robots.txt` — **verified.** `Crawl-delay: 20`; disallows `/api/listing/`
and the expensive course-listing query URLs (`/admissions/undergraduate/courses/course-listing?`,
`/admissions/graduate/courses/find-your-course?`) with the comment
*"Numiko 2026-04-21: listing filter URLs (expensive to render uncached)"*.
→ **Oxford's robots.txt is permissive on ordinary pages but has an explicit 20 s delay and blocks
listing endpoints. That is a load-management signal, not a licence.**

### Example 3 — University of Cambridge (permissive robots, nothing more)
`https://www.cam.ac.uk/robots.txt` — **verified.** Standard Drupal config: disallows `/admin/`,
`/comment/reply/`, `/filter/tips`, `/node/add/`, `/search/`, `/user/*`, `/media/oembed`, `/core/`,
`/profiles/`, `README` files. **No `Crawl-delay`.**
→ **A fully open robots.txt and still no permission to copy.** This is the single most common trap in
this category: people read `robots.txt` as a licence. It is not.

### Example 4 — Oxford Research Archive, ORA (the genuinely open exception)
`https://ora.ox.ac.uk/terms_of_use` — **verified.**
> "Copyright and other rights in the items held in ORA are retained by the individual authors, the
> University, or other third parties … **Users are required to comply with the permissions notice that
> applies to each item in ORA.**"
> "Unless otherwise indicated in the relevant permissions notice on the item record, users may download
> and/or print one copy of any item in ORA to facilitate **private study or research for non-commercial
> purposes**."
> "**You may freely distribute the URL** ( https://ora.ox.ac.uk ) of the ORA website but if you wish to
> link to any item in ORA you must do so through the item record page."
> "ORA supports and participates in the **Open Archives Initiative (OAI)**. You can find details of the
> **ORA API** at `https://ora.ox.ac.uk/api`."

→ **This is the pattern to aspire to, and it shows what "responsible" actually means:** URL redistribution
is freely permitted; per-item reuse requires honouring that item's permissions notice; a documented OAI
API exists for machine access.

### Additional patterns observed (verified via indexed content, 2026-09-30)
- `https://marymount.edu/terms-of-use-policy` — "you agree that you will not use any robot, spider, other
  automatic device, or manual process to frame, **scrape** … without the prior express c[onsent]".
- `https://www.depaul.edu/terms-of-use` and `https://www.bucknell.edu/terms-use` — download permitted
  "only for their own personal, non-commercial use"; no copying, retransmission, distribution or commercial
  exploitation.
- `https://www.stanford.edu/terms` — same personal/non-commercial download limit.

### (c) Is there explicitly stated permission?
**No, by default.** Institutions vary, and the ones that are open are open in writing, with a named
contact and a documented API. Silence plus an open robots.txt is **AMBIGUOUS, not permission.**

### (d) Licensing
Institutional copyright, typically "the University or its licensors". Some individual programmes are
CC-licensed (e.g. many ERC grant pages), but **the licence must be verified per programme, not per
university** — and absence of a licence statement means all rights reserved.
Separate third-party content (photos, news syndication, iStock) is typically separately licensed and
often the *dominant* infringement risk.

### (e) Attribution
Institutional copyright notice + optional CC attribution terms. For CC-licensed items the CC BY
requirements apply (attribution, licence link, change indication). **Not a substitute for permission.**

### (f) Rate limits
University-set `Crawl-delay` where present — Oxford: **20 s** (verified). Absent elsewhere. Our floor,
regardless: **1 request / 5 s, 1 concurrent request per host**, with exponential backoff on 429/503.

### (g) Personal data
Scholarship pages routinely contain named **contact persons** (programme coordinators) and, on some
application-tracking pages, **applicant names, statuses, and interview dates**. Contact persons are
personal data. → **We store a role and a link, never a personal email address; we never touch applicant
data.**

### (h) VERDICT: **DO-NOT-USE by default; AMBIGUOUS case-by-case behind a permission gate**

Justification: no API, all-rights-reserved by default, and at least two major institutions
(Melbourne, Marymount) **explicitly prohibit scraping in their ToS** even where robots.txt is silent.
Tens of thousands of institutions × unknown per-page licences = unacceptable MVP risk surface.

### (i) Recommended acquisition method: **a written-permission pipeline, and an outbound-link-first product**

**MVP: link, don't copy.** Show university scholarships only where a human curator has recorded them, with
`source_url` pointing at the official page, and no copied text. This is the ORA "freely distribute the
URL" model — the model that actually scales.

A disciplined university tier, in order:

| Tier | Gate | Method |
|---|---|---|
| **U0 — Link-only** | None | Curated record, official URL, no copied text. Default for MVP. |
| **U1 — Published licence** | Institution publishes CC BY / OGL **for that specific page** | Ingest factual fields + short attributed excerpt, licence recorded per record |
| **U2 — Written permission** | Signed email/agreement from a named officer, granting automated collection + display terms | Adapter, scoped to the exact pages/fields named in the grant |
| **U3 — Official API/feed** | Documented API, OAI-PMH, sitemap + explicit written blessing | Adapter; the only tier with long-term scalability |

**Escalation gate (mandatory, no exceptions):** before any automated adapter for a university ships, the
adapter file must carry a `legal_clearance` block recording: (i) the exact page URL whose terms were
read, (ii) the retrieval date, (iii) the verbatim clause relied on, (iv) the permission artefact
(licence URL or written grant, with reference), (v) reviewer sign-off. **No `legal_clearance`, no adapter.**
Reviewing institutions' terms individually at scale is a Phase-2 workstream, not MVP scope.

---

## 5. Government / embassy scholarship notices (generic criteria)

### Two distinct sub-cases — do not conflate them

**(A) The right to the *content* vs. the *operator's terms*.** US federal works are generally not subject
to copyright (`https://www.copyright.gov/circs/circ01.pdf`, 17 U.S.C. §105), and the EU/UK equivalents give
broad reuse of official publications. **But that tells us nothing about whether we may automate against a
specific website.** A public-domain work behind a site whose ToS forbids crawling is still off-limits.
These are two separate questions and we must answer both.

### Evidence gathered

**U.S. Department of State robots.txt** — `https://www.state.gov/robots.txt` — **verified 2026-09-30:**
```
crawl-delay: 5
# START YOAST BLOCK
User-agent: *
Disallow:
Sitemap: https://www.state.gov/sitemap_index.xml
# END YOAST BLOCK
```
→ Fully permissive content crawl, 5 s delay, sitemap published. **But see (B).**

**Fulbright / IIE — an explicit no-scraping clause.** `https://www.iie.org/terms-and-conditions/`
("Effective Date: May 23, 2023") — **verified 2026-09-30**, verbatim:
> "All materials are copyrighted and are provided **solely for personal and institutional purposes, and not
> for commercial use.**"

> "**You may not use spiders, robots, data mining techniques or other automated devices or programs to
> catalog, download or otherwise reproduce, store, analyze or distribute content available on IIE
> Websites.** Further, you may not use any such automated means to manipulate IIE Websites or attempt to
> exceed the limited authorization and access granted to you under these Terms and Conditions. You may not
> resell use of, or access to IIE Websites to any third party."

> "IIE or its licensors are the sole and exclusive owners … of all copy, software, graphics, designs and
> all copyrights, trademarks and other intellectual property or proprietary rights contained on or used in
> connection with the Website. … Except as set forth herein, you agree not to copy, distribute, modify or
> make derivative works of any materials shown on or available through IIE Websites **without the prior
> written consent of the owner of such materials.**"

The same clause is mirrored on the Fulbright site: `https://us.fulbrightonline.org/terms-and-conditions`.
Governing law: **New York, USA; exclusive jurisdiction of the federal and state courts in New York; a
one-year limitation period on claims.**

`https://fulbrightscholars.org/terms-conditions` **defers** to these: *"See the IIE Websites Terms and
Conditions regarding this website."* And `https://fulbrightprogram.org/` links its footer to
`https://www.iie.org/terms-and-conditions/`.

→ **This is the most explicit anti-automation prohibition in the entire matrix.** It is not merely
"personal use only" — it names the exact technique.

**Country-level embassy notices** (these are where the actual actionable content lives) — **verified:**
- `https://bj.usembassy.gov/fulbright-foreign-student-program/` — Benin, 2027-28 cycle, deadline
  30 April 2026, ~34 min read, includes a plagiarism policy and interview timeline.
- `https://uz.usembassy.gov/fulbright-foreign-student-program` — Uzbekistan, 2027-28 cycle.
- Structure is consistent: eligibility, selection criteria, benefits, testing, how to apply, deadlines.

**These notices are highly per-country, per-cycle, and time-critical.** They are exactly the content a
scholarship platform is most valuable for — and exactly where an out-of-date list does real harm.

### (b) API / feed / sitemap
- `state.gov`: sitemap published at `https://www.state.gov/sitemap_index.xml` — **verified to exist.**
- Fulbright/embassy sites: no public API found. `UNVERIFIED` for individual embassies.
- **Official channel is email/newsletter, not machine-readable.** `https://bj.usembassy.gov/…` uses WordPress,
  so per-post Atom feeds are *technically* probable, but each site's terms still govern — and for IIE-operated
  properties they forbid the automation.

### (c) Permission?
- Government in general: **content** is typically reusable; **automated access to a given site** is
  site-specific. Public-domain status ≠ permission to crawl.
- Fulbright/IIE: **explicitly no.**

### (d) Licensing
- Official government publications: generally no copyright (UK Crown copyright under OGL; EU under
  CC BY 4.0; US federal works). **Verify per jurisdiction — this is a general pattern, not a universal rule.**
- Fulbright specifically: **copyrighted by IIE, personal/institutional use only.** The underlying programme
  is public-sector, but the *website expression* is IIE's.
- Trade marks and logos are excluded everywhere; **embassy seals and the Fulbright name/logo must not be
  reproduced.**

### (e) Attribution
- OGL v3.0 → "Contains public sector information licensed under the Open Government Licence v3.0" + link.
- CC BY 4.0 (EU) → attribution + licence link + change indication.
- Fulbright/IIE → **no reuse, so no attribution pathway exists.**
- **No endorsement:** must state clearly that we are not affiliated with, endorsed by, or sponsored by any
  government, embassy, or programme.

### (f) Rate limits
`crawl-delay: 5` on `state.gov` (verified). US federal sites are commonly covered by the U.S. GSA
`crawler-friendly` guidance (~1 req/s); `UNVERIFIED` for the specific sites here. Adopt **1 req / 5 s**
as our floor. Embassy sites are typically small WordPress installs on shared hosting — **be gentler than
they think they need: 1 req / 10 s, off-hours requests avoided.**

### (g) Personal data
- Embassy notices themselves are public and impersonal → low risk.
- **BUT:** embassy and Fulbright portals frequently expose **applicant names, nationality, award status,
  interview dates, and university placement.** This is highly sensitive personal data about individuals in
  a visa/immigration context. → **Never ingest applicant rosters, ever. Never store or redistribute a
  single applicant's data.** Link to the official application portal instead.

### (h) VERDICT
- **Fulbright / IIE-operated properties: DO-NOT-USE** (for automated acquisition). Express prohibition.
- **Generic government notices: AMBIGUOUS.** Content rights are typically favourable; automated-access
  permission is site-specific and must be checked per domain.

### (i) Recommended acquisition method
- **Fulbright/IIE: drop entirely.** No adapter, no crawler, no dataset. Link out only.
- **Government/embassy notices: manual curation by a human reviewer, at low cadence, with urgency.**
  Build a **deadline-aware manual pipeline**: a curator records the notice's official URL, cycle, deadline,
  and the 2-4 genuinely distinguishing eligibility criteria, in their **own words**, with a
  `verified_at` timestamp. Because embassies re-publish each cycle, a human re-check is cheap and
  **required** — a stale embassy deadline is worse than no listing.
- **Escalate to automated only** where a specific government domain publishes an open licence (e.g. an EU
  programme on an `europa.eu` property under CC BY 4.0) **and** robots.txt permits it. Record the check.

---

## 6. `studyineurope.eu` — assessed, and **not what it appears to be**

### 🚨 First-order finding: this is NOT an official EU source

The brief asked us to assess this as a discovery/reference source. Before anything else, the operator
must be established, because the entire risk analysis depends on it.

`https://studyineurope.eu/` — **verified 2026-09-30**, site footer, verbatim:
> "**Europe is our home**  Registered business address: Calle Isla Cristina, 10, 21600 – Valverde del
> Camino, Spain. (EU VAT #: ESB22654230)  © 2026 StudyinEurope.eu"

It is a **private Spanish company** selling B2B subscriptions to universities and monetising **student
lead generation**. Verbatim from the same homepage:
> "[Services for Institutions] … Institution Login" … "Paid subscription plans may include access to
> student inquiries ('leads') submitted through our 'Request Information' forms." … "We created
> StudyinEurope.eu to support students like you — with clear information, personalized guidance, and a
> space to explore calmly. … Just tools that help — whether you're browsing on your own or getting help
> from Leonardo, our AI European Study Advisor."

**The official EU "Study in Europe" portal is a different property:** `https://education.ec.europa.eu/study-in-europe`
(European Education Area, DG EAC) — **verified.** That is the site covered by CC BY 4.0 under
`https://commission.europa.eu/legal-notice_en`.

**Consequence: any user of our platform who believes our data comes from "Study in Europe" the EU portal
would be misled.** Naming discipline and disclaimer wording (below) are not optional here.

### a) Terms of Use / robots.txt

**Terms of Use:** `https://www.studyineurope.eu/terms-of-use/` — **verified 2026-09-30**
("Last updated: June 10, 2026"). Verbatim clauses:

> **§7 Intellectual Property** — "All content on StudyinEurope.eu — including text, design, logos,
> graphics, and code — is protected by copyright and intellectual property laws. **You may not copy,
> modify, reproduce, or distribute any part of our site without written permission.**"

> **§8 Prohibited Behavior** — "When using our site, you agree not to: … **Use the platform for commercial
> scraping or unauthorized data collection.**"

> **§9 Limitation of Liability** — "All content is provided 'as is' for educational guidance." … "To the
> maximum extent permitted by applicable law, StudyinEurope.eu's total liability to any party shall not
> exceed the amount paid by that party to StudyinEurope.eu in the three months preceding the event…"

> **§12 Legal Jurisdiction** — "These Terms are governed by the laws of **Spain** and the European Union.
> Any disputes or legal matters will be handled under the jurisdiction of Spain."

→ **Two express prohibitions, both directly on point:** copying content, and scraping.

**robots.txt:** `https://studyineurope.eu/robots.txt` — **verified 2026-09-30.** A hand-annotated,
comment-heavy file. Directives: `Disallow: /wp-admin/`, `/wp-login.php`, `/xmlrpc.php`, **`/wp-json/`**,
`/*/feed/`, `/*/embed/`, `/?p=`, `/search/`, `/?s=`, all filter/facet query parameters
(`?sie_geo=`, `?sie_country=`, `?range=`, `?pr_range=`, `?cluster=`, `?page_key=`, `?export=`, `?hei_id=`,
`?lid=`, …), internal debug parameters (`?sie_leo_qa=`, `?leo_lead_demo=`, …), and tracking parameters.
`Allow: /wp-content/uploads/`, `/*.css$`, `/*.js$`, `/*.webp$`, `/*.svg$`.

Crawler-specific: `Crawl-delay: 10` (bingbot), `20` (Yandex, Seznam), `30` (AhrefsBot, SemrushBot,
DotBot, MJ12bot, GPTBot, ClaudeBot, CCBot, Google-Extended, Applebot-Extended, meta-externalagent);
`Disallow: /` for Bytespider, PetalBot, ImagesiftBot, Timpibot.
`Sitemap: https://www.studyineurope.eu/sie-sitemap.xml`.

The file's own comments are worth quoting, because they show a careful operator and remind us what
robots.txt is:
> "**WHAT IT DOES NOT DO: robots.txt is a REQUEST, not a control.** Scrapers that crash a site ignore it
> entirely. Rate limiting at Cloudflare is what actually enforces anything — see the notes JC has on that."
> "Bytespider (ByteDance) → notoriously aggressive and widely reported to ignore robots.txt. Blocked here,
> but only Cloudflare can enforce it."

**Note:** `/wp-json/` is disallowed, i.e. **the WordPress REST API is walled off.** No API.
The `Crawl-delay` values for AI crawlers are 30 s and are accompanied by the comment that those bots
"send no traffic back" and are "Throttled, not blocked — flip to `Disallow: /` … if you decide training use
isn't worth it." That is a stated position on AI use. **We are not an AI training crawler and not
seeking a licence for that; we are building a product.** But it confirms the operator has a deliberate,
restrictive posture toward automated reuse.

### b) API / feed / sitemap / bulk download
- **No public API.** `/wp-json/` disallowed. There is a **paid** institutional subscription product with
  institution logins — i.e. **the operator's approved access route is a paid licence**, and it is priced
  for institutions, not aggregators.
- No RSS offered for programme data. No open dataset. No bulk download.
- Sitemap exists at `https://www.studyineurope.eu/sie-sitemap.xml`.

### c) Explicit permission?
**Explicitly refused**, twice: no copying without written permission (§7); no scraping or unauthorized
data collection (§8). Written permission is available on request at `support@studyineurope.eu`.

### d) Licensing of the content
- All rights reserved (§7). No open licence anywhere on the site.
- **Provenance is unverified.** The site's own homepage claims programs are "human-verified" / "verified
  institutions", but **the provenance of each programme record is not disclosed**. We cannot verify whether
  any individual record is a reproduction of a consortium's own content, and §5.5 places accuracy
  obligations on paying institutions — not on verification by the operator.
- This is decisive for our hard requirement: **we cannot satisfy "each record must keep an identifiable
  official source" using this site's data, because the data does not carry an identifiable official source.**
  Adopting its dataset would mean back-filling official URLs by inference, which is exactly the
  invention-of-data failure the project forbids.

### e) Attribution requirements
**None available.** With no licence, there is no attribution that would make reuse lawful.

### f) Rate limits
Operator-stated: `Crawl-delay` 10-30 s depending on agent; **Cloudflare rate limiting is the actual
enforcement** ("Rate limiting at Cloudflare is what actually enforces anything"). Note `Disallow: /export=`
— there appears to be an export feature reserved for permitted parties.

### g) Personal data
- **High, and structurally adverse.** The site's business model *is* PII: it collects student details via
  "Request Information" forms and **resells the leads to institutions**. ToU §5.4 verbatim: *"When you
  receive a lead, you become an independent data controller for that student's personal data … Not use the
  data for unsolicited marketing, **resale**, or any purpose unrelated to the student's inquiry."*
  The operator is an independent controller for lead data.
- → **Never ingest any personal data from this site under any circumstances.** Also never send it users'
  data or contact details.

### h) VERDICT: **DO-NOT-USE** — for discovery **and** for records

Justification: (1) all rights reserved with an express no-copy clause; (2) an express prohibition on
commercial scraping and unauthorized data collection; (3) **no API, feed, or bulk access** — the approved
route is a paid institutional licence; (4) **programme provenance is undisclosed**, so it cannot satisfy
the project's official-source requirement even if we had permission; (5) the content origin is
**commercially affiliated with the universities it lists** — its §5.4 lead-resale model means its
"recommendation" ranking is not independent, which is a **material disclosure obligation** for us, not
just a legal one.

### i) Recommended acquisition method: **drop. Refer to the official EU portal.**

- **Replace it with `https://education.ec.europa.eu/study-in-europe`** — the genuine EU Study in Europe
  portal, CC BY 4.0, and the correct thing to cite.
- If `studyineurope.eu` ever becomes genuinely useful to users, the honest and compliant answer is a
  **plain outbound link**, labelled as a third-party commercial service, with a **disclosure that we
  receive no data from it and have no commercial relationship with it**.
- **If we ever want its data: buy the institutional licence.** That is the operator's designed access
  route and the only one that is clean. Note this creates a conflict-of-interest disclosure duty and is
  out of MVP scope.

### The distinction the brief asked us to explain

> **A discovery/reference source tells you *where to look*. A record source tells you *what is true*.**

| | Discovery / reference source | Primary record source |
|---|---|---|
| Role | Finds candidate URLs | Supplies the facts you publish |
| `source_url` | **Never** becomes the record's `source_url` | **Is** the record's `source_url` |
| Licence bar | Must not forbid *linking/navigation* | Must permit *storing and displaying* the data |
| Attribution | Usually none | Mandatory |
| Failure mode | A dead link | **A published falsehood** |
| Examples | A blog, a newsletter, a forum, a paid directory | The programme's own official page, an official API/feed under an open licence |

Applied here:
- **`education.ec.europa.eu/study-in-europe`** (official EU portal, CC BY 4.0) → legitimate
  **discovery** source, and acceptable for factual metadata *where* we still cite the programme's own page.
- **`studyineurope.eu`** → fails the *record* bar (no licence, express no-copy) **and** should fail the
  *discovery* bar too, because its ToS forbids scraping its content at all. Its mere existence tells us
  nothing we cannot learn from the official EU portal.

**Rule of thumb:** a discovery source only earns its place if it is *permitted to look at*, which is a
lower bar than being permitted to *republish*. Any source that fails even the lower bar is dropped.

---

## 7. Ranked shortlist — the 1-2 safest sources to implement in MVP

### 🥇 #1 — EACEA Erasmus Mundus Catalogue RSS feed
`https://www.eacea.ec.europa.eu/node/253/rss_en`

**Why it is the safest:**
- **A licence actually exists and is verified**: EU-owned content, CC BY 4.0, by Commission Decision
  2011/833/EU (`https://commission.europa.eu/legal-notice_en`). We are not inferring permission.
- **A machine-readable feed is published for exactly this purpose.** We are using the intended channel,
  not working around one. No ToS tension whatsoever.
- **robots.txt permits it**, with the root sitemap published and no crawl-delay.
- **Zero personal data.** Verified: institution names only. The cleanest source in the matrix.
- **The feed hands us the source-of-truth URL directly** — each item's `<link>`/`<guid>` is the programme's
  own official consortium website. Our `source_url` requirement is satisfied **by construction**, not by
  guesswork.
- **It solves discovery *and* freshness**: `pubDate` per item tells us exactly what changed.
- **Low blast radius if we are wrong**: a wrong assumption here damages a public-interest catalogue, not
  a person's rights.

**Known limitations, designed around:**
- The feed is a **bounded delta feed**, not the complete catalogue — it mixes current and `Legacy`
  collections. So the feed is the **change trigger**, and the corpus is human-seeded. This enforces our
  no-invented-data rule rather than working against it.
- Detail fields (deadlines, tuition, application steps) are **not** in the feed. Those live on each
  consortium's own site — which is a **separate, permission-gated adapter we do not build in MVP.**
- We ingest **no** EU logos/emblems (excluded by the Commission legal notice).

**Effort:** one daily HTTP GET, XML parse. Lowest-cost adapter in the matrix.

### 🥈 #2 — Chevening, via manual curation + permission request
**No adapter.** Chosen precisely *because* we should not automate it.

Why it belongs on the shortlist: it is a high-profile, high-demand programme with a small number of
top-level awards — so **human curation has excellent coverage-per-hour economics** and we lose nothing
important by not automating. It is Crown copyright with a plausible (unverified) OGL grant, so the
likely path is a clean written permission, not a fight.

**Do not** build a Chevening crawler on the strength of an unreachable robots.txt. Send the permission
request; ship the curated seed; revisit if they say yes.

### Deliberately excluded from MVP

| Source | Why not |
|---|---|
| **DAAD** | All rights reserved; an API exists and is explicitly disallowed; rights chain broken by DAAD's own notice. **Unambiguous DO-NOT-USE.** |
| **Universities (generic)** | No API; per-institution terms; two major institutions explicitly ban scraping. Enormous MVP risk surface. Link-only. |
| **Fulbright / IIE** | Explicit clause naming "spiders, robots, data mining techniques". Non-negotiable. Link-only. |
| **studyineurope.eu** | Private company, all rights reserved, express no-scraping, undisclosed provenance, PII-based business model. Drop. |
| **erasmus-plus.ec.europa.eu** (main site) | CC BY 4.0 so technically fine — but the EACEA feed (#1) already gives us the same programmes more cleanly. **Add later**; do not crawl two EU sites when one feed suffices. |

**MVP scope, in one line:** *one automated adapter (EACEA RSS) + one curated tier (Chevening, manually
verified) + an outbound-link directory.*

---

## 8. Source-of-truth policy

**The project's proposed rule is correct. We confirm it and refine it into five binding clauses.**

### Confirmed rule
> The record's `source_url` must be the **programme's own official page**. Aggregators are used for
> **DISCOVERY only**.

### Refinements

**8.1 — `source_url` is the programme's own page, always.**
It must be the page published by the awarding body, funding programme, or consortium — not a directory,
not an aggregator, not an encyclopedia, not a government index, not a university aggregator's listing page.
A link is not a source of truth. An aggregator's statement that "X exists" is a *lead*, not a fact.

**8.2 — Two fields, never one. Never conflate discovery with verification.**
```
discovered_via:  "eacea-emjmd-rss" | "chevening-manual-seed" | "curator-submission"
source_url:      "https://www.master-biopham.eu/"          # the programme's own page — source of truth
source_name:     "European Commission, EACEA"               # who to credit
source_licence:  "CC BY 4.0" | "manual-curation" | "written-permission:2026-02-11"
verified_at:     "2026-09-30T08:14:22Z"                     # when a human/last-good-fetch saw it
curator:         "initials or account id"                   # who is answerable
```
`discovered_via` answers *"how did we find this?"*; `source_url` answers *"who says this is true?"*
Collapsing them is exactly how invented data enters a system.

**8.3 — Attribution flows from `source_licence`, not from goodwill.**
Every record carries its licence; the UI renders the matching attribution automatically from it.
No licence field ⇒ the record is not publishable.

**8.4 — **Link, don't copy**, as the default.**
The safest way to reuse a fact from a page whose expression you may not copy is to **link** to it and
record the factual fields you need. This is the ORA model
(`https://ora.ox.ac.uk/terms_of_use`: *"You may freely distribute the URL"*) and it scales to tens of
thousands of sources that will never grant us a licence.

**8.5 — Never let a record's `source_url` point at an aggregator, an AI summary, a search result, or another record in our own database.**
Self-referential "sources" are invented data with a citation. Verified by an automated check plus human
review; a record failing this must be quarantined, not deleted (deletion destroys the audit trail).

**Enforcement (must ship with the adapter layer):** reject any record whose `source_url` host is on the
adapter's own `discovery_hosts` denylist, unless `source_licence` explicitly records written permission
that names that host. Log every rejection.

---

## 9. Legal baseline checklist — mandatory for every adapter we ship

**No adapter merges without every box ticked and stored in code as a `legal_clearance` block.**
An unchecked item blocks the merge. This is the same discipline as the security baseline in
`docs/discovery/security-baseline.md`.

### A. Legal clearance
1. **Exact terms URL recorded**, with the date it was retrieved.
2. **Verbatim clause quoted** in the adapter file — not a paraphrase, not a link alone.
3. **Licence identified and stored** as an enum: `CC BY 4.0` · `OGL v3.0` · `public-domain` ·
   `written-permission` · `manual-curation` · `NONE`. Never a free-text guess.
4. **Permission artefact referenced**: licence URL, or written grant with its reference/date/contact.
5. **robots.txt fetched, archived, and honoured** — including `Crawl-delay`, `Disallow`, and `Sitemap`.
   The archived copy + hash lives in the repo. *Passing robots.txt is necessary, never sufficient.*
6. **Prohibited-use screen passed**: does the ToS name scraping, data mining, robots, or automated
   devices? If yes ⇒ **adapter is blocked**, no exceptions.
7. **Trademark/logo screen passed**: confirm no logo, emblem, seal, or programme name usage implies
   endorsement or affiliation.
8. **Named reviewer sign-off**, recorded with date.

### B. Data protection
9. **No applicant, scholar, alumni, or contact-person personal data stored.** No names, emails, phone
   numbers, national IDs, application statuses, or interview dates.
10. **Named contact persons are not harvested.** If a page names a coordinator, store `contact_role` and a
    link — **never the personal email address.**
11. **No applicant portals are automated, mirrored, proxied, or cached.** Deep-link only.
12. **PII scanner in CI**: regex + entropy checks on every ingested field. **Fails the build.**
13. **Data-minimisation review**: every stored field justified; "we might need it later" is not a reason.
14. **No data from PII-trading sources** — see the §6 lead-resale analysis.

### C. Content and licence
15. **Factual fields only**, authored or normalised by us. **No copied prose, descriptions, or marketing
    copy** from any source.
16. **Short excerpts only** where a licence permits, with attribution and change-indication, and never
    as a substitute for our own summary.
17. **No EU emblem, government seal, or programme logo** reproduced. Textual factual reference only.
18. **Attribution string implemented and rendered** from `source_licence` — not hard-coded per adapter.
19. **Third-party content excluded**: aggregator images, syndicated news, embedded trackers. Text only.
20. **No AI-generated facts.** Every published field traces to a human-verified or licensed source. Model
    output may *draft* a curator note; it may **never** create a record field.

### D. Operational
21. **Rate limits enforced in code**, not in documentation: per-host delay ≥ the source's `Crawl-delay`
    (default 5 s; 10 s for small/embassy/government hosts), concurrency 1 per host, exponential backoff
    on 429/503, hard stop on repeated 4xx.
22. **Conditional GET** (`ETag` / `If-Modified-Since`) on every fetch. Poll cadence matches the source's
    **stated** update frequency — never faster.
23. **Descriptive, identifying User-Agent** with a contact URL. **No user-agent spoofing, no proxy
    rotation, no CAPTCHA circumvention, no browser-automation to defeat bot defences.** Circumventing a
    technical control converts a grey area into a knowing breach.
24. **No credentialed access.** Never log in, never use shared or purchased accounts to read data
    (contrast: `studyineurope.eu` gates data behind paid institutional logins — the approved route is to
    **buy** access, not to circumvent it).
25. **Abuse contact published**, and a real monitored channel for takedowns and complaints.
26. **DMCA / copyright complaint path** live, with a defined response SLA and a documented takedown path.
27. **Kill switch** per adapter: one config flag disables it without a deploy.
28. **Staleness is visible**: records past `freshness_window` are flagged in the UI and de-ranked, never
    silently presented as current.

---

## 10. Disclaimer and attribution requirements

### 10.1 Per-record attribution (rendered from `source_licence`)

**EACEA / Erasmus Mundus (CC BY 4.0) — mandatory, verbatim-compliant:**
> Datos del catálogo Erasmus Mundus Joint Master Degree de la Agencia Executiva Europea de Educación
> y Cultura (EACEA), bajo licencia
> [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/). Datos extraídos y normalizados por
> [Nombre del proyecto].

*(EU content under CC BY 4.0: credit the source, link the licence, indicate changes.)*

**Chevening / any OGL v3.0 source — mandatory:**
> Datos proporcionados por el Gobierno del Reino Unido (FCDO) — programa Chevening. Reutilización bajo
> la [Open Government Licence v3.0](https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3).
> Datos extraídos y normalizados por [Nombre del proyecto].

**Any manually curated source — mandatory:**
> Datos proporcionados por [Fuente oficial], recopilados y verificados manualmente por [Curador] el
> [fecha].

### 10.2 UI components that MUST exist

| Component | Placement | Requirement |
|---|---|---|
| **Per-record attribution line** | On every record card/detail | Rendered from `source_licence`. Non-dismissible. |
| **"Fuente oficial" button** | On every record | Links to `source_url`. **Always present, even when we have every field**, so users can verify in one click. |
| **"Última verificación" timestamp** | On every record | From `verified_at`. Never hidden. |
| **Data provenance panel** | Record detail | `discovered_via`, `source_licence`, `curator`, `verified_at`. |
| **Sources & attribution page** | Site-wide | Every source we use, with its licence, its ToS URL, and the date those terms were reviewed. Plus a per-source **data volume** count. |
| **Report a correction** link | On every record | One click to flag stale or wrong data. Feeds the curation queue. |
| **"How we get our data" explainer** | Site-wide | Plain language, no legalese, explaining discovery-vs-source-of-truth. |

### 10.3 Our own disclaimer — required wording (ES), with EN equivalent

**Non-affiliation (the most important sentence — see §6):**
> **No estamos afiliados, patrocinados ni respaldados por la Comisión Europea, el Gobierno del Reino Unido,
> el DAAD, el Fulbright, el Programa Erasmus+, ninguna universidad ni ningún gobierno o embajada.**

*(We are not affiliated with, sponsored by, or endorsed by the European Commission, the UK Government,
DAAD, Fulbright, the Erasmus+ Programme, any university, or any government or embassy.)*

**No endorsement:**
> La mención de un programa o entidad no implica respaldo, relación institucional ni aprobación de esta
> plataforma.

**Accuracy / staleness — required because our data is inherently stale-able:**
> La información puede estar **desactualizada, incompleta o ser incorrecta**. Los plazos de solicitud,
> importes, requisitos de elegibilidad y disponibilidad de becas **cambian sin aviso** y solo la fuente
> oficial es vinculante. **Verifica siempre los requisitos y plazos en la página oficial antes de
> solicitar.**

**Due diligence:**
> Tu decides si esta plataforma es adecuada para tus circunstancias. Esto no es asesoramiento
> académico, financiero, migratorio ni legal. No somos un servicio de inmigración ni una agencia.

**PII / applications:**
> No somos un portal de solicitudes. **Nunca introduzcamos tus datos personales en sitios de terceros a
> través de esta plataforma.** No revendemos ni compartimos datos de solicitantes.

**Trademarks:**
> Los nombres, logotipos y marcas de los programas son propiedad de sus respectivos titulares. Su
> aparición aquí es únicamente identificativa.

**No warranty on data completeness:**
> No garantizamos haber incluido todos los programas existentes. La ausencia de un programa en esta
> plataforma **no significa** que no exista ni que no siga abierto.

**Terms of use & licensing of our dataset:**
> Licencia de nuestros datos / Términos · Política de privacidad · Solicitud de eliminación de datos.

### 10.4 Things we must never say

- ❌ "Datos de [X]" where X is an aggregator ⇒ implies endorsement by a private company.
- ❌ "Study in Europe" as a data-source attribution ⇒ **would falsely imply EU provenance** (§6). Only
  `education.ec.europa.eu` may be cited under that name.
- ❌ "Verified by Chevening / DAAD / Erasmus" ⇒ we have no such relationship.
- ❌ "Datos en tiempo real" / "always up to date" ⇒ architecturally false.
- ❌ Using programme names as our product/domain name where prohibited (Chevening §7; Erasmus EU emblem rule).

---

## 11. Fallback strategy for AMBIGUOUS sources (the honest, compliant path)

For any source we cannot clear, **do not approximate permission and do not crawl quietly.** The compliant
alternative is to **stop being a publisher of that data and become a signpost**, which is exactly what a
useful, honest scholarship platform does anyway.

### The manual seed dataset — full protocol

**Why this is honest, not a compromise:** every record is created by a named human who opened the official
page and read it. There is no scraping, no licence question, no invented data. It is simply curation —
and it scales well enough for a curated top tier.

1. **Seed scope:** 15-50 programmes chosen for MVP (EACEA EMJM via RSS; Chevening top-level awards
   manually). Depth over breadth.
2. **Every record must carry:**
   - `source_url` → the programme's **own official page** (verified by the curator by opening it)
   - `source_name` → the awarding organisation
   - `source_licence` → `manual-curation`
   - `discovered_via` → `curator-research` or `eacea-emjmd-rss`
   - `curator` → named individual
   - `verified_at` → timestamp the curator actually read the page
   - `fields_sourced` → which fields were read vs. inferred (**all** must be read)
3. **No copy.** Amounts, deadlines, and eligibility criteria recorded as **data** in our own schema.
   Descriptions written in **our own words**. Never a pasted sentence.
4. **Two-person rule for high-risk fields:** deadlines and financial amounts are confirmed by a second
   reviewer. A wrong deadline is the failure that actually harms a user.
5. **Provenance is auditable.** Every record can be traced to a human, a URL, and a timestamp. If a user
   disputes a field, we can name the person who entered it and when.

### The verification cycle — a standing calendar obligation

Cadence is set by **volatility**, not convenience:

| Record type | Re-verification cadence | Why |
|---|---|---|
| Annual fixed-cycle scholarship (EMJM, Chevening) | **Every cycle, plus a pre-deadline sweep** | Deadlines are annual and hard |
| Rolling / always-open scholarship | **Monthly** | Terms can change without announcement |
| Country embassy notice | **Every cycle + 2 weeks before each deadline** | Per-country, per-cycle, frequently revised |
| Any record with a past deadline | **Auto-expire; never delete** | Stale-but-archived beats deleted audit trail |

**Mechanisation that keeps it honest:** a `verified_at` older than the cadence sets
`status = needs_reverification`, which (a) shows a visible badge in the UI, (b) de-ranks the record, and
(c) opens a curation task. **Nothing silently ages into looking current.** A platform that displays stale
data as current has misrepresented itself, whatever its robots.txt says.

### The escalation ladder — one honest answer per tier

```
Source unvetted?
  └─ Tier 0  LINK ONLY        zero stored facts. Outbound link, "official source" label.
        └─ Tier 1  MANUAL SEED     curated record + source_url + curator + verified_at.  ← MVP default
              └─ Tier 2  WRITTEN PERMISSION   formal request sent, grant on file
                    └─ Tier 3  FEED / API under an open licence   fully automated  ← only for EACEA today
                          └─ Tier 4  LICENSED PARTNERSHIP   paid licence / data-sharing agreement
```

**Never skip a tier by assumption.** "No ToS found" is not Tier 3; it is Tier 1 at best.

### What we will not do, explicitly

- ❌ Scrape a site because its robots.txt is silent, and rationalise it as "not prohibited".
- ❌ Scrape a site because a court might call it fair use / fair dealing / Schöpfungsfreiheit. Whether any
  exception applies is **jurisdiction- and fact-specific and is not ours to decide**; the burden of a
  legal defence on a scholarship platform with no legal department is not a risk we accept.
- ❌ Call an internal API that robots.txt disallows, even though it exists and would be easy.
- ❌ Re-publish a private directory's data because its facts are probably correct.
- ❌ Fill gaps with model-generated scholarship details. **The project's hard requirement is no invented
  data. An LLM is not a source.**

### Being wrong in public, honestly
The **"Report a correction"** link is not a nicety — it is the compensating control for everything above.
A published platform with a fast, visible correction path and honest staleness labelling is
**substantially more defensible** than a quiet scraper, and it is the platform users actually deserve.

---

## Appendix A — Verification log

All URLs below were fetched or read on **2026-09-30**. `UNVERIFIED` = attempted and failed, or not
present and not confirmable.

| # | URL | Result |
|---|---|---|
| 1 | `https://www.chevening.org/robots.txt` | **UNVERIFIED** — 6 attempts, all timeout/transport error |
| 2 | `https://chevening.org/robots.txt` | **UNVERIFIED** — timeout |
| 3 | `http://www.chevening.org/robots.txt` | **UNVERIFIED** — timeout |
| 4 | `https://www.chevening.org/about/terms-of-use/` | **UNVERIFIED** — timeout |
| 5 | `https://www.chevening.org/about/privacy-notice/` | **UNVERIFIED** — timeout |
| 6 | `https://www.chevening.org/sitemap_index.xml` | **UNVERIFIED** — timeout |
| 7 | `https://www.chevening.org/cheveners/business-and-finance` | ✅ "© Crown copyright 2021 … FCDO and partner organisations" |
| 8 | `https://www.chevening.org/resource-hub/scholar-support/policies` | ✅ Policies hub; award-scoped terms |
| 9 | `https://www.chevening.org/wp-content/uploads/2026/08/Terms-Conditions-Scholarships_-August-2026-1.pdf` | ✅ Award T&Cs; silent on scraping/reuse |
| 10 | `https://www.chevening.org/resource-hub/alumni/social-media-and-messaging` | ✅ §7 branding/name prohibition |
| 11 | `https://asams.chevening.org/terms` | ✅ **"All content is available under the Open Government Licence v3.0"** (sibling system only) |
| 12 | `https://erasmus-plus.ec.europa.eu/robots.txt` | ✅ Drupal config; no crawl-delay; `/search/` disallowed |
| 13 | `https://commission.europa.eu/legal-notice_en` | ✅ **CC BY 4.0**; Decision 2011/833/EU; logos/trademarks excluded |
| 14 | `https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32011D0833` | ✅ Referenced as the legal basis |
| 15 | `https://erasmus-plus.ec.europa.eu/projects/terms-use` | ✅ Platform terms (last updated 7 June 2024); EU emblem restriction; PII categories |
| 16 | `https://erasmus-plus.ec.europa.eu/projects/search/details/2025-1-ES01-KA121-VET-000325170` | ✅ Beneficiary-content disclaimer |
| 17 | `https://erasmus-plus.ec.europa.eu/opportunities/individuals/students/erasmus-mundus-joint-masters` | ✅ Official flow → EACEA catalogue → programme site |
| 18 | `https://www.eacea.ec.europa.eu/robots.txt` | ✅ No crawl-delay; `/search/` disallowed; sitemap published |
| 19 | `https://www.eacea.ec.europa.eu/scholarships/erasmus-mundus-catalogue_en` | ✅ "updated annually" |
| 20 | **`https://www.eacea.ec.europa.eu/node/253/rss_en`** | ✅ **RSS verified working**; `© European Union, 1995-2026`; consortium URLs, ECTS, universities, `pubDate` |
| 21 | `https://erasmusplus.rs/erasmus-mundus-joint-masters` | ✅ "EMJM Catalogue, which is updated annually" |
| 22 | `https://www.daad.de/robots.txt` | ✅ **`Disallow: /app/bsa/api/`**; `Crawl-delay: 2`; large disallow list |
| 23 | `https://www.daad.de/en/imprint` | ✅ **"All contents of this website … are protected by copyright"** |
| 24 | `https://www.daad.de/de/impressum` | ✅ "urheberrechtlich geschützt" |
| 25 | `https://www.meindaad.de/en/imprint` | ✅ **"personal, private and non-commercial use only"** |
| 26 | `https://www.daad.de/en/data-privacy-statement/` | ✅ GDPR/DSGVO; DPO contact |
| 27 | `https://www.daad.de/rise/en/data-protection-notice` | ✅ Applicant data processing |
| 28 | `https://www.daad.de/sitemap.xml` | ✅ Exists (>5 MB, contents not inspected) |
| 29 | `https://www.daad.de/en/studying-in-germany/scholarships/` | ✅ Links to `www2.daad.de` scholarship database |
| 30 | `https://www2.daad.de/deutschland/stipendium/datenbank/de/21148-stipendiendatenbank` | ✅ DAAD legal caveat on third-party funding info |
| 31 | `https://www2.daad.de/robots.txt` | **UNVERIFIED — HTTP 404** |
| 32 | `https://www.ox.ac.uk/robots.txt` | ✅ **`Crawl-delay: 20`**; `/api/listing/` + course-listing queries disallowed |
| 33 | `https://www.ox.ac.uk/legal` | ✅ Rights asserted; prohibited-use list; English law (via indexed content) |
| 34 | `https://www.cam.ac.uk/robots.txt` | ✅ Standard Drupal; **no crawl-delay**; `/search/` disallowed |
| 35 | `https://ora.ox.ac.uk/terms_of_use` | ✅ URL redistribution free; per-item permissions; **OAI API** |
| 36 | `https://www.unimelb.edu.au/legal/website-terms` | ✅ Non-commercial only; **"no scraping without permission"** |
| 37 | `https://marymount.edu/terms-of-use-policy` | ✅ No robot/spider/scrape without express consent |
| 38 | `https://www.depaul.edu/terms-of-use` | ✅ Personal, non-commercial download only |
| 39 | `https://www.bucknell.edu/terms-use` | ✅ Personal, non-commercial download only |
| 40 | `https://www.stanford.edu/terms` | ✅ Personal/non-commercial download limit |
| 41 | `https://www.state.gov/robots.txt` | ✅ `crawl-delay: 5`; `Disallow:` (empty); sitemap published |
| 42 | **`https://www.iie.org/terms-and-conditions/`** | ✅ **"You may not use spiders, robots, data mining techniques…"**; non-commercial only; NY law |
| 43 | `https://us.fulbrightonline.org/terms-and-conditions` | ✅ Same no-scraping clause mirrored |
| 44 | `https://fulbrightscholars.org/terms-conditions` | ✅ Defers to IIE T&Cs |
| 45 | `https://fulbrightprogram.org/` | ✅ Footer links IIE T&Cs; US Dept of State programme |
| 46 | `https://bj.usembassy.gov/fulbright-foreign-student-program/` | ✅ Benin 2027-28 notice; deadline 30 Apr 2026 |
| 47 | `https://uz.usembassy.gov/fulbright-foreign-student-program` | ✅ Uzbekistan 2027-28 notice |
| 48 | **`https://studyineurope.eu/`** | ✅ **Private Spanish company**, Calle Isla Cristina 10, Valverde del Camino, ESB22654230; paid institution subscriptions + lead sales |
| 49 | **`https://www.studyineurope.eu/terms-of-use/`** | ✅ **§7 no copy w/o written permission; §8 no commercial scraping; Spain law** (updated 10 June 2026) |
| 50 | **`https://studyineurope.eu/robots.txt`** | ✅ `/wp-json/` disallowed; `Crawl-delay` 10-30 s; AI crawlers throttled; Cloudflare enforces; sitemap published |
| 51 | `https://education.ec.europa.eu/study-in-europe` | ✅ **The actual official EU portal** (CC BY 4.0 via Commission legal notice) |
| 52 | `https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3` | ✅ OGL v3.0 text referenced by ASAMS |
| 53 | `https://www.nationalarchives.gov.uk/information-management/re-using-public-sector-information/uk-government-licensing-framework/crown-copyright` | ✅ Keeper of Public Records decides Crown copyright licensing |
| 54 | `https://data.europa.eu/api/hub/search/...` | **UNVERIFIED** — no usable public API endpoint found for Erasmus+ datasets |

### Known open questions blocking full verification

1. **Chevening robots.txt content** — unreachable from this environment. **Must be checked before any
   Chevening automation is even considered.**
2. **Chevening licensing** — does `chevening.org` publish an OGL v3.0 grant? Who owns the editorial
   copyright, FCDO or the British Council? Requires a written enquiry to
   `https://www.chevening.org/about/contact-us/`.
3. **`www2.daad.de` crawl policy** — 404 on robots.txt; unresolved (moot while DAAD is DO-NOT-USE).
4. **University page-level licences** — cannot be checked at scale; requires per-record verification.
5. **`education.ec.europa.eu/study-in-europe`** — assessed as the *replacement* for studyineurope.eu but
   **not yet separately vetted** (sitemap, feed availability, and whether its programme listings carry
   official-source URLs). **Recommended Phase-2 assessment.**

---

## Appendix B — One-page decision summary

```
                        Is there a licence?
                                 │
        ┌────────────────────────┼────────────────────────┐
        │                        │                        │
   CC BY 4.0 / OGL          All rights reserved      Silent / UNVERIFIED
   (EACEA, EU, gov)        (DAAD, studyineurope.eu)   (Chevening, univ.)
        │                        │                        │
   Is machine access        Does ToS name robots/     Do NOT crawl.
   published & allowed?     scraping/data mining?     AMBIGUOUS by default.
        │                        │
   ┌────┴────┐              ┌─────┴──────┐
   YES       NO             YES         NO
   │         │              │            │
 HABILITABLE  AMBIGUOUS   DO-NOT-USE  DO-NOT-USE
   │            │                        (manual curation)
   │         Manual curation
   │         + permission request
   ▼
 FEED/API → DISCOVERY ONLY
 source_url = the programme's own official page
```

**MVP, final:**
1. **EACEA Erasmus Mundus Catalogue RSS** — automated, CC BY 4.0, zero PII, hands us the source URL.
2. **Chevening** — curated by hand, by a named person, with a permission request pending.

Everything else: **link, don't copy.** And if we are ever unsure, the answer is Tier 0 or Tier 1 —
never a clever workaround.

---

*Analysis only — no code was written. This document is a prioritisation risk screen, not legal advice.
Sources marked UNVERIFIED must be verified before any dependent decision. A qualified lawyer must review
anything this project intends to do commercially.*