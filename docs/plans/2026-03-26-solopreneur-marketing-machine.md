# Solopreneur Marketing Machine — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a client-centric, agent-powered marketing operations machine that lets a single operator research, onboard, deliver, and retain blue-collar/trades business clients at scale.

**Architecture:** A shared Client Profile + Client Context Document (two markdown files per client) act as the persistent context hub. Claude skills (agents) map to lifecycle stages — each skill reads the documents, does its job, and writes findings back. The operator drives the machine by invoking skills in sequence.

**Long-term vision:** The refined process becomes a productizable workflow — the client documents become the database, the skills become the product features.

---

## Tooling Available

| Tool | Purpose |
|---|---|
| Semrush MCP | Keyword research, domain analysis, rank tracking, site audit, competitor research |
| Clay/ZoomInfo MCP | Company enrichment, contact research, account intelligence |
| HubSpot MCP | CRM pipeline, contact/deal tracking, website CMS |
| Gmail MCP | Draft and send client emails |
| Fireflies MCP | Meeting transcript retrieval, call note summarization |
| Google Drive MCP | Save and retrieve proposal/report/audit documents |
| Chrome MCP | Browser automation — render sites, screenshot, check GBP, verify pages |
| Image Generation | Create visuals for website and social content |
| Web Search / Fetch | General research, competitor site crawling |
| `new-client-research` skill | Deep business context research on a company |
| `marketing:competitive-brief` skill | Competitor positioning and market landscape analysis |
| `marketing:seo-audit` skill | SEO gap and on-page analysis |
| `ai-seo` skill | Optimize content for AI search engines and LLM citation — a key differentiator |

---

## Directory Structure

```
Soloprenuer/
├── docs/
│   └── plans/
│       └── 2026-03-26-solopreneur-marketing-machine.md  ← this file
├── clients/
│   ├── _template/
│   │   ├── profile.md          ← lifecycle, SEO data, scores, work log
│   │   └── context.md          ← brand voice, differentiators, assets, goals
│   └── [business-slug]/
│       ├── profile.md          ← populated during Research + Audit stages
│       ├── context.md          ← populated during Onboard stage (post-sale)
│       └── assets/             ← logo, screenshots, photos, videos
│           └── website-screenshot.png  ← saved if site can't be fully crawled
└── .claude/
    └── skills/
        ├── deep-researcher.md       ← Stage: Research (replaces prospect-researcher)
        ├── free-audit-generator.md  ← Stage: Research (produces free audit deliverable)
        ├── presence-auditor.md      ← Stage: Audit (paid full audit, post-intake)
        ├── proposal-generator.md    ← Stage: Propose
        ├── client-onboarder.md      ← Stage: Onboard (post-sale, populates context.md)
        ├── website-builder.md       ← Stage: Deliver
        ├── gbp-optimizer.md         ← Stage: Deliver
        ├── seo-optimizer.md         ← Stage: Deliver + Retain
        ├── content-creator.md       ← Stage: Deliver + Retain
        ├── monthly-reporter.md      ← Stage: Report + Retain
        └── ai-seo.md                ← Stage: Deliver + Retain (AI search + LLM citation optimization)
```

---

## Service Packages (What We Sell)

### Lead Magnet — The Free Full Audit (free)
Delivered proactively to referred/outbound prospects, or automatically to inbound leads after form submission. This is a complete, comprehensive audit — not a teaser. It demonstrates expertise, earns trust, and does the selling for us. The audit cost is baked into the Foundation price.
- Full website audit (crawlability, mobile, conversion, page structure)
- Full GBP audit (claimed, categories, reviews, posts, NAP consistency)
- Full SEO audit (keyword gaps, on-page, schema, competitor landscape)
- Scorecard: Website / GBP / SEO / Social each rated 1–10 with rationale
- "You're missing X searches/month" finding
- Prioritized action plan
- CTA: "Ready to fix this? Fill out our intake form."

### Tier 1 — The Foundation ($1,750–$3,000)
One-time project. Gets them from invisible to credible.
- Everything in the Full Audit
- Website rebuild on HubSpot (6 pages: homepage, 3 service pages, about, contact)
- Google Business Profile full optimization
- On-page SEO (keywords, meta tags, schema markup)
- End-of-project baseline report + retainer pitch

**Standard Foundation = 6 pages.** Additional pages = out of scope, quoted separately.

### Tier 3 — The Growth Retainer ($500–$800/month)
Ongoing. Compounds over time.
- 2 SEO content pieces/month
- 4 GBP posts/month
- Monthly rank tracking + performance report
- Review generation strategy
- Quarterly website refresh

---

## Client Lifecycle

```
Research → Free Full Audit → [Intake Form] → Propose → Onboard → Deliver → Report → Retain
```

**Two entry paths depending on how the lead came in:**

**Path A — Outbound / Referred**
We identify or receive a referral → Research + Audit → Generate Free Full Audit → Reach out with audit → They fill out intake form → Propose Foundation → ...

**Path B — Inbound (website form)**
They find us and submit a contact form → Research + Audit → Send Free Full Audit → They fill out intake form → Propose Foundation → ...

In both paths, the Free Full Audit is the hook. The intake form comes after — it signals genuine interest and gives us the brand/context info we need to propose accurately. There is no separate paid audit tier.

---

## Client Documents

### `profile.md`
The operational record. Tracks lifecycle stage, SEO data, audit scores, keyword rankings, work log, performance snapshots. Updated by Research, Audit, and Retain-stage skills.

### `context.md`
The brand and business intelligence record. Populated during Onboard (post-sale). Contains everything needed to create content and build assets correctly:
- Business story and mission
- What they do and how (the real operational detail — not just a tagline)
- Where they operate (physical location vs. service area vs. travel — critical for AFK-type businesses)
- Who their customers are (demographics, motivations, skill level)
- Differentiators (what makes them different from competitors — in their own words)
- Brand voice and tone
- Things to never say / common misconceptions to avoid
- Logo file location, brand colors, fonts
- Photo/video assets location
- Goals for the engagement (more calls? more form fills? more foot traffic?)
- Success metrics they care about

---

## Skills to Build

### 1. Deep Researcher (`deep-researcher.md`)
**Stage:** Research
**Trigger:** New prospect identified (outbound, referred, or inbound form submission)
**Inputs:** Business name, location, website URL (if known), trade/industry
**Process:**
  1. **Business context read first** — before any tools:
     - Navigate to their website in Chrome (fully rendered)
     - If Chrome render fails or site is JS-heavy: take full-size screenshot, save to `clients/[slug]/assets/website-screenshot.png`, continue with screenshot as reference
     - Read carefully: what do they actually do? How do they operate? Where do they work? Who do they serve? What makes them different? Note anything that would be misunderstood from a surface read (e.g., "they race at tracks in Indiana, they don't own a venue")
     - Check all navigation pages — schedule, services, about, contact
  2. **Company enrichment** — Clay/ZoomInfo: owner name, phone, email, revenue, employee count, tech stack
  3. **Market research** — invoke `new-client-research` skill for broad business intelligence
  4. **Competitive landscape** — invoke `marketing:competitive-brief` skill for competitor positioning
  5. **SEO footprint** — Semrush: domain overview, organic keywords currently ranking, traffic estimate
  6. **Keyword opportunities** — Semrush: core service + location keyword research, identify top gaps
  7. **Opportunity scoring** — Digital Gap Score (1–10), single biggest quick win, opportunity summary
**Outputs written to profile:** Business Info (fully populated), Digital Presence, preliminary Audit Findings, Competitive Landscape, Target Keywords seeded, Work Log entry
**Screenshot protocol:** Always attempt Chrome visit. If site renders poorly or is uncrawlable, screenshot saves automatically to `assets/website-screenshot.png` and a note is added to the profile.

---

### 2. Free Audit Generator (`free-audit-generator.md`)
**Stage:** Research (runs immediately after Deep Researcher)
**Trigger:** Deep Researcher has completed and profile is populated
**Inputs:** Populated client profile
**Process:**
  - Pull the 3 most impactful gaps from audit findings
  - Pull the single best keyword opportunity ("X people/month search for [service] in [city] — you don't appear")
  - Pull 1 quick win they can act on immediately
  - Format as a polished one-page document:
    - Header: "[Business Name] — Free Digital Presence Audit"
    - Scores table: Website / GBP / SEO each rated with a brief note
    - "The Gap That's Costing You": the keyword finding, personalized
    - Top 3 Issues: specific, named, with business impact framing
    - One Quick Win: something actionable they can do this week
    - Footer CTA: "Ready for the full roadmap? [link to intake form]"
  - Save to Google Drive as `[BusinessName]-Free-Audit-[Date].md`
  - Draft outreach email via Gmail (for outbound) OR trigger response email (for inbound)
**Outputs written to profile:** Work Log entry, stage updated to "Free Audit Sent"
**Deliverable:** Polished free audit doc + outreach/response email draft

---

### 3. Presence Auditor (`presence-auditor.md`)
**Stage:** Research (runs immediately after Deep Researcher, feeds Free Audit Generator)
**Trigger:** Deep Researcher has completed — this runs before the free audit is generated
**Inputs:** Populated profile + any intake form data provided
**Process:**
  - **Website full audit** via Semrush site audit + Chrome:
    - Page inventory (what pages exist?)
    - Crawlability and indexability issues
    - Mobile render check
    - Page speed signals
    - Conversion elements: CTA visibility, phone number, contact form
    - Title tags, meta descriptions, H1s present?
    - Schema markup?
    - Internal linking structure
  - **GBP full audit** via Chrome:
    - Claimed? If not, flag the claim process
    - NAP consistency (Name, Address, Phone matches website exactly?)
    - Primary and secondary categories — accurate?
    - Business description — present, keyword-rich?
    - Services list populated?
    - Photo count (note: target is 10+ minimum)
    - Review count + average rating
    - Last GBP post date
    - Q&A section populated?
  - **SEO full audit** via `marketing:seo-audit` skill + Semrush:
    - Keyword gap vs. top 2 competitors
    - Backlink profile overview
    - Local SEO signals (city/service in headings, local schema)
  - **Social audit** via Chrome:
    - Last post date on Facebook / Instagram
    - Follower count
    - Branding consistency
  - Score each area (Website / GBP / SEO / Social) 1–10 with written rationale
**Outputs written to profile:** All scores updated, detailed Audit Findings, GBP fields, Work Log entry
**Deliverable:** Full audit findings (profile becomes the source for proposal)

---

### 4. Proposal Generator (`proposal-generator.md`)
**Stage:** Propose
**Trigger:** Full audit complete, ready to pitch
**Inputs:** Fully populated client profile
**Process:**
  - Read profile — business name, owner name, audit scores, gaps, keyword opportunities
  - Determine recommended package (Full Audit only vs. Foundation vs. Foundation + Retainer)
  - Generate proposal document:
    - Executive summary: "here's what we found about your business"
    - Scorecard: website / GBP / SEO / social with brief context per score
    - Top 3 gaps with business impact framing (use their language — calls, bookings, foot traffic)
    - Recommended services with explicit scope and deliverables
    - Investment (specific price for recommended package)
    - Timeline (rough phases)
    - What happens next (clear CTA + next step)
  - Save to Google Drive as `[BusinessName]-Proposal-[Date].md`
  - Draft follow-up email via Gmail
**Outputs written to profile:** Work Log entry, stage updated to Propose
**Deliverable:** Proposal doc + follow-up email draft

---

### 5. Client Onboarder (`client-onboarder.md`)
**Stage:** Onboard (post-sale, runs when client signs)
**Trigger:** Client has signed and paid — before any delivery work begins
**Inputs:** Signed client, intake form responses (if available)
**Process:**
  - Create/update HubSpot contact and deal record
  - Send welcome email via Gmail (confirms scope, timeline, what you need from them)
  - Populate `context.md` with all available information:
    - Business story, mission, what they do, how they work, where they operate
    - Customer description
    - Differentiators (in their own words from intake form)
    - Brand voice + things to avoid
    - Goals and success metrics
  - Collect assets:
    - Request logo file (SVG or high-res PNG preferred)
    - Request brand colors (hex codes)
    - Request any existing photos/videos
    - Save received assets to `clients/[slug]/assets/`
  - Document GBP access request (send Google Business Profile invite instructions)
  - Document HubSpot CMS access setup steps
  - Set Fireflies to record all client calls going forward
**Outputs written:** `context.md` fully populated, HubSpot deal created, Work Log entry
**Deliverable:** Context document ready for all downstream skills to use

---

### 6. Website Builder (`website-builder.md`)
**Stage:** Deliver
**Trigger:** Client has been onboarded and context.md is populated
**Inputs:** `profile.md` + `context.md` + assets folder
**Process:**
  - Read both documents — services, keywords, differentiators, brand voice, assets
  - Plan 6-page architecture:
    - Homepage: hero (primary keyword + CTA), services overview, trust signals, phone/contact prominent
    - Service Page 1: most searched service, targets primary keyword
    - Service Page 2: second service, targets secondary keyword
    - Service Page 3: third service or specialty offering
    - About: owner story, credibility, local connection
    - Contact: map, phone (click-to-call), form, hours
  - Build in HubSpot CMS:
    - Mobile-first layout
    - Phone number in header (clickable)
    - Primary CTA above the fold on all pages
    - Keyword-optimized title tags, H1s, meta descriptions per page
    - LocalBusiness + Service schema markup
    - Google Analytics connected
  - Review via Chrome: mobile render, all links, form submission test
  - Update profile with new URL and page list
**Outputs written to profile:** Website URL and platform updated, Work Log entry
**Deliverable:** Live HubSpot website (6 pages)
**Note:** Pages beyond 6 are out of scope — log as a future upsell

---

### 7. GBP Optimizer (`gbp-optimizer.md`)
**Stage:** Deliver (runs alongside Website Builder)
**Trigger:** Client has been onboarded, GBP access granted
**Inputs:** `profile.md` + `context.md`
**Process:**
  - Verify GBP claimed — if not, provide claim instructions
  - Audit current GBP via Chrome (full assessment)
  - Write optimized GBP description (750 chars max, keyword-rich, local, uses their voice)
  - Update/recommend: primary category, secondary categories, service list with descriptions
  - Ensure NAP matches website exactly
  - Create first 4 GBP posts (week 1–4 of retainer):
    - Service spotlight
    - Customer result or story
    - Seasonal/timely offer
    - Team/behind the scenes
  - Seed Q&A with 5 common questions + answers
  - Write review generation strategy: who to ask, when, how (SMS template + email template)
**Outputs written to profile:** GBP fields updated, Work Log entry
**Deliverable:** Optimized GBP + first month posts + review strategy doc

---

### 8. SEO Optimizer (`seo-optimizer.md`)
**Stage:** Deliver + Retain
**Trigger:** Website is live, ready for search optimization
**Inputs:** `profile.md` (target keywords, competitor landscape, website URL)
**Process:**
  - Run Semrush keyword gap vs. top 2 competitors
  - Finalize keyword → page mapping:
    - Homepage → brand + primary location terms
    - Each service page → specific service + location keyword
    - Blog (if exists) → informational / long-tail queries
  - Audit + update on-page SEO per page:
    - Title tag (60 chars: keyword + location + brand)
    - Meta description (155 chars: compelling, includes keyword)
    - H1 (one per page, includes primary keyword)
    - Body copy (natural keyword usage, local references)
    - Image alt text
    - Internal links between service pages
  - Verify/add schema:
    - LocalBusiness on homepage
    - Service schema on service pages
    - BreadcrumbList
  - Set up rank tracking in Semrush for all target keywords
  - Run `ai-seo` skill to optimize content for AI search engines and LLM citation (ChatGPT, Perplexity, etc.)
**Outputs written to profile:** Target Keywords table updated with page mapping, Work Log entry
**Deliverable:** Fully optimized pages + live rank tracking in Semrush + AI search optimization applied

---

### 9. Content Creator (`content-creator.md`)
**Stage:** Deliver + Retain
**Trigger:** Website is live OR monthly retainer content cycle begins
**Inputs:** `profile.md` + `context.md`, content type requested
**Process:**
  - Read both documents — keyword targets, brand voice, differentiators, service details, location
  - Research topic: what are competitors writing? What questions are customers asking? (web search)
  - Draft content using client's voice and context (NOT generic):
    - **Blog post:** 600–1000 words, targets a long-tail keyword, includes local references, ends with CTA
    - **Service page:** 400–600 words, primary service keyword, trust signals, clear CTA
    - **GBP post:** 150–300 words, specific offer or update, CTA (call/visit/learn more)
    - **Social post:** Platform-appropriate, visual concept described, CTA
  - Save draft to Google Drive as `[BusinessName]-Content-[Type]-[Date].md`
  - Update Content History in profile
**Outputs written to profile:** Content History updated, Work Log entry
**Deliverable:** Content draft saved to Google Drive, ready for review or publish
**Important:** Always read `context.md` before writing — content must reflect the real business, not generic industry copy

---

### 10. Monthly Reporter (`monthly-reporter.md`)
**Stage:** Report (end-of-project bridge) + Retain (monthly)
**Trigger:** End of Foundation Project OR first of each month on retainer
**Inputs:** `profile.md`, Semrush rank tracking, Fireflies call notes from the month
**Process:**
  - Pull rank tracking data from Semrush for all target keywords
  - Pull GBP performance data if available (views, calls, direction requests)
  - Pull any Fireflies call notes from the past 30 days
  - Compare to previous month snapshot in profile
  - Generate report:
    - Executive summary (1 paragraph — what moved, what we did)
    - Rankings table: keyword / last month / this month / change
    - GBP performance: views, calls, posts published
    - Content published this month
    - Wins to highlight (use specific numbers)
    - Focus for next month
  - If end-of-project report: add retainer pitch section with projected trajectory
  - Save to Google Drive as `[BusinessName]-Report-[Month]-[Year].md`
  - Draft client email via Gmail with report linked
**Outputs written to profile:** Performance Snapshots updated, Work Log entry
**Deliverable:** Report doc + email draft

---

## Build Order

Build and validate each skill before moving to the next. Use AFK as the test client throughout.

- [x] **Task 1:** Create `clients/_template/context.md` (profile.md already exists and is solid)
- [x] **Task 2:** Evolve `prospect-researcher.md` → `deep-researcher.md` (add Chrome visit + screenshot protocol + skill invocations — most content already exists)
- [x] **Task 3:** Build `presence-auditor.md` — test against AFK
- [ ] **Task 4:** Build `free-audit-generator.md` — test by generating AFK free audit (uses output of Tasks 2+3)
- [ ] **Task 5:** Build `proposal-generator.md` — test against AFK
- [ ] **Task 6:** Build `client-onboarder.md` and create `context.md` template
- [ ] **Task 7:** Build `website-builder.md`
- [ ] **Task 8:** Build `gbp-optimizer.md`
- [ ] **Task 9:** Build `seo-optimizer.md`
- [ ] **Task 10:** Build `content-creator.md`
- [ ] **Task 11:** Build `monthly-reporter.md`
- [ ] **Task 11b:** Build local `ai-seo.md` wrapper skill (wraps system `ai-seo` skill with client context)
- [ ] **Task 12:** Run complete end-to-end dry run on AFK (Research → Free Audit → Propose)
- [ ] **Task 13:** Document operator playbook (how to run the machine, step by step)

---

## HubSpot CRM Pipeline Setup (Operator's Own)

- Pipeline stages mirror lifecycle: Research → Free Audit Sent → Intake Received → Auditing → Proposed → Onboarding → Delivering → Reporting → Retaining
- One deal per client
- Contact = business owner
- Deal name = `[Business Name] — [Package]`
- Notes on deal = link to client profile file path

- [ ] **Task 14:** Set up HubSpot pipeline and deal stages

---

## Payments & Contracts Setup

- **Payments:** HubSpot Payments for invoicing + payment links (keeps everything in CRM)
- **Contracts:** PandaDoc integrated with HubSpot (proposals can become contracts with e-signature)
- **Billing cadence:** Foundation = 50% upfront, 50% on delivery. Retainer = monthly, invoiced on the 1st.

- [ ] **Task 15:** Set up HubSpot Payments
- [ ] **Task 16:** Create contract template in PandaDoc

---

## Open Questions / Decisions Needed

- [ ] What does the intake form look like? (fields, format, where it lives — HubSpot form? Typeform?)
- [ ] What does the inbound lead form on our website look like? (basic contact vs. more detailed)
- [ ] GBP access: clients need to grant Manager access — add to onboarder workflow
- [ ] Finalize exact price points for all three tiers before first real pitch
- [ ] Do we need a referral partner program? (other agencies, accountants, chamber of commerce)
