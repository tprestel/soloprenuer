# Gate 2 — Design Directions Summary
> Super Laundry Cincinnati · Generated 2026-03-27

---

## Three Directions Presented

| | Direction A | Direction B | Direction C |
|---|---|---|---|
| **Archetype** | The Neighborhood Anchor | The Green Press | Clear Signal |
| **Mood** | Warm & Local · Photography-Dominant | Warm & Local · Type-Dominant | Clean & Professional |
| **Display Font** | Playfair Display | DM Serif Display | Bricolage Grotesque |
| **Body Font** | Plus Jakarta Sans | Outfit | Plus Jakarta Sans |
| **Nav** | Dark green | Light / white | Light / white |
| **Hero** | Full-bleed photo + dark overlay | Split layout — type left, photo right | White with photo grid right |
| **Services Layout** | 3 vertical photo cards | 3 horizontal rows (photo + text) | 3 vertical photo cards |
| **Character** | Warm, grounded, organic | Editorial, considered, typographic | Structured, clear, modern |

---

## Direction A — "The Neighborhood Anchor" *(Recommended)*

**File:** `design-direction-a.html`

**The idea:** Super Laundry is a community institution — it's been in these neighborhoods for years, it hosts Laundry Love, and it's the place people actually trust. Direction A leans fully into that identity. Photography is the hero. The dark green header, the full-bleed hero with warm overlay, the Playfair Display serif headings — all of it says "we belong here." This is the direction that will feel most at home in Avondale, Westwood, and Bond Hill.

**Key design details:**
- Full-bleed hero photo with deep directional overlay gradient — warm, organic, cinematic
- Playfair Display at 68px creates presence without feeling cold
- Cream alternating section backgrounds create a warm visual rhythm
- Location cards are photo-forward — the neighborhoods are the product
- Why Choose cards use numbered watermarks (01–06) + green icon boxes — refined, not generic
- Testimonials sit on cream so white cards pop
- Laundry Love section: split layout, photo stack with accent — emphasizes community

**Why it fits Super Laundry:** The brand voice is "trustworthy neighborhood institution" — warm, approachable, rooted in community. Photography-dominant layouts communicate that rootedness better than type-dominant layouts. Serif headings add authority without feeling corporate. The dark green header anchors every page to the brand color immediately on load.

---

## Direction B — "The Green Press"

**File:** `design-direction-b.html`

**The idea:** What if Super Laundry felt more like an editorial brand — a local business that takes itself seriously, that has opinions, that reads like a publication? Direction B uses DM Serif Display and Outfit to create a more thoughtful, type-led aesthetic. Services are presented in numbered horizontal rows. The hero splits the page between editorial type and photography.

**When to consider B instead:** If the client wants to position Super Laundry as a premium or aspirational brand — building toward a more upscale clientele or franchise model — B creates that energy. The numbered service rows and asymmetric layouts communicate sophistication.

**Why it wasn't recommended for Gate 3:** The editorial tone, while beautiful, can read as slightly detached from the neighborhoods it serves. Super Laundry's core competitive advantage is warmth and community access — Direction A communicates that more directly.

---

## Direction C — "Clear Signal"

**File:** `design-direction-c.html`

**The idea:** Clean, systematic, professional. Bricolage Grotesque at heavy weight creates bold headlines without warmth or nostalgia. White backgrounds, tight grid, stat bar under the hero with 6 / 100+ / 1700+ / 24/7 in a four-column band. This direction would feel at home for a national chain or a SaaS product.

**When to consider C instead:** If Super Laundry eventually builds a franchise model or wants to position for acquisition, C sets up the visual identity for that. It communicates operational scale and process discipline.

**Why it wasn't recommended for Gate 3:** It undersells the human story. Super Laundry's 1,700+ reviews, Laundry Love partnerships, and neighborhood presence are its real differentiators — and those are communicated through warmth, not through a clean grid.

---

## Recommendation

**Direction A for Gate 3.**

The client indicated preference for A. It matches the brand voice documented in `context/client.md`, fits the neighborhoods served, and leverages the photography library that was built. Playfair Display + Plus Jakarta Sans is a proven pair for warm service businesses. The full-bleed hero with photography sets the right tone on load.

**Gate 3 starting point:** Use `design-direction-a.html` as the homepage template. Extract the design system (color variables, typography scale, card patterns, section structure) into shared CSS. Build the 17-page sitemap from this foundation.

---

## Assets Confirmed Available

| Asset | Path | Used In |
|---|---|---|
| Logo (webp) | `assets/logos/SuperLaundry_Logo.webp` | Nav, Footer |
| Hero photo | `assets/images/hero-web.jpg` | Hero section |
| Springdale | `assets/images/springdale-web.jpg` | Location card |
| Avondale | `assets/images/avondale-web.jpg` | Location card, Laundry Love |
| Bond Hill | `assets/images/bondhill3-web.jpg` | Location card |
| Westwood | `assets/images/westwood-ext.jpeg` | Location card, Laundry Love |
| North College Hill | `assets/images/north-college-ext.jpeg` | Location card |
| Allison St | `assets/images/allison-web.jpg` | Location card |
| Self-service | `assets/images/svc-self-service-web.jpg` | Service card |
| Drop-off | `assets/images/svc-dropoff-web.jpg` | Service card |
| Pickup & delivery | `assets/images/svc-pickup-web.jpg` | Service card |

**Gaps to flag before Gate 3:**
- North College Hill and Allison St addresses are unconfirmed — placeholder "Cincinnati, OH" used
- Phone numbers for non-Springdale locations: single shared number (513) 873-5939 used as placeholder
- Confirmed hex codes for brand green not provided — `#1C4A25` / `#2D7F3C` derived from logo
