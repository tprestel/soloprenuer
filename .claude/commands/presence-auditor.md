# Presence Auditor

## Purpose
Run a full digital presence audit on a prospect. Covers SEO footprint, keyword research, website, GBP, traditional SEO, AI search presence, and social. Produces scored findings that feed directly into the Free Audit Generator. Always runs after `deep-researcher` — the client profile and research context must be populated before starting.

The SEO footprint and keyword research steps in this skill are intentionally placed here (not in `deep-researcher`) so they have access to confirmed service geography, competitor names, and business context to produce smarter targeting.

## Inputs Required
- Populated `clients/[business-slug]/context/profile.md` (from Deep Researcher)
- Populated `clients/[business-slug]/context/research.md` (from Deep Researcher)
- Business website URL
- Business name and location

---

## Steps

### 1. Read All Context Files
Glob `context/` and read **every file in the folder** — not just the three standard docs. New files may have been added and must be read before starting. Also glob `assets/` to note what logo and photo files are available (useful for the website audit and brand comparison steps).

From the context docs, note:
- Website URL and platform
- Business name, location, services
- Business context and any misconceptions to watch for
- Confirmed service geography (shop location vs. operational location — may differ)
- Competitor names and their domains (from Competitive Landscape)
- Inferred brand colors and aesthetic (already done by deep-researcher — do not re-infer)

This context shapes how you interpret everything you find and how you build keyword batches in the next step.

---

### 2. SEO Footprint & Keyword Research

Use Semrush to establish current baseline and identify keyword opportunities. Run both sub-steps before moving on.

**2a. Current Footprint**
- `overview_research` → `domain_rank`: authority score, organic traffic estimate
- `organic_research` → `domain_organic`: current ranking keywords, positions, traffic share — sort by volume descending

If the domain has near-zero organic presence, note this explicitly in the profile — it is the opportunity.

Write findings to the **Digital Presence** and **Audit Findings** sections of `profile.md`.

**2b. Keyword Opportunities**

Using the business context from `research.md` — service types, operational geography, competitor names — build targeted keyword batches. The goal is to find searches their ideal customers are already making that they are NOT ranking for.

**Anchor keywords to the right geography.** Before running, answer: where does the customer actually experience the service?
- If the service is delivered at a specific external location → include that location's metro in batches
- If the business serves a wide radius → cover the full service area
- If fixed single address → shop city is correct

Run `phrase_these` in batches:
1. Core service + **operational location** (e.g., "kart racing Indianapolis", "arrive and drive karting Indiana")
2. Core service + **shop/city location** (e.g., "kart racing Columbus Ohio")
3. Core service + **regional metros** within driving distance of the operational location
4. **Near-me intent terms** — service-specific with no location (e.g., "wash and fold near me", "24 hour laundry near me") — often high buyer intent and underserved
5. **Service-specific modifiers** with no location (e.g., "arrive and drive karting", "drop off laundry service") — national buyer intent terms

Identify keywords with meaningful search volume that they are NOT currently ranking for. Organize in the **Target Keywords** table in `profile.md` by tier:
- **Primary** — highest-intent service terms + operational location
- **Secondary** — shop/city location + regional metros + near-me variants

---

### 3. Screenshot the Site

Check `clients/[business-slug]/assets/screenshots/` first — `deep-researcher` saves homepage screenshots there. Use them if available (avoids re-loading the same pages). Only take new screenshots for gaps:
- Service page (if not already captured)
- Mobile viewport test — resize to 375px wide and screenshot the homepage

These screenshots inform the website audit and serve as a before/after baseline.

If the site fails to load or render, screenshot whatever is visible and note it.

---

### 4. Website Audit (Chrome)

Navigate to the website in Chrome for a fully rendered view. Score each area 1–10.

**Crawlability & Indexability**
- Can Google find and index the site? Check `robots.txt` at domain.com/robots.txt
- Is an XML sitemap present and accessible?
- Is the site built on a JS-heavy platform (Wix, Squarespace) that resists crawling?

**Page Inventory**
- List every page in the navigation
- Note any missing pages that should exist (no individual service pages, no about page, etc.)
- Note any pages serving the wrong purpose (e.g., contact page absorbing all local search traffic)

**Mobile & Speed**
- Does the site render correctly on a mobile viewport?
- Any obvious layout breaks or overflow?

**Conversion Elements**
- Is the phone number visible above the fold?
- Is it click-to-call on mobile?
- Clear primary CTA above the fold?
- Contact form present and easy to find?
- Trust signals: years in business, certifications, reviews, photos?

**On-Page SEO**
- Do pages have unique, keyword-optimized title tags?
- Are meta descriptions present and compelling?
- Does each page have a single H1 that includes the target keyword?
- Is the location/city mentioned naturally in the content?
- Are images using descriptive alt text?

**Schema Markup**
- Check for JSON-LD in Chrome: `document.querySelectorAll('script[type="application/ld+json"]')`
- LocalBusiness schema present on homepage?
- Service schemas present on service pages?
- Note: do NOT report "no schema" based solely on web fetch — it strips JS-injected schema

**Score the website 1–10** with a one-sentence rationale.

---

### 5. Google Business Profile Audit (Chrome)

Search `[Business Name] [City]` in Google to find their GBP panel. For multi-location businesses, check the primary or most prominent listing. Assess:

**Basics**
- Is GBP claimed? (Unclaimed = major gap)
- Business name consistent with website?
- Address and phone consistent with website? (NAP match)
- Website URL linked and correct?

**Categories & Services**
- Is the primary category the most accurate and specific available?
- Are secondary categories populated?
- Is the Services section populated with descriptions?

**Content**
- Business description present and keyword-rich? (750 char max)
- Business hours listed and accurate?

**Social Proof**
- Review count and average star rating?
- When was the last review responded to?

**Activity**
- GBP posts published? Last post date?
- Photos present? (Target: 10+ minimum)
- Q&A section populated?

**Score the GBP 1–10** with a one-sentence rationale.

---

### 6. Traditional SEO Audit

Using the Semrush footprint data from Step 2 and the website audit from Step 4, assess the full SEO picture. Invoke the `seo-audit` skill with the client's website URL and this context:
- Site type: local service business
- Primary goal: rank for [core service] + [city] searches
- Known platform: [from profile]
- Top target keywords: [from Step 2]
- Known competitors: [from research.md]

Focus on the **Local Business** section:
- NAP consistency across web (site, GBP, directories)
- Local schema markup (LocalBusiness JSON-LD)
- Location signals in content (city/region in headings, copy)
- Citation consistency (Yelp, BBB, local directories)
- Backlink profile basics (any local/industry links?)
- Keyword gap vs. top 2 confirmed competitors from research.md

Do not reproduce the full seo-audit output — summarize the top issues relevant to this business.

**Score traditional SEO 1–10** with a one-sentence rationale.

---

### 7. AI Search Presence Audit

Invoke the `ai-seo` skill focused on its **AI Visibility Audit** steps:

**Check AI Answers**
Test in ChatGPT and/or Perplexity:
- "[service] in [city]"
- "[business name]"
- "[service] near me [city]"

Record: Does the business appear? Do competitors appear? Which platforms cite them?

**AI Bot Access**
Check robots.txt for blocks on:
- GPTBot (ChatGPT)
- PerplexityBot
- ClaudeBot / anthropic-ai
- Google-Extended (Gemini/AI Overviews)

**Content Extractability**
- Clear, direct description of what they do in the first paragraph?
- Self-contained answer blocks that work without surrounding context?
- Structured H2/H3 headings?
- Any FAQ content?

Summarize the AI search gap in 2–3 sentences.

**Score AI search presence 1–10** with a one-sentence rationale. (Most local businesses will score 1–3 — expected and a major opportunity.)

---

### 8. Social Media Audit (Chrome)

Navigate to Facebook and/or Instagram (URLs from profile if available, otherwise search).

**Facebook**
- Business page present (not personal profile)?
- Last post date?
- Follower/like count?
- Page fully filled out (about, hours, services, website link)?
- Responding to comments/messages?

**Instagram**
- Account present?
- Last post date?
- Follower count?
- Content relevant to the business?
- Link in bio pointing to website?

**General**
- Branding consistent between platforms and website? (logo, colors, tone)
- Same business name used everywhere?

**Score social presence 1–10** with a one-sentence rationale.

---

### 9. Compile Findings and Score

Write all findings to the **Audit Findings** section of `context/profile.md`:

```
## Audit Findings
- **Website Score:** [X]/10 — [one sentence rationale]
- **GBP Score:** [X]/10 — [one sentence rationale]
- **SEO Score:** [X]/10 — [one sentence rationale]
- **AI Search Score:** [X]/10 — [one sentence rationale]
- **Social Score:** [X]/10 — [one sentence rationale]

**Key Gaps:**
1. [Most impactful gap — frame as business impact, not a technical issue]
2. [Second most impactful gap]
3. [Third most impactful gap]

**Quick Win:**
[The single thing they could do this week that would have the most immediate impact]
```

Also update:
- **Digital Presence** section with GBP details (claimed status, rating, review count, last post)
- **Target Keywords** table with findings from Step 2
- **Social** fields if not already populated

---

### 10. Update Profile
- Append to **Work Log:** `| [today's date] | Presence Auditor | Full digital presence audit + SEO footprint + keyword research completed |`
- Update **Lifecycle:**
  - Stage: Research
  - Next Action: Run `free-audit-generator` to produce the free audit deliverable

---

## Output
A fully scored audit written into the client profile — website, GBP, traditional SEO, AI search presence, and social — with SEO footprint data, target keyword table, key gaps, and a quick win identified. Ready for the Free Audit Generator to format into the client-facing deliverable.
