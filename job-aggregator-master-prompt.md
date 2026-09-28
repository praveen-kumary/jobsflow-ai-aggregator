# MASTER BUILD PROMPT: Job Aggregator Platform (Full Spec, End-to-End)

Paste this entire document into Claude Code / Cursor as the project brief. It is the single source of truth — combines architecture, scraping, dedup, category mapping, Claude API integration, admin dashboard, public site, visual design, and the build timeline. Follow the phase order in Section 13. Do not skip ahead to UI polish before the scrape → dedup → categorize → LLM-clean pipeline is proven correct on real data.

---

## 1. PROJECT OVERVIEW

A job-aggregation platform that:
- Scrapes fresher/off-campus job postings daily from 3-5 source sites
- Correctly merges the SAME job when posted across multiple sources (zero duplicates shown publicly)
- Correctly categorizes every job (batch year, degree, city, job type) regardless of which source it came from
- Uses Claude API (Haiku 4.5, Batch API, prompt caching) to extract structured fields and rewrite each description cleanly — never republishes scraped text verbatim
- Gives full control via an admin dashboard: review queue, category conflict resolution, source health, force-expire
- Publishes to a fast, SEO-optimized public site with a distinctive, non-generic visual identity
- Auto-closes jobs on their deadline date

Operator: one person, part-time, alongside other work. Bias throughout: simple and correct over clever and premature.

**v1 scope — build only this:**
- 3 sources to start (verify each per Section 3 before wiring in)
- Full pipeline: scrape → dedup → categorize → LLM clean → review queue → publish → auto-expire
- Public site with batch/city/degree/job-type filtering + job detail pages
- Admin dashboard: queue, job editor, source health, category management

**Explicitly NOT v1** — park these:
- User accounts, saved jobs, email alerts
- Company self-serve posting
- Mobile app
- More than 5 sources
- Any monetization (ads/affiliate) — add only after weeks of clean, indexed operation

---

## 2. TECH STACK

- TypeScript everywhere
- **Scraper/worker**: Node.js, Playwright (JS-rendered pages) + Cheerio (static HTML/RSS), BullMQ + Redis for scheduling
- **DB**: PostgreSQL + Prisma. Enable `pg_trgm` extension for fuzzy dedup matching.
- **LLM**: Claude API, model `claude-haiku-4-5-20251001` for extraction + rewrite + categorization. Use the **Message Batches API** (this runs on a daily cron, no latency need — 50% cheaper). Use **prompt caching** (`cache_control: {"type": "ephemeral"}`) on the system prompt since it's identical every call.
- **Backend**: Next.js API routes for dashboard/public site; separate Node worker service for scraping, dedup, categorization, enrichment, expiry cron
- **Admin dashboard**: Next.js + Tailwind + shadcn/ui + React Query, dark mode default
- **Public site**: Next.js, SSG/ISR, `JobPosting` schema.org JSON-LD on every job page
- **Auth**: NextAuth, admin dashboard only
- **Notifications**: Telegram bot — scrape failures, category conflicts, daily digest

Monorepo:
```
/apps
  /web        -> public site + admin dashboard (Next.js)
  /worker     -> scraper + dedup + categorization + LLM enrichment + expiry cron (Node/BullMQ)
/packages
  /db         -> Prisma schema + client (shared)
  /shared     -> shared types, zod schemas, prompt templates (versioned as files, not inline strings)
```

**Monthly cost estimate** (steady state): Claude API $1.50-3 (Haiku + Batch API), hosting (small VPS/Railway for Postgres+Redis+worker) $10-20, Vercel frontend $0, domain ~$1/month amortized. Total **~$12-25/month**. Not a cost-constrained project — don't cut correctness (dedup, categorization, LLM cleanup) to save single-digit dollars.

---

## 3. CHOOSING SOURCE SITES

Candidates to evaluate first: offcampusjobs4u.com, freshershunt.in, yohire.in, fresherstech.com, jobsnet.in. Start with 3 (recommend offcampusjobs4u + freshershunt + yohire), add the rest only after the first 3 run clean for 2+ weeks.

Per-site checklist before wiring into code:
- [ ] Check `/robots.txt` — confirm the paths you need aren't disallowed
- [ ] Check `/feed/` — does an RSS feed resolve, and does it carry enough of the post body to extract from?
- [ ] Manually read 15-20 recent posts — is the HTML structure (and category/tag taxonomy) consistent across posts?
- [ ] Check overlap — pull a day's postings from 2 candidates, see how much genuinely overlaps vs. is unique. Too much overlap across all sources means you're adding dedup work, not coverage.
- [ ] Note the apply-link pattern — direct-to-career-page links are easier to validate than the source's own redirect/tracking links.

Store scrape strategy per source as JSON so a site redesign doesn't require a code change:
```json
{
  "feedUrl": "https://example.com/feed/",
  "detailSelectors": {
    "title": "h1.entry-title",
    "body": ".entry-content",
    "applyLink": "a.apply-now-btn",
    "categoryTags": "a[rel='category tag']"
  },
  "rateLimitMs": 2500
}
```

---

## 4. DATABASE SCHEMA (Prisma, complete)

```prisma
model Source {
  id            String   @id @default(cuid())
  name          String
  baseUrl       String
  feedUrl       String?
  scrapeConfig  Json
  isActive      Boolean  @default(true)
  lastScrapedAt DateTime?
  createdAt     DateTime @default(now())
  rawJobs       RawJob[]
  scrapeRuns    ScrapeRun[]
  categoryAliases CategoryAlias[]
}

model ScrapeRun {
  id          String   @id @default(cuid())
  sourceId    String
  source      Source   @relation(fields: [sourceId], references: [id])
  startedAt   DateTime @default(now())
  finishedAt  DateTime?
  status      String   // success | failed | partial
  jobsFound   Int      @default(0)
  jobsNew     Int      @default(0)
  errorMsg    String?
}

model RawJob {
  id                String   @id @default(cuid())
  sourceId          String
  source            Source   @relation(fields: [sourceId], references: [id])
  sourceUrl         String   @unique
  rawTitle          String
  rawHtml           String
  sourceCategoryTags String[] // raw tags/categories as scraped, e.g. ["2026-batch-off-campus-jobs","bangalore-off-campus"]
  companyGuess      String?  // cheap regex pre-extraction from title, used as a Stage-A dedup pre-filter
  roleGuess         String?
  cityGuess         String?
  scrapedAt         DateTime @default(now())
  processedAt       DateTime?
  status            String   @default("pending") // pending | processed | duplicate | rejected_by_llm
  duplicateOfJobId  String?
  job               Job?
}

model Job {
  id                 String    @id @default(cuid())
  rawJobId           String?   @unique
  rawJob             RawJob?   @relation(fields: [rawJobId], references: [id])

  company            String
  companyNormalized  String    // lowercased, punctuation-stripped — dedup matching key
  role               String
  roleNormalized     String
  description        String    @db.Text   // LLM-rewritten, clean
  descriptionRaw     String?   @db.Text   // original, kept for audit — never shown publicly

  batchYears         String[]  // canonical values only, e.g. ["2025","2026"]
  degree             String[]  // canonical values only
  city               String[]  // canonical values only, includes "Remote"/"Pan India" as real values
  jobType            String    // fresher | internship | experienced
  experienceMin      Int?
  experienceMax      Int?
  salaryText         String?
  functionalArea     String?   // Software Development | QA/Testing | Data/Analytics | DevOps/Cloud | Support | Business | HR | Finance | Other

  categoryConfidence String    @default("high") // high | low | needs_review

  applyUrl           String
  sourceAttribution  String?

  deadline           DateTime?
  status             String    @default("draft") // draft | published | expired | rejected
  publishedAt        DateTime?
  expiredAt          DateTime?

  seenOnSourceIds    String[]  // every source this job was independently found on, tracked across merges

  slug               String    @unique
  viewCount          Int       @default(0)
  applyClickCount    Int       @default(0)

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  @@index([status, publishedAt])
  @@index([companyNormalized, roleNormalized])
  @@index([categoryConfidence])
}

// --- Category taxonomy (canonical values live in DB, editable without a deploy) ---

model CanonicalValue {
  id            String @id @default(cuid())
  type          String // "batchYear" | "degree" | "city" | "jobType" | "functionalArea"
  value         String
  isActive      Boolean @default(true)

  @@unique([type, value])
}

model CategoryAlias {
  id              String @id @default(cuid())
  sourceId        String
  source          Source @relation(fields: [sourceId], references: [id])
  rawValue        String  // e.g. "2026-batch-off-campus-jobs" or "BE/BTECH"
  canonicalType   String  // "batchYear" | "degree" | "city" | "jobType"
  canonicalValue  String  // e.g. "2026" or "B.E/B.Tech"
  confidence      Float  @default(1.0)
  createdBy       String @default("manual") // "manual" | "llm_suggested"

  @@unique([sourceId, rawValue, canonicalType])
}

model CategoryConflict {
  id              String   @id @default(cuid())
  jobId           String
  canonicalType   String
  aliasValue      String   // what the Tier-1 alias table said
  llmValue        String   // what the LLM extracted from body text
  resolved        Boolean  @default(false)
  resolvedValue   String?
  createdAt       DateTime @default(now())
}

model AdminUser {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  role         String   @default("editor")
  createdAt    DateTime @default(now())
}
```

Run `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in a migration.

---

## 5. PHASE — SCRAPER

1. **Discovery job** per source (every 6-8h, BullMQ repeatable): fetch feed/listing, extract candidate URLs + titles. Insert into `RawJob` — the `sourceUrl` unique constraint gives free per-source dedup at the DB layer.
2. **Detail scrape**: fetch full page for each new `RawJob`, extract raw text/HTML into `rawHtml`, extract `sourceCategoryTags` from category/tag links on the page, run a cheap regex pass on the title into `companyGuess`/`roleGuess`/`cityGuess` (pre-filter only, not final data).
3. **Rate limit**: 1 request per 2-3s per source, real User-Agent with contact info, respect robots.txt.
4. **Failure isolation**: try/catch per source, log to `ScrapeRun`. One source failing never blocks others. Telegram alert on 2 consecutive failures, or when a normally-active source returns zero new jobs.

---

## 6. PHASE — DEDUPLICATION (two-stage, cheapest first)

**Stage A — SQL pre-filter, no LLM cost:**
```sql
SELECT id, company, role, slug FROM "Job"
WHERE similarity("companyNormalized", $1) > 0.6
  AND similarity("roleNormalized", $2) > 0.5
  AND "createdAt" > now() - interval '30 days'
ORDER BY similarity("companyNormalized", $1) DESC
LIMIT 5;
```
Uses `companyGuess`/`roleGuess`, normalized the same way as `Job.companyNormalized`/`roleNormalized`. No candidates above threshold → skip straight to extraction, it's very likely genuinely new.

**Stage B — LLM-confirmed match**, only when Stage A found candidates: pass the top 1-3 candidates into the same Claude call used for extraction (Section 8), ask it to confirm same-job vs. different. On confirmed duplicate:
- `RawJob.status = duplicate`, `duplicateOfJobId` set
- append this source to the matched `Job.seenOnSourceIds`
- if the new posting has a later deadline, update the existing `Job.deadline` (reposts often extend deadlines — capture that instead of discarding)
- do NOT create a new `Job`

This keeps LLM spend near the extraction-only estimate — only borderline cases pay for the extra dedup-confirmation step.

---

## 7. PHASE — CATEGORY MAPPING (runs alongside dedup/extraction, same LLM call)

**Canonical taxonomy** (seed as `CanonicalValue` rows, editable later without a deploy):
- Batch Year: `2022–2027` (multi-select)
- Degree: `B.E/B.Tech, M.E/M.Tech/M.S, BCA/MCA, B.Com/M.Com, B.Sc/M.Sc, BBA, MBA, Any Degree, Diploma` (multi-select)
- City: `Bangalore, Pune, Chennai, Hyderabad, Noida, Mumbai, Kolkata, Gurgaon, Delhi, Remote, Pan India, ...` (multi-select — `Remote`/`Pan India` are real values, not absence of a city)
- Job Type: `fresher, internship, experienced` (single-select)
- Functional Area (optional, adds real value beyond the reference sites): `Software Development, QA/Testing, Data/Analytics, DevOps/Cloud, Support/Service Desk, Business/Consulting, HR, Finance/Accounting, Other`

**Mapping tiers:**
1. **Tier 1 — alias table** (`CategoryAlias`, deterministic, no LLM cost). Seed manually per source: spend 30 minutes reading that source's actual category/tag slugs and mapping each to canonical values before letting it run unattended. This is the single highest-leverage 30 minutes in the whole project — cheaper than fixing miscategorized jobs later.
2. **Tier 2 — LLM fallback**, only when a raw tag has no alias row or the source gave no usable tags. Same Claude call as extraction — it also returns `batch_years`/`degree`/`city` directly from body text. **When Tier 1 and Tier 2 disagree, log to `CategoryConflict` instead of silently picking one** — disagreements are exactly where miscategorization happens.

**Never guess.** If mapping fails entirely for a field, leave it empty and set `Job.categoryConfidence = needs_review` rather than publishing with wrong/missing categories silently. `needs_review` jobs sort to the top of the admin queue.

**Edge cases to handle explicitly in the extraction prompt** (don't leave to inference):
- "Any Degree" postings → map explicitly to the `Any Degree` canonical value, don't leave `degree` empty (otherwise these vanish from every degree-specific filter page).
- Multi-city postings → store ALL cities mentioned, not just the first.
- "Remote"/"Pan India"/"Work from Home" → dedicated canonical city values, and the prompt must be told to extract cities from the JOB DETAILS only, never from generic site-footer boilerplate ("we cover Mumbai, Bangalore, Hyderabad..." text that isn't about this specific job).
- Batch year ranges ("2024-2026 eligible") → expand into individual years `["2024","2025","2026"]`, never store as a range string.
- Fresher vs. experienced ambiguity → explicit rule in the prompt: `jobType = fresher` only if experience is 0/unspecified-and-labeled-fresher; any stated minimum > 0 is `experienced` regardless of how low. This is a common real-world miscategorization source because the sites themselves are inconsistent about it — don't leave it to model inference.

---

## 8. PHASE — CLAUDE API ENRICHMENT (extraction + dedup-confirmation + categorization, one call)

**Model**: `claude-haiku-4-5-20251001`. **Mode**: Message Batches API. **Caching**: system prompt marked `cache_control: {"type": "ephemeral"}`.

**System prompt** (store versioned at `/packages/shared/prompts/extract-job.md`, never hardcoded inline):

```
You are a data extraction and content-cleaning assistant for a job listings platform.
You will be given the raw scraped text of a job posting, its raw source category tags,
and optionally 1-3 candidate existing job postings that might be duplicates of it.

Return ONLY a JSON object matching this exact schema, no other text:

{
  "is_duplicate": boolean,
  "duplicate_of_index": number | null,
  "is_valid_job": boolean,
  "rejection_reason": string | null,
  "company": string,
  "role": string,
  "batch_years": string[],
  "degree": string[],
  "city": string[],
  "job_type": "fresher" | "internship" | "experienced",
  "functional_area": string | null,
  "experience_min": number | null,
  "experience_max": number | null,
  "salary_text": string | null,
  "apply_url": string,
  "deadline": string | null,
  "description_clean": string
}

Rules for categorization:
- "Any Degree" or "any graduate" postings must set degree to ["Any Degree"], never leave empty.
- List ALL cities mentioned for this specific job, not just the first. "Remote" and "Pan India" are
  valid city values in their own right.
- Only extract cities/eligibility from the JOB'S OWN DETAILS. Ignore generic site boilerplate
  text (e.g. a footer claiming to cover "Mumbai, Bangalore, Hyderabad" in general).
- Expand batch year ranges into individual years, e.g. "2024-2026" -> ["2024","2025","2026"].
- job_type is "fresher" ONLY if experience is 0, unspecified, or explicitly labeled fresher.
  Any stated minimum experience > 0 makes it "experienced" regardless of how low.

Rules for description_clean:
- Full rewrite in your own words. Never copy sentences verbatim from the source text.
- Structure: 1-2 line intro, then "Eligibility" bullets, then "Responsibilities" bullets if
  present, then a one-line "How to Apply" note.
- Keep it factual — do not invent details not present in the source text.
- Plain text with markdown bullets (-), no HTML.

Rules for is_valid_job:
- false if there is no real apply link or company name.
- false if it reads like a pyramid scheme, "pay to apply", or an unrelated ad.
- false if it is not a fresher/off-campus/internship-relevant posting.
```

**Worker pattern:**

```typescript
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic();

async function enqueueEnrichmentBatch(rawJobs: RawJobWithCandidates[]) {
  const requests = rawJobs.map((rj) => ({
    custom_id: rj.id,
    params: {
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1500,
      system: [{ type: "text" as const, text: EXTRACT_JOB_SYSTEM_PROMPT, cache_control: { type: "ephemeral" as const } }],
      messages: [{ role: "user" as const, content: buildUserPrompt(rj.rawHtml, rj.sourceCategoryTags, rj.duplicateCandidates) }],
    },
  }));
  const batch = await client.messages.batches.create({ requests });
  return batch.id; // store against these RawJob rows, poll next cron tick
}

async function pollAndProcessBatch(batchId: string) {
  const batch = await client.messages.batches.retrieve(batchId);
  if (batch.processing_status !== "ended") return;

  const results = await client.messages.batches.results(batchId);
  for await (const entry of results) {
    if (entry.result.type !== "succeeded") continue; // log + retry once, else flag manual review
    const parsed = JobExtractionSchema.safeParse(JSON.parse(stripCodeFences(entry.result.message.content[0].text)));
    if (!parsed.success) continue; // retry once with a stricter reminder, else needs_review
    await handleExtractionResult(entry.custom_id, parsed.data);
  }
}
```

`handleExtractionResult` logic:
- `!is_valid_job` → `RawJob.status = rejected_by_llm`, stop.
- `is_duplicate` → run the merge logic from Section 6, stop.
- Category mismatch between Tier 1 alias and LLM output → write `CategoryConflict` row, set `categoryConfidence = needs_review`.
- No confident city/batch determined → leave field empty, `categoryConfidence = needs_review`.
- Else → create `Job` (`status = draft`), generate slug, store `descriptionRaw` for audit.

---

## 9. PHASE — ADMIN DASHBOARD (full control surface)

Protected by NextAuth. Pages:

1. **`/admin`** — home cards: pending review, published today, sources active/failing, jobs expiring in 3 days, `needs_review` count, weekly volume chart.
2. **`/admin/queue`** — `status = draft` jobs, **`needs_review` rows pinned to top** with a red-orange badge, not mixed in with routine approvals. Columns: company, role, city, batch, source, category-confidence badge. Row actions: Approve & Publish, Edit, Reject, bulk select. Keyboard flow: `j`/`k` navigate, `a` approve, `r` reject, `e` edit — persistent shortcut hint bar at the bottom of the view (see design brief, Section 12).
3. **`/admin/jobs/[id]`** — full edit form. Side-by-side raw-vs-cleaned description with word-level diff. Category fields as multi-select chips, red badge if `categoryConfidence != high`. Deadline required before publish (default +30 days if source gave none, flagged as "estimated").
4. **`/admin/jobs`** — filterable by status/batch/city/degree/source/date. Inline force-expire/re-publish.
5. **`/admin/sources`** — per source: last scrape time, last 10 `ScrapeRun` results, jobs found today/week, active toggle, `scrapeConfig` JSON editor.
6. **`/admin/duplicates`** — everything marked `duplicate` in the last 7 days, for weekly spot-checking that dedup isn't over/under-merging.
7. **`/admin/categories`** — manage `CanonicalValue` rows (add "2028" as a batch year when it appears, deactivate stale years).
8. **`/admin/categories/aliases`** — every `CategoryAlias` per source, inline editable — fix cross-source tagging inconsistencies here once, permanently.
9. **`/admin/categories/conflicts`** — resolve `CategoryConflict` rows, optionally updating the underlying alias so it doesn't recur.

---

## 10. PHASE — AUTO-EXPIRY CRON

Daily (midnight IST):
1. `UPDATE Job SET status='expired', "expiredAt"=now() WHERE status='published' AND deadline < now()`
2. Expired jobs drop from public active listings, stay in DB (future "recently closed" SEO page — don't hard-delete).
3. Telegram daily digest: published today / expired today / pending review / `needs_review` count / source failures.

---

## 11. PHASE — PUBLIC SITE

- Home + category landing pages (`/2026-batch`, `/bangalore-jobs`, `/bca-mca-jobs`) — SSG + ISR (`revalidate: 3600`).
- Job detail page: `JobPosting` JSON-LD schema (title, hiringOrganization, jobLocation, `validThrough` from `deadline`, employmentType) — this is the real SEO lever (Google Jobs surface, less competitive than blue-link search).
- Apply button increments `applyClickCount` server-side before redirecting.
- Auto-generated `sitemap.xml`.
- Follow the visual design direction in Section 12 exactly — do not default to a generic hero-banner SaaS layout.

---

## 12. VISUAL DESIGN BRIEF (both surfaces are different products — do not share one visual language)

### Public site — "the job board"
Audience: a fresher/final-year student scanning fast under time pressure, needs instant trust and deadline visibility. Design from momentum/doors-opening/verification, not generic tech-startup visuals.

**Color** (avoid warm-cream/terracotta and near-black/neon-accent — both are common AI-generated tells):
- `--ink-950: #0F1729` (navy, header/dark sections)
- `--paper-50: #FAFAF7` (warm off-white background)
- `--slate-600: #4B5768` (body text)
- `--signal-500: #E8873A` (amber — reserved ONLY for deadline/urgency indicators and the apply CTA)
- `--verified-600: #1F7A5C` (muted teal — reserved ONLY for the verified badge)
- `--line-200: #E4E1D9` (hairlines)

**Type**: a confident grotesque for headlines/company names (not italic/color-accented single words), a highly legible serif or plain neutral sans for descriptions (pick one, commit). Tabular figures for dates/experience — not a monospace-for-data-aesthetic tell.

**Layout**: left-aligned, sticky filter sidebar, job list IS the hero — no centered marketing hero banner, this is a scanning tool.
```
+--------------------------------------------------+
| [wordmark]              [search]      [WhatsApp]  |
+--------------------------------------------------+
| Filters (sticky sidebar) | Job list                |
| batch / city / degree    | Company · Role · City   |
|                          | Deadline chip [Verified] |
+--------------------------------------------------+
```
Spend the one deliberate design flourish on the deadline chip (amber urgency state under ~3 days, neutral otherwise) — this is both functionally important and the site's actual visual signature. Don't add unrelated bold accents elsewhere.

**Motion**: one thing only — filter-applied list re-order/fade. No hover-lift on every card, no scroll-triggered fade-slide per section.

### Admin dashboard — "the control room"
Audience: you, daily, fast triage, not impressing anyone. Dark mode, table-first (not card-grid — you're comparing many rows at once, cards force one-at-a-time reading).

**Color**:
- `--bg-950: #101114`, `--surface-900: #1A1B1F`, `--text-100: #EDEDEF`, `--muted-500: #86888F`
- `--status-pending: #C9A227`, `--status-published: #3FA66B`, `--status-needs-review: #D6553D` (reserved for `needs_review`/parse-failure rows, must visually jump out), `--status-expired: #5B5D66`

**Type**: one plain UI face (Inter/system-ui), smaller base size than a marketing site — this is data-dense, don't waste vertical space on generous line-height.

**The one deliberate flourish**: a persistent command-palette-style hint bar at the bottom of the queue view showing the keyboard shortcuts — this is the dashboard's actual distinguishing feature (speed), worth the visual presence. Everything else stays quiet.

**Motion**: instant, not animated. Optimistic updates on approve/reject feel like a keystroke response (50-100ms opacity fade max), never bouncy/springy.

**Process instruction for Claude Code**: for both surfaces, plan the token system and layout first, review that plan against this brief for genericness (would this be the default output for any similar page?) before writing component code, revise anything that reads as templated, then build.

---

## 13. BUILD SEQUENCE (do not reorder)

1. Prisma schema + local Postgres + `pg_trgm`. Seed exactly 1 source.
2. Before any scraper code: manually read 15-20 posts from that source, seed `CanonicalValue` rows and that source's `CategoryAlias` rows (Section 7, Tier 1).
3. Build the scraper for that 1 source (RSS-based if it has a feed), capturing `sourceCategoryTags` alongside title/body.
4. Wire Stage-A dedup query — test deliberately against an empty-then-growing `Job` table with a manufactured repost to confirm it catches the duplicate.
5. Wire Tier-1 category alias lookup — confirm it correctly maps a sample of real scraped jobs BEFORE touching the LLM step.
6. Claude Batches API call (extraction + dedup-confirmation + Tier-2 categorization fallback) — get ONE job all the way from raw scrape → clean, correctly-categorized `Job` draft.
7. Bare-bones `/admin/queue` (table + approve button, no shortcuts yet) and `/admin/categories/conflicts`.
8. Bare-bones public listing page.
9. Once the full pipeline is proven correct on 1 source (including the manufactured duplicate test and a category-conflict test), add sources 2 and 3 — this is where cross-source duplicates and cross-source tagging inconsistencies actually surface. Seed each new source's `CategoryAlias` rows (30 min) before letting it run unattended.
10. Auto-expiry cron, Telegram alerts, `/admin/sources` health page.
11. Dashboard UX polish (keyboard shortcuts, diff view, hint bar) and the full visual design pass (Section 12) for both dashboard and public site.
12. SEO schema, sitemap, deploy, submit to Google Search Console, soft-launch via your own WhatsApp/Telegram channel.

Do not let dashboard/design polish happen before dedup and categorization are stress-tested with real repost and cross-source scenarios — that correctness is the actual hard problem here; everything else is standard CRUD and styling.

---

## 14. ONGOING QA (post-launch, not one-time)

- Weekly: skim `/admin/duplicates` and `/admin/categories/conflicts` — small numbers here compound into real inaccuracy if ignored.
- Per new source added: 30-minute manual `CategoryAlias` seeding before unattended operation.
- Monthly: spot-check 10 random published jobs against their original source posting — catches silent drift that automated conflict logs won't (both tiers agreeing but both being wrong).

---

## 15. LEGAL / GUARDRAILS

- Never publish scraped text verbatim — always LLM-rewritten (covered above, repeating because it's the top compliance item: avoids duplicate-content SEO penalties and copyright exposure, and is a prerequisite for cross-source dedup to work at all).
- Respect `robots.txt` and rate limits per source.
- Disclaimer page: jobs are aggregated from public postings, verify with the official company career page before applying.
- A working "report a job / takedown" contact, checked regularly.
- Never auto-publish without `is_valid_job` passing.

---

## 16. LAUNCH CHECKLIST

- [ ] Full pipeline run on 3 sources for 1+ week with daily queue review — zero duplicate leaks, zero scam postings slipping through
- [ ] `/admin/duplicates` and `/admin/categories/conflicts` both checked clean for that week
- [ ] Sitemap submitted to Google Search Console
- [ ] `JobPosting` schema verified with Google's Rich Results Test on a live page
- [ ] Disclaimer, privacy, report-a-job pages live
- [ ] Own WhatsApp/Telegram channel set up
- [ ] Auto-expiry confirmed working at least once before launch
