# Chrome Extension Portfolio — Design Spec

**Date:** 2026-04-10
**Goal:** Build a portfolio of Chrome extensions for passive income. Revenue > effort. Freemium subscription model.
**Team:** Tyler + Claude (AI-assisted development)
**Tech stack:** Manifest V3, vanilla JS, ExtensionPay (Stripe), no backend for quick wins, AI API for flagship

---

## Portfolio Strategy

### Phase 1 — Quick Wins (Week 1-2)
Research the expired extension database (9,656+ expired extensions with 500+ users). Pick 1-2 targets that meet these criteria:

- Had 5K-50K users (enough demand, not so big competitors already replaced it)
- Simple functionality (rebuildable in a few days)
- Clear premium tier angle
- No dominant replacement already exists

Rebuild with fresh MV3 code, our own branding, clean UI. Optimize Chrome Web Store listing for the keywords the dead extension ranked for.

**Goal:** Learn the publishing workflow, start generating installs/reviews, get first revenue.

### Phase 2 — Flagship: Content Repurposer (Week 3-5)
Build "ReFormat" (working name) — a content repurposing extension.

**Core flow:**
1. User highlights text on any webpage
2. Clicks extension icon or right-click context menu
3. Picks target format: LinkedIn post, X thread, email newsletter, blog intro, Instagram caption
4. AI reformats with platform-appropriate tone, length, and structure
5. One-click copy to clipboard
6. Optional: save to content library for reuse

**Free tier:**
- 5 repurposes per day
- 3 output formats (LinkedIn, X, email)

**Premium ($7/month):**
- Unlimited repurposes
- All output formats (Instagram, blog, Facebook, custom templates)
- Tone controls (professional, casual, provocative, educational)
- Saved content library
- Custom format templates ("always end LinkedIn posts with a CTA")

**Technical architecture:**
- Manifest V3 with context menu + popup UI
- Content script grabs highlighted text from active page
- Calls AI API (Claude or OpenAI) for reformatting
- Our API key, usage metered per user, cost baked into subscription
- No backend — API calls direct from extension, auth via ExtensionPay license
- ~500 tokens per repurpose, ~$0.001-0.005 per use
- Heavy user (20/day) costs ~$3/month against $7/month subscription — healthy margin

**Target audience:** Content creators, marketers, solopreneurs, social media managers.

### Phase 3 — Optimize & Grow (Ongoing, minimal effort)
- Monitor reviews, respond to feedback
- Chrome Web Store SEO tweaks
- Add features only when user demand justifies it
- Passive mode

---

## Monetization Model (All Extensions)

- **Free tier** with daily/weekly usage limits
- **Premium** at $5-8/month via ExtensionPay (Stripe-powered, minimal setup)
- **Annual plan** at 10x monthly (~17% discount) to encourage commitment
- **Pricing psychology:** $4.99 and $6.99 outperform round numbers

---

## Distribution Strategy

- Chrome Web Store SEO (first 132 chars of description matter most, pick less crowded categories)
- Product Hunt launch (#1 of the Day = 5K-20K users)
- Reddit: r/chrome_extensions, r/SideProject, r/webdev, niche subreddits per extension
- Hacker News: "Show HN" format, Tue-Thu 9-11 AM EST
- Build in public on X/LinkedIn
- Blog posts targeting "[problem] chrome extension" keywords
- Target 1-2 star reviews of competitors in marketing copy

---

## Legal Guardrails

- All code written from scratch (no copying from expired extensions)
- Our own name, branding, and design for every extension
- Our own store listing copy and screenshots
- Check open-source licenses if referencing any existing code
- No scraping user data from dead extensions

---

## Complete Idea Backlog

All ideas from research, preserved for future development. Sorted into two lists.

### List A: Novel / Greenfield Ideas

| # | Idea | Description | Uniqueness | Earning Potential | Effort | Notes |
|---|------|-------------|-----------|-------------------|--------|-------|
| 1 | **AI Platform Organizer** | Manage prompts, conversations, and templates across ChatGPT, Claude, Gemini, Perplexity | High | $5-15K/mo | Medium | Easy Folders proved $3.7K/mo covering just 2 platforms |
| 2 | **Content Repurposer** (SELECTED) | Highlight text on any page, reformat for LinkedIn/X/email/newsletter | High | $5-15K/mo | Medium | No extension does this; SaaS tools charge $30-100/mo |
| 3 | **Privacy-First Local AI Writing Assistant** | 100% on-device writing assistant, no data leaves the browser | High | $5-20K/mo | High | Grammarly privacy backlash creates demand |
| 4 | **Honest Coupon/Deal Finder** | Transparent, creator-friendly, no affiliate sniping | Medium-High | $10-50K/mo | High | Honey removal left millions with no alternative |
| 5 | **Freelancer Finance Dashboard** | Auto-detect invoices, track payments, forecast income from browser activity | High | $3-8K/mo | Medium-High | No extension does this for freelancers |
| 6 | **ADHD/Focus Tool with AI** | Learns your distraction patterns, blocks contextually, adapts over time | High | $3-8K/mo | Medium-High | Current blockers are static lists — AI-powered is novel |
| 7 | **Workflow Documentation Generator** | Auto-generate SOPs from browser activity/screen recordings | High | $5-10K/mo | High | B2B angle, could charge $15-30/mo |
| 8 | **Local Business SEO Dashboard** | Audit GBP, track local competitors, generate review links — all in-browser | Medium | $3-10K/mo | Medium | Aligns with Tyler's agency expertise |

### List B: "Improve What Exists" Opportunities

| # | Idea | What's Broken | Our Edge | Earning Potential | Effort | Notes |
|---|------|--------------|----------|-------------------|--------|-------|
| 1 | **Marketplace Automation** (Whatnot, Vinted, Grailed, Depop) | Closet Tools proved $42K/mo on Poshmark; crosslisting tools are buggy/overpriced | Clean UX, reliable automation, $15-25/mo | $5-30K/mo | Medium | Pick ONE underserved platform |
| 2 | **Shopify Competitor Intelligence** | Commerce Inspector has 2/5 stars and costs $99/mo | Better data accuracy, half the price | $5-15K/mo | Medium | Shopify still growing 30% YoY |
| 3 | **YouTube AI Summarizer** | Eightify ($45K/mo) but competitors are bloated/privacy-invasive | Privacy-first, clean UX, lower price | $5-15K/mo | Low-Medium | Crowded but room for a clean entrant |
| 4 | **Gmail Organization** | Baxter does $1K/mo with mediocre execution | Better UX, smart labeling, bulk unsubscribe | $3-10K/mo | Low | Gmail's built-in tools are mediocre |
| 5 | **MV3 Expired Extension Replacements** (SELECTED) | 9,656+ expired extensions with proven demand, no supplier | Show up and it works | $1-10K/mo each | Low | Can do multiples quickly |
| 6 | **Dark Mode Extension** | Night Eye does $3.1K/mo | Better site compatibility, cleaner toggle | $2-5K/mo | Low | Straightforward build |
| 7 | **Tab/Session Manager** | Dozens exist, none dominant | Clean UX, workspace saving, cloud sync | $3-8K/mo | Medium | Crowded but no clear winner |
| 8 | **Screen Blur for Privacy** | Blurweb does $1.5K/mo with minimal features | More granular controls, meeting-mode presets | $1-5K/mo | Low | Remote work tailwind |
| 9 | **Browser Translation** (niche vocabulary) | Mate Translate does $18K/mo but is general-purpose | Industry-specific vocabulary (legal, medical, construction) | $3-10K/mo | Medium | Niche = less competition, higher price |
| 10 | **URL Shortener + Analytics** | T.LY does $2.6K/mo | Better analytics dashboard, team features | $2-5K/mo | Low | Simple utility play |

### Research Data Points (for reference)

**Revenue benchmarks from real extensions:**
- Closet Tools: $42K/mo (Poshmark automation, solo)
- GMass: $200K/mo (Gmail mass email, solo)
- Eightify: $45K/mo (YouTube AI summaries, 3 people)
- COLDINBOX: $35K/mo (LinkedIn bulk messaging, solo)
- Mate Translate: $18K/mo (browser translation, solo, $0 startup)
- GoFullPage: $10K/mo (full-page screenshots, solo, $1/mo premium)
- Sync2Sheets: $9K/mo (Notion-to-Sheets, solo, $0 startup)
- Easy Folders: $3.7K/mo (ChatGPT/Claude organizer, solo)
- Night Eye: $3.1K/mo (dark mode, freemium)
- BlackMagic: $3K/mo (Twitter CRM, $8/mo)
- Weather Extension: $2.5K/mo (weather display, solo)
- T.LY: $2.6K/mo (URL shortener, $50 startup)
- Blurweb: $1.5K/mo (screen blur, $5 startup)
- Bluedot: $1.5K/mo (Google Meet AI notes, 2 people)
- Baxter: $1K/mo (Gmail org, solo, non-technical founder)

**Market context:**
- 112K extensions on Chrome Web Store, 86% have under 1K users
- AI extension market: $3.8B (2024) → $21.6B projected by 2032
- MV3 killed 84K extensions, displacing 426M users
- 9,656+ expired extensions with 500+ users cataloged
- Profit margins: 70-85% (client-side execution, minimal infra)
- Pricing sweet spot: $5-8/mo subscription or $19-69 one-time
- 5,000 free users at 2% conversion at $7/mo = $700 MRR
- ExtensionPay handles payments with minimal code

**Distribution channels:**
- Chrome Web Store SEO (first 132 chars, less crowded categories)
- Product Hunt (#1 of Day = 5K-20K users)
- Reddit (r/chrome_extensions, r/SideProject, niche subs)
- Hacker News ("Show HN", Tue-Thu 9-11 AM EST)
- Content marketing targeting "[problem] chrome extension" keywords
- Build in public on X/LinkedIn

**Key sources:**
- ExtensionPay revenue articles
- Rick Blyth blog (built 20 extensions, $500K+ lifetime, 6-figure exit)
- Indie Hackers (Closet Tools, Easy Folders case studies)
- Chrome-Stats marketplace data
- Starter Story success stories
- Incogni privacy report (2026)
- DebugBear extension statistics
- BuildThatExtension expired database
