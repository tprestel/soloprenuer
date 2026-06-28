# Website Builder

## Purpose
Design and build a bespoke HubSpot website for a client that is true to their brand, optimized for their target keywords, and structured to convert visitors into inquiries. Works through three mandatory gates — architecture approval, design direction approval, and full build — to prevent rework and ensure alignment before committing to a full build.

## Typography Rule

**Banned fonts — never use:** Syne, Fraunces, Space Grotesk, Barlow Condensed, Industry, Eurostile, Bebas Neue, Oswald. These produce cold, mechanical, or abstractly quirky results that read poorly and feel wrong for service business clients. Use warm serifs (Lora, DM Serif Display, Playfair Display), friendly grotesques (Bricolage Grotesque, Plus Jakarta Sans, Outfit), or clearly legible display faces. For large numbers and data, IBM Plex Mono is always a safe, clean choice.

## When Each Gate Runs

| Gate | When | Who sees it |
|---|---|---|
| **Gate 1 — Site Architecture** | Pre-proposal, before the client signs | Internal only — used to determine page count and select the correct rebuild pricing tier |
| **Gate 2 — Design Directions** | Post-sale, after the client signs and onboarding is complete | Client — they select a direction before the build starts |
| **Gate 3 — Full Build** | Post-Gate 2 approval | Delivered to client for HubSpot publish review |

**Gate 1 must always run before `proposal-generator`.** Page count from the architecture drives rebuild pricing. Never quote a rebuild without knowing the page count first.

## Inputs Required
- `clients/[business-slug]/context/profile.md` — audit scores, target keywords (already researched)
- `clients/[business-slug]/context/research.md` — competitive landscape, inferred brand, SEO opportunity, target keywords with Semrush data
- `clients/[business-slug]/context/client.md` — confirmed brand assets, voice, goals, reference sites
- `clients/[business-slug]/intake-form.md` — client's services, differentiators, content details
- `clients/[business-slug]/deliverables/site-architecture.md` — required for Gate 2 and Gate 3 (generated in Gate 1)
- `clients/[business-slug]/website/assets/logos/` — logo files for use in nav, footer, and design directions
- `clients/[business-slug]/website/assets/images/` — photography for hero sections, service sections, and throughout the build

**Before starting any gate:** Glob `context/` and read **every file in the folder** — not just the three standard docs. New files may have been added (intake forms, call notes, brand guides) and must be read before starting. Then glob `website/assets/` to inventory available logos and photos. Use real assets in every deliverable. Never use placeholder images when real ones exist.

## Frontend Design Skill — Required

**Always invoke the `frontend-design` skill before writing any HTML file** in Gates 2, 2.5, and 3. This applies to every design direction, every page type sample, and every full-build page. No exceptions. The skill ensures design quality standards are met before committing to markup.

---

## Gate 1 — Site Architecture

### Step 1: Read All Existing SEO Research

Before making any architecture recommendations, read the following and extract what's already known:

- **`context/profile.md` → Target Keywords table** — all researched keywords with volume and current rank
- **`context/research.md` → Target Keywords section** — full tiered keyword set with Semrush competition scores and geographic tier (Primary/Secondary)
- **`context/research.md` → SEO Opportunity section** — what gaps exist and what's achievable
- **`context/research.md` → Competitive Landscape** — what pages competitors have that the client doesn't

**Start with existing research — do not re-derive what's already been done.** The job here is primarily to organize existing researched keywords into a page structure.

**If a page concept needs a keyword not yet in the research:** run it through Semrush (`phrase_this` or `phrase_these`) before assigning it to a page. Check volume and competition — if it has meaningful search volume and reasonable competition, add it to the page and note it as newly researched. If it has low or no volume, do not target it. Find a better alternative from the existing research or flag the gap for the operator. Never assign an unvalidated keyword to a page on assumption alone.

### Step 2: Map Keywords to Pages

For each keyword in the researched set, determine which page it belongs to:
- High-intent service keywords → dedicated service pages
- Location + service combinations → service pages with geographic targeting in H1, meta, and copy
- Brand/overview terms → homepage
- Long-tail / question-based terms → blog content (not static pages)

### Step 3: Generate Site Architecture

Create `clients/[business-slug]/deliverables/site-architecture.md` with the following structure for each page:

```
## [Page Name]
- **URL slug:** /slug
- **Primary keyword:** keyword (X/mo, X.XX competition) — from research.md
- **Secondary keywords:** keyword, keyword — from research.md
- **Search intent:** [What is this visitor trying to do?]
- **Page purpose:** [What does this page do for the business?]
- **Key content requirements:** [What sections/info must be on this page]
- **Internal links to:** [which other pages this links to]
- **Internal links from:** [which pages link here]
- **Source keyword:** [which research.md tier this keyword came from — Primary or Secondary]
```

**Standard pages for most service businesses:**
- Homepage — brand overview, primary keyword, clear path to services
- One page per core service — each targeting a distinct keyword from the researched set
- About — trust and credibility, no keyword target needed
- Contact — conversion page, no keyword target needed
- Blog index — content hub, links to individual posts over time

**Flag any page where:**
- A keyword was researched on-the-fly and came back with low/no volume — note: "keyword not worth targeting — recommend deprioritizing this page or finding an alternative"
- A keyword appears in research but doesn't map cleanly to a service the client actually offers
- No keyword exists and none could be validated through Semrush — note the gap for the operator

**End Gate 1 here. Present site-architecture.md to the operator for approval before proceeding. Do not generate design directions until architecture is approved.**

---

## Gate 2 — Design Directions

### Step 4: Determine Design Archetype

Read the following to determine which archetype(s) fit this client:

- `context/research.md` → Inferred Brand section (colors, aesthetic, photography style)
- `context/client.md` → Confirmed Brand Assets + Brand Voice
- `intake-form.md` → Q15 (reference sites the client admires), Q13–14 (voice and tone)
- Competitor websites from research.md — note what the category default looks like so you can differentiate

Select from four archetypes:

| Archetype | Visual personality | When to use |
|---|---|---|
| **Dark & Bold** | High-contrast, strong photography, aggressive CTAs, condensed display type | Motorsports, auto, gym, outdoor, anything where credibility = toughness |
| **Clean & Professional** | Light background, structured layout, trust-first, measured type | HVAC, plumbing, electrical, medical-adjacent, service trades where trust is the sale |
| **Warm & Local** | Earthy palette, friendly layout, community feel, approachable photography | Landscaping, food, family businesses, local retail, anything relationship-driven |
| **Industrial** | Dense layout, utility-focused, technical credibility, no-nonsense | Construction, manufacturing, B2B trades, anything where expertise is the product |

For 3 design directions, present:
- **Direction 1 & 2:** Two distinct expressions of the recommended archetype — same structure, different visual treatments (e.g., photography-dominant vs. type-dominant, dark vs. dark-with-color-accent)
- **Direction 3:** The next-best archetype as a contrast — "what if we went a different direction entirely"

### Step 5: Generate 3 Full Homepage Concepts

Create three self-contained HTML files:
- `clients/[business-slug]/deliverables/design-direction-a.html`
- `clients/[business-slug]/deliverables/design-direction-b.html`
- `clients/[business-slug]/deliverables/design-direction-c.html`

Each is a **full homepage** — not a lightweight concept. Use real draft copy from the intake form and client.md. Use real keywords from the researched set in the H1 and hero. Use brand colors from research.md / client.md. Use real brand assets from `clients/[business-slug]/website/assets/` if they exist — real logo in the nav and footer, real photography in hero and section images.

**H1 rule:** The H1 must contain the primary keyword but must read as natural language — and it must accurately describe what the business IS. Before writing an H1, ask: what is this business? A venue, a team, a service provider, a shop? The keyword phrase alone doesn't answer that, and writing it as a raw phrase produces something that's both spammy and potentially misleading. "Columbus, Ohio's Go Kart Racing Team" is correct for a team-based operation. "Go Kart Racing Columbus Ohio" is both keyword stuffing and wrong if there's no track in Columbus. The phrasing must make sense to a real visitor reading it for the first time.

**Each homepage must include:**
- Navigation (logo + nav links matching site architecture — **do not include a "Home" or "Homepage" link**; the logo returns to the homepage)
- Hero section (H1 with primary keyword, subheadline, CTA)
- Services overview (cards or sections for each core service)
- Differentiator / about section (why them, 19 years, etc.)
- Social proof (review count, years in business, client outcomes — real data from audit)
- CTA section (book a call, contact, schedule)
- Footer (address, phone, links)

**Design rules:**
- Google Fonts via @import — choose fonts appropriate to the archetype
- All CSS in a `<style>` block — fully self-contained
- Mobile-friendly layout (required — see project CLAUDE.md)
- Each direction must look and feel genuinely different from the others — if two directions could be confused for each other, one needs to change

**Depth check — run this before writing any of the three files:**

Before generating HTML, verify your planned CSS addresses each of the following. If any are missing, fix the plan first:

| Check | What to verify |
|---|---|
| Section backgrounds | Do adjacent sections use meaningfully different values? Stacking `#111` next to `#1a1a1a` next to `#0d0d0d` is flat. Use gradients or larger contrast steps. |
| Card elevation | Do cards/rows have a box-shadow that gives them lift off the background? A flat background-only card reads as a label, not a component. |
| Hero depth | Does the hero have a photo background (if assets exist), a gradient, or a layered overlay? A solid color hero is always flat. |
| Gradient variation | Are any of the main dark sections using `radial-gradient` with a faint brand color to add warmth? |
| Section transitions | Are neighboring dark/light section boundaries defined by more than just a color change — e.g., a shadow, a gradient fade, or a border? |

This check prevents the most common output failure: all sections stacked at the same visual plane with no perceived depth.

**Review banner (required on every design direction file):** Each file must include a full-width banner at the very top of `<body>`, before the nav, with:
- Direction name and letter (e.g. "Design Direction A — Dark & Bold")
- "For Review Only"
- "All copy is draft — we are approving visual direction, not final wording"

Style: dark background, brand primary color bottom border, small uppercase text, muted color with the direction name/label highlighted in the brand color. This banner must be visible on both desktop and mobile.

Create `clients/[business-slug]/deliverables/design-directions-summary.md` explaining:
- What archetype each direction uses and why
- The key design decision that makes each direction distinct
- A recommendation — which direction you'd go and why

### Step 6: Screenshot Review — Design Directions

After all three HTML files are written, run the screenshot review loop on each one before presenting:

1. Start a local server: `npx serve -l 3456 clients/[client]/deliverables/` in the background
2. For each direction (A, B, C) — navigate with Puppeteer, get `document.documentElement.scrollHeight`, take a single full-page screenshot
3. Save each to `clients/[client]/temporary-screenshots/design-direction-[a/b/c]/`
4. **Analyze each screenshot:**
   - **Alignment check:** In any row of cards, service blocks, or repeated elements, confirm all items sit at the same vertical level. If one item has a longer label that wraps, the content below it will drop — fix with `min-height` on the variable element.
   - Depth check: hero has texture/gradient (not flat solid), sections have perceived elevation, no two consecutive sections at the same visual plane
   - Typography: headings are clearly distinct from body, brand color applied consistently
   - Mobile: resize to 375px and re-screenshot — check for overflow or broken layout
5. Apply fixes, re-screenshot, repeat at least twice per direction
6. Delete temporary iteration screenshots — only keep the final version of each direction
7. Stop the server

**End Gate 2 here. Present all three directions to the client. Do not begin full build until the client selects a direction.**

---

## Gate 2.5 — Page Type Samples

### Step 6: Build One Sample Per Page Type

After the client selects a design direction, build one sample page for each distinct page type before building all pages of that type. This allows the operator to approve structure, copy approach, and content depth before committing to the full build.

**Page types that require a sample:**

| Page Type | Sample to Build | Remaining Pages (built after approval) |
|---|---|---|
| Service page | One service page (any) | Remaining service pages |
| Location page | One location page (any) | Remaining location pages |
| Utility pages (About, Contact, FAQ) | About page | Contact, FAQ |
| Homepage | Homepage | — (only one) |

The homepage and any page type with only one instance do not need a separate sample — build them directly in Gate 3.

**For each sample page:**
- Apply the approved design direction as the design system
- Write real copy from intake-form.md and client.md — no placeholder text
- H1 must contain the page's primary keyword from site-architecture.md, written as natural language
- Include all required sections for that page type per site-architecture.md
- Save to `clients/[business-slug]/website/pages/` following the File Structure standard above

**Screenshot review each sample** using the same loop as Gate 3 (serve → screenshot → analyze → fix → iterate twice). Do not present a sample for approval until it has passed two review cycles.

**Present samples to the operator.** Once all page type samples are approved, proceed to Gate 3 to build all remaining pages using the approved sample as the template for that type.

**End Gate 2.5 here. Do not build remaining pages until all page type samples are approved.**

---

## File Structure — Standard for All Client Builds

Every client website must follow this folder hierarchy exactly. This structure was established from the Super Laundry Cincinnati build and applies to all future clients.

```
clients/[business-slug]/website/
  assets/                         ← all client assets live here, inside website/
    logos/
    images/
  pages/
    index.html              ← homepage (only page at pages/ root named index.html)
    about.html
    contact.html
    careers.html            ← if applicable
    [page-name].html        ← all other standalone pages use descriptive names
    locations/
      locations.html        ← hub/overview page — named after the section, NOT index.html
      [location-name].html  ← one file per location (e.g. springdale.html, avondale.html)
    services/
      services.html         ← hub/overview page — named after the section, NOT index.html
      [service-name].html   ← one file per service (e.g. wash-and-fold.html)
  [design-direction-a/b/c.html]   ← Gate 2 files, not production pages
  [design-directions-summary.md]
```

**Assets location:** `assets/` lives inside `website/` — not at the client root. This keeps all website files self-contained under one folder.

**Hub page naming rule:** Hub/overview pages are named after what they contain — `locations.html`, `services.html` — never `index.html`. The only `index.html` in the site is the homepage itself. This makes files self-descriptive and avoids ambiguity when working across multiple folders.

**Asset path rule by depth:**
- `pages/*.html` → `../assets/`
- `pages/locations/*.html` or `pages/services/*.html` → `../../assets/`

---

## Gate 3 — Full Build

### Step 7: Build All Pages

After page type samples are approved, build all remaining pages using the approved sample for each type as the template. Apply the approved design direction as the design system and the approved site architecture as the page list.

Build each page as a separate HTML file under `clients/[business-slug]/website/pages/` following the File Structure standard above:
- `index.html` — homepage (use the approved design direction as the starting point)
- One file per service page (descriptive name, e.g. `wash-and-fold.html`)
- `services/services.html` — services hub
- `locations/locations.html` — locations hub
- `about.html`
- `contact.html`

**For each page:**
- H1 must contain the page's primary keyword from site-architecture.md — written as natural language, not a raw keyword phrase. Write it as a human would say it. "Go Kart Racing in Columbus, Ohio" not "Go Kart Racing Columbus Ohio." The keyword must be present but the heading must sound like something a real business would put on their site.
- Meta description written (150–160 chars, includes primary keyword)
- Title tag written (50–60 chars, includes primary keyword)
- LocalBusiness or Service schema included where appropriate
- Internal links follow the linking structure from site-architecture.md
- Copy written from intake-form.md and client.md — in the client's voice, not generic

**Do not reuse content between pages.** Each service page must be substantively unique — different keyword, different copy, different content focus. Google penalizes thin or near-duplicate pages.

**Print-to-PDF rule (required on all pages):** Every HTML page must include a `@media print` block with global `print-color-adjust: exact !important`. Without this, Chrome suppresses background colors and renders the page mostly blank when printed or saved as PDF. Required minimum:
```css
@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    height: auto !important;
    overflow: visible !important;
  }
}
```

### Step 8: Screenshot Review — Full Site

After all pages are built, run the screenshot review loop on each page before handoff:

1. Start a local server: `npx serve -l 3456 clients/[client]/deliverables/website/` in the background
2. For each page — navigate with Puppeteer, get `document.documentElement.scrollHeight`, take a single full-page screenshot
3. Save each to `clients/[client]/temporary-screenshots/website/[page-slug]/`
4. **Analyze each screenshot:**
   - **Alignment check (priority):** Any repeated card rows, service grids, or feature blocks — confirm all items align. Variable-length headings or subheads are the most common cause of misalignment; fix with `min-height`.
   - Content completeness: all sections present, no placeholder text remaining, copy is client-specific not generic
   - Schema/meta: title and meta description present in `<head>` (check source)
   - Mobile: re-screenshot at 375px width for every page
5. Apply fixes, re-screenshot, repeat at least twice per page
6. Delete temporary screenshots — keep only final versions
7. Stop the server

Do not mark the build as complete or update the work log until all pages have passed at least two screenshot-review-fix cycles.

### Step 9: Update Profile and Work Log
- Append to work log in `context/profile.md`: `| [today's date] | Website Builder | Site architecture approved, design direction approved, full site built |`
- Update Lifecycle:
  - Next Action: Hand off to client for HubSpot publish review; run `gbp-optimizer` and `seo-optimizer` in parallel

---

## Output
- `deliverables/site-architecture.md` — approved page structure with keyword mapping *(Gate 1)*
- `deliverables/design-direction-a/b/c.html` — three full homepage concepts *(Gate 2)*
- `deliverables/design-directions-summary.md` — archetype rationale and recommendation *(Gate 2)*
- `deliverables/website/[sample pages]` — one approved sample per page type *(Gate 2.5)*
- `deliverables/website/` — complete built site, one HTML file per page *(Gate 3)*
