# Free Audit Generator

## Purpose
Transform research and audit findings into a polished, branded free audit deliverable and an outreach email to deliver it. The deliverable is the lead magnet — it demonstrates expertise, shows the prospect what's broken, and creates urgency for a follow-up conversation. Always runs after both `deep-researcher` and `presence-auditor`.

## Inputs Required
- Populated `clients/[business-slug]/context/profile.md`
- Populated `clients/[business-slug]/context/research.md`
- `clients/[business-slug]/context/client.md` (may be blank pre-sale — use research.md brand inferences if so)

---

## Design Requirement
Before writing any HTML or making any design decisions:

1. **Invoke the `frontend-design` skill** — provides design direction, aesthetic guidance, and quality standards. The audit deliverable is a client-facing document and must meet production design standards. No exceptions.

2. **Check the component library at `ui/components/`** — browse available components and consider whether any would genuinely improve the audit layout (score cards, callout blocks, stat displays, CTA sections, etc.). Components are **not required** — only use one if it meaningfully improves the deliverable and its aesthetic matches the client's brand. Building from scratch is fine and often the right call. Never force a component in where it doesn't fit.

Both of these steps must happen before any content is written or layout decisions are made.

---

## Typography Rule

**Banned fonts — never use:** Syne, Fraunces, Space Grotesk, Barlow Condensed, Industry, Eurostile, Bebas Neue, Oswald. These produce cold, mechanical, or abstractly quirky results that read poorly and feel wrong for service business clients. Use warm serifs (Lora, DM Serif Display, Playfair Display), friendly grotesques (Bricolage Grotesque, Plus Jakarta Sans, Outfit), or clearly legible display faces. For large numbers and data, IBM Plex Mono is always a safe, clean choice.

## Terminology Rule

**Customer-facing documents must use "Google Business Profile" (full name) — never the abbreviation "GBP".** This applies to all headings, body copy, section labels, callout blocks, and table headers in the audit HTML. The only exception is internal code comments (CSS, HTML comments not visible to readers).

---

## Steps

### 0. Confirm the Client
Before doing anything, ask: **"Which client should I run this for?"** — do not assume based on which clients have context files. Wait for an explicit answer, then proceed. If only one client folder exists with the required files, name it and ask for confirmation before continuing.

### 1. Read All Context Files and Check Assets
Glob `context/` and read **every file in the folder** before writing anything — not just the three standard docs. New files (call notes, intake forms, brand guides, etc.) may have been added and must be read first. At minimum:
- `context/profile.md` — audit scores, key gaps, quick win, lifecycle stage, keywords
- `context/research.md` — business context, opportunity summary, competitive landscape, inferred brand colors and aesthetic
- `context/client.md` — check if populated; if confirmed brand colors exist here, use them over research.md inferences

Then glob `assets/` to inventory what's available:
- `assets/logo/` — logo files to use in the header/footer
- `assets/photos/` — photography available for use in the deliverable

Use real assets wherever the design calls for them. Never use placeholder images when real ones exist in `assets/`.

Note the following before proceeding:
- Business name, owner name, location, industry
- All five audit scores and their rationales
- The top 3 key gaps (from profile.md)
- The quick win
- Opportunity summary pitch angle
- Primary brand color, background color, text color

---

### 2. Generate the Audit Deliverable
Create `clients/[business-slug]/deliverables/free-audit.html` — a styled, self-contained HTML file that can be opened in any browser and printed to PDF.

**Structure:**

**Header**
- Business name + "Digital Presence Audit"
- Prepared by [your name/brand] + today's date
- Styled with brand primary color on dark background

**The Opportunity (lead with this)**
- 2–3 sentences framing what's possible — not what's broken yet
- Reference the specific search volume opportunity (e.g., "720 people search 'go kart racing Columbus Ohio' every month")
- The message: people are already looking for what you do — let's make sure they can find you

**Score Summary**
Five score cards in a row, each showing:
- Category name (Website, GBP, Traditional SEO, AI Search, Social)
- Score (X/10) displayed prominently
- One-sentence rationale
- Color-code by score: 7–10 = green, 4–6 = yellow, 1–3 = red
- Cards must have visible borders (2px) and equal height — use flexbox with `align-items: stretch`

**Competitive Context**
Choose the right format based on what data is available in `context/research.md`:

→ **Use a table** only when you have confirmed GBP data (category, review count, star rating) for at least 2 actual competitors. Show only direct competitors — never mix competitors with non-competitors in the same table. Clearly highlight the client row.

→ **Use prose** when competitor names are known but GBP metrics are not, or when the main point is about search positioning and category confusion rather than a direct head-to-head comparison. Prose is often better — a thin table with guessed data is worse than a well-written paragraph.

Never fabricate competitor review counts, ratings, or categories. If you don't have confirmed data, don't present it as fact.

**GBP Category Recommendations**
**CRITICAL:** Only recommend GBP categories confirmed to exist in `gbp-categories.csv` (located at project root). Never infer, guess, or suggest a category that is not on the confirmed list. If the right category is ambiguous, name the 2–3 best options from the list and explain the tradeoff — do not pick one without confirmation. The client will see exactly what categories are available when they log into GBP, so anything you suggest must match what they'll find there.

**What We Found**
The top 3 key gaps from profile.md — but framed as business impact, not technical failures:
- Lead each with the business consequence ("You're invisible for searches that your ideal customers are making")
- Follow with the specific technical finding ("Your GBP is categorized as a racing car parts store, not a karting team")
- Keep each gap to 3–4 sentences max
- Use callout blocks for specific verbatim details (bad reviews, internal code names, exact wrong values) — specificity builds credibility

**Keyword Opportunity**
Include a table of target keywords with:
- Monthly search volume (from research.md)
- Current ranking position (or "Not ranking")
- Competition level visualized simply (low/medium/high bar or label)
- A plain-English summary of what the combined opportunity represents

**Your Quick Win**
Highlight the single most impactful thing they can do immediately:
- Box it visually (colored border or background)
- Write it as numbered steps, not prose — concrete and actionable
- Include a time estimate ("Takes 5 minutes")
- This builds trust — it's a real, free fix, not a tease

**What Good Looks Like**
2–3 sentences painting the picture of where they could be — specific to this business, not generic filler.

**Next Steps**
Soft CTA — not a hard sell:
- "I'd love to walk you through these findings and talk about what fixing them would look like for [Business Name]."
- One link or instruction to book a call (placeholder if no scheduling link yet)
- Your name, contact info

**Design rules:**
- Use Google Fonts via @import — Barlow Condensed for headings (bold, condensed, industry-appropriate), Inter for body copy
- Use brand primary color for headings, score card headers, and CTA button (from research.md or client.md)
- Dark background for header and CTA sections, white/light for content sections
- Mobile-friendly layout (max-width container, stacked on small screens)
- No images required — text and color carry the design
- Self-contained: all CSS in a `<style>` block, no external dependencies except Google Fonts

**Mobile media query rule:** Always use `@media screen and (max-width: ...)` — not bare `@media (max-width: ...)`. Without `screen`, the mobile layout applies during print, which can hide content (e.g., a `display: none` on `nth-child(2)` can hide a price column if the row has fewer cells than expected).

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
  /* CRITICAL: Never apply page-break-inside: avoid to .section or other large containers.
     If a container is taller than one page, Chrome leaves a blank page and pushes it forward.
     Only apply break-inside to genuinely small items: individual cards, list rows.
     DO NOT combine page-break-after: avoid on headings with break-inside: avoid on the grid
     below — this chaining causes Chrome to leave blank space while pushing blocks to the next page. */
  .score-grid {
    flex-wrap: nowrap !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .score-card {
    min-width: 0 !important;
    flex: 1 1 0 !important;
  }
  .gap-item {
    page-break-inside: avoid;
    break-inside: avoid;
  }
}
```

---

### 3. Generate the Outreach Email
Create `clients/[business-slug]/deliverables/outreach-email.md` with the following:

**3 subject line options** — vary the angle:
- One curiosity-driven ("Something we found about [Business Name] online")
- One direct ("Your free digital audit is ready")
- One problem-framing ("720 searches/month — and you're not showing up")

**Email body:**
- 4–6 sentences max — short, human, not templated-feeling
- Reference one specific finding that's concrete and surprising (the most jarring gap)
- Attach/link the audit
- One clear ask: a 20-minute call to walk through it together
- Sign off with your name

**Tone:** Peer-to-peer, not vendor-to-prospect. You did them a favor. You're sharing something useful, not pitching a service.

**Do not:**
- List all the problems in the email — that's what the audit is for
- Use phrases like "I wanted to reach out" or "I hope this finds you well"
- Sound like a marketing email

---

### 4. Screenshot Review and Iteration
After writing `free-audit.html`, run the visual QA loop before presenting the work as finished:

1. **Serve the file** — Start a local server: `npx serve -l 3456 clients/[client]/` in the background
2. **Navigate with Puppeteer** — Open `http://localhost:3456/deliverables/free-audit.html`
3. **Take a single full-page screenshot** — Set the viewport height to `document.body.scrollHeight` to capture the entire page in one shot
4. **Save to** `clients/[client]/temporary-screenshots/free-audit/`
5. **Analyze the screenshot** — Check for:
   - **Alignment (priority check):** In any row of sibling cards or repeated elements, verify that numbers, labels, and content sit at the same vertical position across all items. The classic failure: one label wraps to 2 lines while others stay on 1 — the number in that card drops lower than its siblings. Fix with `min-height` on the variable element.
   - Score cards: equal height, visible borders, correct color-coding (red/yellow/green)
   - Typography hierarchy: headings clearly larger than body, brand color applied consistently
   - Section contrast: dark and light sections alternate — no two consecutive same-tone sections
   - Quick win box: visually prominent, not blending into surrounding content
   - Mobile readiness: no obvious overflow or fixed-width containers
   - Overall professionalism: would you hand this to a client?
6. **Apply fixes** directly to the HTML file based on what you see
7. **Repeat at least once** — re-screenshot after fixes and review again
8. **Delete temporary screenshots** once satisfied — only the final version should remain
9. **Stop the server** when finished

Do not present the audit as complete until at least two screenshot-review-fix cycles have been completed.

---

### 5. Update Profile and Work Log
- Create `clients/[business-slug]/deliverables/` folder if it doesn't exist
- Append to work log in `context/profile.md`: `| [today's date] | Free Audit Generator | Free audit deliverable and outreach email generated |`
- Update Lifecycle:
  - Next Action: Send audit to prospect, then run `proposal-generator` after follow-up
- Delete any temporary screenshots from `temporary-screenshots/free-audit/`

---

## Output
- `clients/[business-slug]/deliverables/free-audit.html` — branded, printable audit deliverable
- `clients/[business-slug]/deliverables/outreach-email.md` — email draft with 3 subject line options
