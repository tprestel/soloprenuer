# Proposal Generator

## Purpose
Turn audit findings and call notes into a specific, signed-ready proposal and follow-up email. The proposal is not a generic service menu — it is scoped directly to what the audit found and what came up on the call. Always runs after `free-audit-generator` and ideally after a discovery call with the prospect.

## Inputs Required
- `clients/[business-slug]/context/profile.md` — audit scores, key gaps, call notes, lifecycle
- `clients/[business-slug]/context/research.md` — competitive landscape, keyword opportunity, opportunity summary
- `clients/[business-slug]/context/client.md` — check if populated; use confirmed brand/voice details if available
- `clients/[business-slug]/deliverables/site-architecture.md` — **required if recommending a rebuild**; provides page count for pricing tier selection. If this file doesn't exist, run `website-builder` Gate 1 first before generating the proposal.
- `services/pricing.md` (project root) — confirmed service pricing; if this file doesn't exist, use `[PRICE]` placeholders throughout and add a note at the top of the proposal

---

## Typography Rule

**Banned fonts — never use:** Syne, Fraunces, Space Grotesk, Barlow Condensed, Industry, Eurostile, Bebas Neue, Oswald. These produce cold, mechanical, or abstractly quirky results that read poorly and feel wrong for service business clients. Use warm serifs (Lora, DM Serif Display, Playfair Display), friendly grotesques (Bricolage Grotesque, Plus Jakarta Sans, Outfit), or clearly legible display faces. For large numbers and data, IBM Plex Mono is always a safe, clean choice.

## Terminology Rule

**Customer-facing documents must use "Google Business Profile" (full name) — never the abbreviation "GBP".** This applies to all headings, body copy, section labels, line items, and scope descriptions visible to the client. The only exception is internal code comments not visible to readers.

---

## Steps

### 1. Read All Context Files and Check Assets

Before writing anything, read **all three** context docs and glob the assets folder:

Glob `context/` and read **every file in the folder** — not just the three standard docs. New files may have been added (call notes, intake forms, brand guides) and must be read before starting.

Also glob `assets/` to inventory what's available:
- `assets/logo/` — logo files for use in the proposal header/footer
- `assets/photos/` — photography available for the proposal

**Logo embedding rule:** If a logo file exists in `assets/logo/`, read the file and base64-encode it, then embed it directly into the HTML as a `data:` URI (`<img src="data:image/[type];base64,[encoded]">`). This ensures the logo always renders when the proposal is opened or shared, regardless of where the file lives. Never reference a logo via a relative file path — path-based references break when the file is moved or sent to a client.

**Design continuity rule:** Before writing any HTML, check whether `clients/[business-slug]/deliverables/free-audit.html` exists. If it does, read it and note the design system in use: font families, CSS variable names and values (colors, spacing), header/section patterns, card styles, and overall layout approach. The proposal must continue this same design system so that both documents feel like they came from the same source. Do not introduce new fonts, new color values, or structural layouts that conflict with the audit deliverable. If free-audit.html does not exist, proceed with the proposal's own design system per the rules below.

From the context docs, note:
- All five audit scores and the gaps behind the low ones
- Call notes in profile.md — what did the prospect respond to, ask about, or push back on? This shapes tone and emphasis.
- Lifecycle stage and next action
- Competitive landscape — who is outperforming them and why
- Inferred or confirmed brand colors

Also check `services/pricing.md` at project root. If it exists, use the prices exactly as written. If it doesn't, use `[PRICE]` placeholders and flag them clearly.

Check for `clients/[business-slug]/deliverables/site-architecture.md`. If it exists, read the Page Count Summary table and note the total number of SEO-targeted pages (exclude utility pages: /schedule, /about, /contact, /blog). Use this count to select the correct rebuild pricing tier from `services/pricing.md`. If site-architecture.md does not exist and the audit signals a rebuild is likely needed, **stop and run `website-builder` Gate 1 before continuing**.

---

### 2. Determine Scope

**Step 1 — Website: Rebuild or Optimize in Place?**

This is the first and most important scoping decision. Check `services/pricing.md` for the current decision criteria, and evaluate the following signals from the audit:

- Platform: Is it crawl-limited? (Wix, Squarespace, Weebly, heavy JavaScript → flag)
- Website score: 1–3/10 → lean rebuild
- Volume of issues: if fixing them in place approaches rebuild effort → lean rebuild
- Site age/design: visibly outdated → flag
- Content quality: thin, placeholder-level, or factually wrong → lean rebuild

If **2 or more signals** are present → present the proposal with **two options**:
- **Option A** — Foundation (optimize in place): faster, lower cost, limited by the existing platform
- **Option B** — Foundation + Website Rebuild: recommended, higher cost, removes the platform ceiling

Present both options with clear pricing. Do not pick for the client — let them choose. Make the tradeoffs explicit: Option A is faster and cheaper but the platform remains a ceiling; Option B takes longer but eliminates the constraint.

If **fewer than 2 signals** → propose Foundation (optimize in place) only. No need to introduce rebuild complexity.

**Step 2 — Map remaining audit scores to services**

| Score | Category | Propose |
|---|---|---|
| 1–5 | GBP | GBP Optimization (always part of Foundation) |
| 1–5 | SEO | On-page SEO fixes (H1s, meta, schema, keyword mapping) — included in Foundation |
| 1–5 | AI Search | **Only if rebuilding** — FAQ blocks and structured AI content are built into the new HubSpot site. If optimizing in place, do NOT propose AI search content — it requires structural additions the existing site can't accommodate cleanly. |
| 1–5 | Social | Social Cleanup add-on |
| Any | Ongoing | Monthly Retainer |

For each service being proposed, pull the **specific finding** that justifies it. Don't say "your SEO needs work" — say "your site has zero H1 tags and the only schema Google has is named 'afk-main'."

If call notes exist, check whether the prospect expressed interest in or resistance to any specific service area. Adjust emphasis accordingly — lean into interest, don't lead with resistance.

---

### 3. Generate the Proposal

Create `clients/[business-slug]/deliverables/proposal.html` — a styled, self-contained HTML file. Invoke the `frontend-design` skill before writing any HTML — it sets design direction, typography, and quality standards. Check the Typography Rule above (banned fonts apply here). Use brand primary color from `research.md` or `client.md`, dark header, warm and professional aesthetic appropriate to the client's industry.

**Structure:**

**Header**
- Business name + "Digital Marketing Proposal"
- Prepared for [owner name] · [today's date]
- Dark background with brand primary color accent bar

**Opening — Based on Our Conversation**
- 2–3 sentences acknowledging the call and what was discussed
- Reference one specific thing the prospect said or responded to (from call notes), or if no call notes exist, reference the most compelling audit finding
- The tone: peer-to-peer, not vendor pitch. You did the work, you found the problems, here's what fixing them looks like.

**What We're Fixing**
- List only the gaps that are in scope — each one with:
  - The business impact (lead with consequence, not the technical problem)
  - The specific finding (exact wrong value, exact missing element)
  - What the fix produces

**The Engagement**

If presenting two website options (rebuild vs. optimize), structure the engagement section as:

→ **Option A — Foundation Only** (optimize in place)
- List deliverables, note platform ceiling
- Price from `services/pricing.md` Foundation (optimize in place)
- Delivery timeline

→ **Option B — Foundation + Website Rebuild** *(Recommended)*
- List deliverables for both Foundation and Rebuild
- **Always emphasize the HubSpot infrastructure angle** — this is not just a new website. It's a CRM, lead pipeline, contact capture, source tracking, and meeting scheduler. Most small businesses in this space track leads in their head or a spreadsheet. Frame HubSpot as the system that fixes that.
- Explicitly note: website SEO work (H1s, meta, schema, AI content) is built into the new HubSpot site
- Price: Foundation (with rebuild) + Website Rebuild from `services/pricing.md`
- Delivery timeline (longer — account for build time)
- Make the recommendation clear but not pushy: "We recommend Option B because [specific platform limitation]. Option A is available if you'd prefer to move faster."

If presenting a single option (optimize in place only):

→ **Phase 1 — Foundation** (one-time setup)
List each one-time service being proposed with:
- What we do (specific, not generic)
- What you get at the end
- Time to complete

In both cases:

→ **Growth Retainer** (ongoing monthly, if applicable)
List monthly services with:
- What's done each month
- What you receive (report, content pieces, GBP posts, etc.)

**Investment**
A clean pricing table. If two options, show both side by side:
- Option A total vs Option B total (one-time)
- Growth Retainer monthly (same for both)
- If using placeholders, wrap them visually so they're clearly marked: `[PRICE]`

**Timeline**
A simple visual or table showing:
- When each phase starts/ends
- Key milestones (e.g., "GBP live: Week 1", "Website updated: Week 3")

**Proposed Site Architecture** *(Option B only — rebuild proposals)*

When recommending a rebuild, include a visual sitemap section in the proposal immediately after the Option B deliverables description. Pull page names and URLs from `site-architecture.md`. Render as an HTML/CSS diagram — not a list.

Layout rules:
- Homepage centered at the top in the brand primary color
- Main nav pages (service pages, LO206, Where We Race) in a row below — one card per page in dark charcoal
- Utility/support pages (About, Contact, Schedule, Blog) in a lighter row at the bottom
- Connecting lines from homepage down to each page using CSS borders or SVG — visual hierarchy matters
- Each card shows: page name (bold), URL slug (small, muted), primary keyword + volume (smallest, accent color) if it has one
- Utility pages show the URL slug only — no keyword needed
- Caption below the diagram: "X pages · [total keyword reach]/mo in search volume" — pulled from the architecture summary

The goal is for the client to look at this and immediately understand what they're getting, see that there's real strategy behind it, and feel that the price is justified by the scope.

**What's Not Included**
Short, clear list — sets expectations and prevents scope creep. Examples:
- Paid advertising
- Photography or video production
- Website platform migration (if not in scope)
- Reputation management (responding to reviews) unless included

**Next Steps**
- One clear action: sign and return, or book a follow-up
- Placeholder for e-signature link or contract delivery method
- Your name and contact

**Design rules:**
- Continue the design system from free-audit.html (per the design continuity rule in Step 1)
- Dark header section, light content sections
- Self-contained: all CSS in `<style>` block, no external dependencies except Google Fonts
- Mobile-friendly, printable to PDF

**Mobile media query rule:** Always use `@media screen and (max-width: ...)` — not bare `@media (max-width: ...)`. Without `screen`, the mobile layout applies during print. This can silently hide table cells: a `display: none` on `td:nth-child(2)` will hide the price column on total rows that use fewer `<td>` elements than regular rows. For pricing tables specifically, total/summary rows must use the same number of `<td>` elements as regular rows (use empty `<td></td>` instead of `colspan`) so that `nth-child` selectors behave consistently.

**Print-to-PDF rule (required):** The primary delivery format is a PDF exported from Chrome. Every HTML deliverable must include a `@media print` block that applies `print-color-adjust: exact !important` globally. Required minimum:
```css
/* Suppresses Chrome's built-in date/time header and URL footer */
@page {
  margin: 0;
}

@media print {
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
  html, body {
    height: auto !important;
    overflow: visible !important;
  }
  body {
    padding: 12mm 14mm !important; /* compensates for @page margin: 0 */
  }
  /* CRITICAL: Never apply page-break-inside: avoid to full sections or large containers.
     If a section is taller than one page, Chrome leaves a blank page and pushes it to the next.
     Only apply break-inside to small items (individual cards, list items, timeline rows).
     DO NOT combine page-break-after: avoid on headings with break-inside: avoid on the block
     below — chaining these causes Chrome to leave blank space while pushing content forward. */
  .gap-item, .timeline-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
```

**Logo embedding rule:** If a logo exists in `assets/logo/` and is placed on a dark-colored header, apply `mix-blend-mode: screen` to the `<img>` — not `filter: brightness(0) invert(1)`. Screen blend mode makes dark backgrounds in the logo transparent so only the light/white elements show through, which is correct for logos with built-in backgrounds. Avoid `brightness(0) invert(1)` — it turns the entire image solid white.

---

### 4. Screenshot Review

After writing `proposal.html`, run the full screenshot review loop before moving on:

1. Start a local server: `npx serve -l 3456 clients/[client]/deliverables/` in the background
2. Navigate with Puppeteer to `http://localhost:[port]/proposal.html`
3. Get page height: `document.documentElement.scrollHeight`
4. Take a single full-page screenshot at that height
5. Save to `clients/[client]/temporary-screenshots/proposal/`
6. **Analyze — alignment check first:** In any row of sibling cards, pricing blocks, or repeated elements, verify all content sits at the same vertical position. If one label wraps while others don't, the number or price in that block will sit lower — fix with `min-height` on the variable element. Then check overall typography, color, contrast, and professionalism.
7. Apply fixes, re-screenshot, repeat at least twice
8. Delete temporary screenshots once satisfied
9. Stop the server

Do not present the proposal as complete until at least two screenshot-review-fix cycles have been completed.

---

### 5. Generate the Follow-Up Email

Create `clients/[business-slug]/deliverables/follow-up-email.md` with:

**3 subject line options:**
- One that references something specific from the call (if call notes exist)
- One direct: "Proposal for [Business Name] — [service area]"
- One urgency-light: "Next steps for [Business Name]"

**Email body:**
- 4–6 sentences max
- Reference the call directly — what you talked about, what stood out
- Confirm the proposal is attached and what it covers
- One specific finding or opportunity as the hook — the thing most likely to resonate based on the call
- One clear ask: review the proposal and let you know if they have questions, or book a follow-up if needed
- Sign off with your name

**Tone:** You're following up on a real conversation. Not a sales email. Not a pitch deck cover letter. A direct note from someone who did the work and is ready to help.

**Do not:**
- Summarize the entire proposal in the email — that's what the proposal is for
- Use phrases like "per our conversation" or "as discussed"
- Sound like a template

---

### 6. Update Profile and Work Log
- Append to work log in `context/profile.md`: `| [today's date] | Proposal Generator | Proposal and follow-up email generated |`
- Update Lifecycle:
  - Stage: Proposed
  - Next Action: Follow up in 3–5 business days if no response; run `client-onboarder` after signed

---

## Output
- `clients/[business-slug]/deliverables/proposal.html` — scoped, branded proposal deliverable
- `clients/[business-slug]/deliverables/follow-up-email.md` — email draft with 3 subject line options
