# Soloprenuer — Project Rules

## Pre-Content Checklist

Before producing any piece of content, re-read this file (`CLAUDE.md`) to reaffirm all project rules. Every rule here applies to every deliverable — confirm compliance before writing a single line.

## Client Folder Structure

Every client lives at `clients/[business-slug]/` with the following structure:

```
clients/[business-slug]/
  context/
    profile.md       — audit scores, lifecycle, keywords, work log
    research.md      — business context, competitive landscape, brand
    client.md        — confirmed brand assets, voice, goals (post-sale)
  assets/
    logo/            — logo files (PNG, SVG, EPS, etc.)
    photos/          — photography for use in deliverables and builds
  deliverables/      — all client-facing output files
  temporary-screenshots/  — QA screenshots (deleted after review)
```

**Before starting any content piece:** Glob `context/` and read **every file in the folder** — not just the three standard docs. New context files may be added at any time (intake forms, call notes, brand guides, etc.) and must be read before starting. Then glob `assets/` to see what logo and photo files are available. Use real assets in deliverables wherever possible. Never use placeholder images when real ones exist.

## Frontend Design Skill

Always invoke the `frontend-design` skill when designing anything with a front end. This includes HTML deliverables, proposals, audits, or any internal document that has visual/UI design. No exceptions. Do not skip this step. Do not rationalize around skipping it.

## HTML Screenshot Review Workflow

After creating or significantly updating any HTML file, you MUST run the screenshot review process:

1. **Serve the file** — Start a local server (e.g., `npx serve -l 3456 [directory]`) in the background
2. **Navigate with Puppeteer** — Use `puppeteer_navigate` to open the page at the local URL
3. **Take a single full-page screenshot** — Set the height to match `document.body.scrollHeight` to capture the entire page in one shot
4. **Save to** `clients/[client]/temporary-screenshots/[file-slug]/` where `[client]` is the client's directory name and `[file-slug]` is the HTML filename without extension (e.g., `homepage.html` → `homepage/`)
5. **Invoke `frontend-design`** — Use the skill to analyze the screenshot and guide any improvements
6. **Review the screenshot** — Identify design issues across the full page. **Pay particular attention to alignment:** check that repeated elements (cards, table rows, list items) are vertically and horizontally consistent with each other. Look for: numbers or text sitting at different heights across sibling cards, labels that wrap on one element but not others causing content to shift, flex/grid children that appear offset due to variable-length content, and any element that looks visually "off" relative to its neighbors even if the CSS is technically correct.
7. **Iterate at least twice** — Apply fixes, re-screenshot, and review again. Repeat this cycle a minimum of two times before presenting the work as finished. **Delete temporary iteration screenshots** after improvements have been applied — only keep the final version.
8. **Stop the server** when finished

This is non-negotiable for any HTML deliverable. The screenshots exist so we can visually QA the work.

## HTML Output — Mobile & Desktop

Every HTML file this project produces must be fully usable on both desktop and mobile without a poor experience. No exceptions.

Required:
- Responsive layouts using CSS flexbox/grid with `@media (max-width: 768px)` breakpoints at minimum
- Navigation collapses or adapts on small screens — no horizontal overflow, no cut-off links
- Body text minimum 16px; readable contrast on all backgrounds
- Touch targets minimum 44px tall
- Images use `max-width: 100%; display: block`
- No fixed-width containers that force horizontal scroll on mobile

Applies to: free audits, proposals, design directions, full site builds, and every other HTML deliverable.

## Typography — Banned Fonts

**Never use Syne** or fonts with the same character: cold, rigid, mechanical geometric display faces that feel industrial or tech-adjacent. These are wrong for service business clients and wrong for this project's tone.

Banned by name: Syne, Space Grotesk, Barlow Condensed, Industry, Eurostile, Bebas Neue, Oswald.

What to use instead: warm serifs (Fraunces, DM Serif Display, Playfair Display), friendly grotesques (Bricolage Grotesque, Plus Jakarta Sans, Outfit), or editorial display faces with genuine personality. Match the font to the client's world — a neighborhood laundromat and a motorsport team need completely different type choices.

## UI Component Library

Components live in `ui/components/`. Each has a distinct aesthetic suited to specific brand types (motorsport, SaaS, creative, service business, etc.).

**When adding a new component:**
1. Catalog it — identify its aesthetic, mood, colors, fonts, and which brand types it fits
2. Update the component catalog in memory so future conversations know what's available
3. Never use a component on a client deliverable without confirming the aesthetic matches the client's brand. A futuristic tech component does not belong on a blue-collar site.

**When building client deliverables:** Check the component library first. Use existing components where they fit rather than building from scratch.
