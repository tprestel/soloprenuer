# Deep Researcher

## Purpose
Comprehensively research a blue-collar/trades business prospect and populate the client profile with business context, enriched company data, and competitive landscape. Run this at the **Research** stage — it is always the first skill invoked for any new prospect.

SEO footprint and keyword research live in `presence-auditor`, which runs after this skill and uses the business context, service geography, and competitor intelligence built here to run smarter keyword targeting.

## Inputs Required
Before starting, confirm you have:
- Business name
- Business location (city, state)
- Website URL (if known)
- Industry/trade type

If a client folder doesn't exist yet, create one with the full structure:
- `clients/[business-slug]/context/` — copy all three template docs here
- `clients/[business-slug]/assets/logo/` — create empty; client will populate with logo files
- `clients/[business-slug]/assets/photos/` — create empty; client will populate with photography
- `clients/[business-slug]/deliverables/` — create empty; all output files go here

---

## Steps

### 1. Read and Screenshot the Business First (Before Any Tools)
Navigate to their website in Chrome. **Always take screenshots of the homepage first** — above the fold, then scrolled — before reading content.

Save screenshots to `clients/[business-slug]/assets/screenshots/` — these are used by `presence-auditor` so it doesn't have to re-take them. Name them clearly: `homepage-top.png`, `homepage-full.png`.

**If Chrome renders the site successfully:**
- Read every page in the navigation: homepage, services, about, contact, schedule, etc.
- Answer these questions before moving on:
  - What do they actually do? (Be specific — not just the industry category)
  - How do they operate? (Do they travel? Work at specific venues? Come to customers?)
  - Where do they work? (Physical address vs. service area vs. specific third-party locations)
  - Who do they serve? (Skill level, demographics, motivations)
  - What makes them different? (Look for anything specific — certifications, equipment, tenure, partnerships)
  - What would be easy to misunderstand from a surface read?
- Note anything that contradicts what a quick Google search might suggest

**If Chrome fails or the site is JavaScript-heavy and doesn't render properly:**
- Rely on the homepage screenshots already taken as your primary visual reference
- Note in the profile: "Site could not be fully crawled — using homepage screenshots as reference"
- Continue using the screenshots to answer the business context questions as best you can

Write a **Business Context Summary** (4–6 sentences) to the Audit Findings section of the profile before doing any other research.

---

### 2. Create Draft Context Document
Create `clients/[business-slug]/context/` and copy both template context docs into it: `clients/_template/context/research.md` → `clients/[business-slug]/context/research.md` and `clients/_template/context/client.md` → `clients/[business-slug]/context/client.md` (leave client.md blank — populated post-sale during Onboard). Using the homepage screenshots and everything read in Step 1, populate every section of `context/research.md` you can.

Sections to populate from research:
- **What They Do** — operational detail from service pages
- **Where They Operate** — physical address, any venues/tracks mentioned, service area
- **Who Their Customers Are** — infer from site language, service descriptions, pricing signals
- **Differentiators** — tenure, certifications, equipment, any specific claims on the site
- **Common Misconceptions** — look for site disclaimers, category confusion, GBP misclassification
- **Brand Voice & Tone** — infer from copy tone, word choices, energy level
- **Brand Assets → Colors** — infer primary/background/text colors from homepage screenshots (mark as DRAFT)
- **Brand Assets → Aesthetic** — describe visual style, photography, overall feel

Brand inference is owned by this step. `presence-auditor` reads and uses what's here — it does not re-infer brand.

This document becomes the source of truth for all downstream skills. The `client-onboarder` will fill in confirmed sections post-sale.

---

### 3. Company Enrichment
Use Clay/ZoomInfo tools to enrich the business:
- `enrich_companies` or `account_research` with business name + location
- Pull: owner name, phone, email, employee count, founding year, revenue estimate, tech stack, social profiles

Write findings to the **Business Info** section of the profile.

---

### 4. Deep Market Research
Invoke the `new-client-research` skill with the business name and website URL.

This produces broad business intelligence — brand positioning, competitor messaging, market context. Use the output to deepen the Business Context Summary in the profile.

---

### 5. Competitive Landscape

**Before running competitive research, resolve the geographic scope:**
- **Shop/office location** — where the business is registered and customers call/email
- **Operational location(s)** — where the service is actually delivered (a track, a venue, a customer's home, a service area)

These are often different. A kart racing team's shop is in Columbus but their races happen in Indiana — their competitors are Indiana-area teams just as much as Ohio teams. A mobile auto detailer's shop is in Nashville but serves a 50-mile radius. A contractor's office is in one suburb but they work across the whole metro.

Run competitive research against **both** geographies when they differ:
1. Search Google Maps (in Chrome) for the top 2–3 service keywords anchored to the **operational location** — document every business in the local pack: name, category, review count, star rating
2. Repeat the same Maps search anchored to the **shop location**
3. Invoke `marketing:competitive-brief` to surface competitors with web/SEO presence

**COMPETITOR VERIFICATION — REQUIRED BEFORE WRITING ANY COMPETITOR TO RESEARCH.MD:**

Every competitor name produced by any tool or research step must be individually verified before it is written anywhere. This is non-negotiable — competitive brief tools and AI research tools regularly hallucinate or misidentify businesses.

For each competitor candidate:
1. **Web search the exact name** — look for a website or a confirmed, active social presence (Facebook page, Instagram account, etc.)
2. **Read the source** — confirm with your own eyes that they operate in the same business category as the client
3. **Confirm geography** — confirm they serve the same market
4. **If you are not fully confident** → exclude them, period. Do not hedge, do not include with a caveat.
5. If the business exists but is in a different category → include only if explicitly relevant, and clearly label what they actually are

**What to write to research.md for each confirmed competitor:**
- Business name + confirmed website URL
- Location and what geography they serve
- What services they offer (their actual model, not a generic description)
- What they do better digitally than the client
- Any shared venues or direct overlap points

Pull from the combined verified output:
- What competitors are doing better (positioning, content, SEO)
- Gaps the prospect could own
- Note any competitors that appeared in Maps but have no web presence (GBP-only players)

Write findings to the **Competitive Landscape** section of `context/research.md`.

---

### 6. Opportunity Score
Based on everything gathered so far — business model, competitive landscape, and geographic context — assess the opportunity:
- **Digital Gap Score:** How far behind are they vs. competitors? (1–10, 10 = massive gap = big opportunity)
- **Market Demand:** Are people likely actively searching for this service in this area? (Judgment call — detailed keyword volumes come from `presence-auditor`)
- **Fastest Win:** What's the single quickest improvement that would have the most impact based on what you've seen?

Add a 3–5 sentence **Opportunity Summary** to the Audit Findings section. Note: this is a preliminary assessment — `presence-auditor` will add confirmed keyword volumes and SEO footprint data.

---

### 7. Update Profile
- Append to **Work Log:** `| [today's date] | Deep Researcher | Initial research completed |`
- Update **Lifecycle:**
  - Stage: Research
  - Next Action: Run `presence-auditor` (handles SEO footprint, keyword research, and full digital audit)

---

## Output
- `context/profile.md` — populated with business info, competitive context, and preliminary opportunity summary
- `context/research.md` — populated with business context, competitive landscape, inferred brand, and opportunity summary
- `context/client.md` — created but blank, ready for Onboard stage
- `assets/screenshots/` — homepage screenshots saved for use by `presence-auditor`
- Ready for `presence-auditor` to run full audit + SEO footprint + keyword research
