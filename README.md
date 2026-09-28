# JobsFlow — AI-Powered Job Aggregation Platform

An end-to-end AI pipeline that scrapes fresher/off-campus job postings from 5+ Indian job sites, deduplicates across sources, extracts structured data via Claude API, and publishes to a fast, SEO-optimized public site — all with human-in-the-loop review.

## Architecture

```
Scrape (5 sources) → Dedup (pg_trgm + LLM) → Extract (Claude Batch API)
  → Categorize (Alias table + LLM fallback) → Review Queue → Publish
    → Social Pipeline (image gen + caption gen + multi-platform auto-post)
```

## Key Features

### AI & Data Pipeline
- **Two-Stage Deduplication**: Cheap SQL fuzzy matching (`pg_trgm` similarity index) pre-filters ~75% of candidate matches before triggering LLM confirmation — merging duplicate listings across 5 job boards with near-zero latency.
- **Claude Batch API + Prompt Caching**: Structured extraction with versioned prompt templates, strict Zod schema validation, and `cache_control: ephemeral` for 50%+ token cost reduction.
- **Deterministic Rules + LLM Fallback**: High-speed alias matching for 85% of categories without model calls; LLM serves as graceful escalation only when deterministic heuristics fail.
- **Conflict Resolution & Auditing**: Automatic logging of `CategoryConflict` when deterministic rules and LLM extractions diverge, feeding directly into a human review queue.
- **Cost Engineering**: Claude Haiku + Batch API + prompt caching = **~$1.50-3/month** at steady-state production throughput.

### Multi-Source Scraping
- 5 configurable scrapers: offcampusjobs4u, freshershunt, yohire, fresherstech, jobsnet
- JSON-configurable selectors per source (no code change needed for site redesigns)
- Rate limiting, failure isolation, Telegram alerts on consecutive failures
- Dual-source enrichment: scrapes both aggregator blog + actual company apply page

### Admin Dashboard
- **Review Queue**: `needs_review` items pinned to top with red-orange badge, keyboard shortcuts (j/k/a/r/e)
- **Category Conflict Resolution**: Side-by-side view of rule-based vs LLM extraction disagreements
- **Source Health Monitoring**: Per-source scrape run history, jobs found/week, active toggle
- **Duplicate Audit**: Weekly spot-check view for dedup accuracy verification
- **Job Editor**: Side-by-side raw-vs-cleaned description with word-level diff

### Public Site
- SEO-optimized with `JobPosting` JSON-LD schema on every job page
- Auto-generated sitemap.xml
- Filter by batch year, city, degree, job type
- Apply click tracking with server-side redirect

### Social Automation Pipeline
- **Satori-based image generation**: Programmatic social cards with company logos
- **AI-generated captions**: Claude Haiku generates platform-specific captions
- **Multi-platform posting**: Telegram + Instagram + WhatsApp
- **Company logo resolution**: Automated logo discovery and caching

## Tech Stack

- **Monorepo**: Turborepo with 4 packages
- **Frontend**: Next.js 14, Tailwind CSS, shadcn/ui, React Query
- **Backend**: Next.js API routes (admin/public) + Node.js worker service
- **Database**: PostgreSQL + Prisma (with `pg_trgm` extension)
- **Queue**: BullMQ + Redis
- **AI**: Claude API (Haiku, Batch API, prompt caching)
- **Auth**: NextAuth (admin-only)
- **Alerts**: Telegram bot

## Project Structure

```
apps/
├── web/                    # Next.js — public site + admin dashboard
│   ├── app/
│   │   ├── admin/          # Dashboard: queue, jobs, sources, categories, conflicts
│   │   ├── api/            # API routes for admin operations
│   │   ├── jobs/           # Public job listing + detail pages
│   │   └── sitemap.ts      # Auto-generated sitemap
│   └── components/         # Navbar, sidebar, company logos, ad slots
├── worker/                 # Node.js — background processing
│   ├── scrapers/           # 5 source-specific scrapers
│   ├── pipeline/           # Dedup → Enrich → Categorize → Slug generation
│   ├── social/             # Social image/caption generation + posting
│   ├── crons/              # Auto-expiry cron
│   └── utils/              # Apply URL extraction, deadline parsing, logo resolution
packages/
├── db/                     # Prisma schema + client (10 models, 188 lines)
└── shared/                 # Types, Zod schemas, versioned prompt templates
```

## Quick Start

```bash
# Install dependencies
npm install

# Set up database
cp .env.example .env  # Add your DATABASE_URL and ANTHROPIC_API_KEY
npx prisma migrate dev
npx prisma db seed

# Run the web app
cd apps/web && npm run dev

# Run the worker (separate terminal)
cd apps/worker && npm run dev
```

## Cost Breakdown (Monthly)

| Service | Cost |
|---------|------|
| Claude API (Haiku + Batch) | $1.50-3.00 |
| Hosting (VPS/Railway) | $10-20 |
| Vercel (frontend) | $0 |
| Domain | ~$1 |
| **Total** | **~$12-25** |
