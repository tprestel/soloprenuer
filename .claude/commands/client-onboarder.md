# Client Onboarder

## Purpose
Populate `context/client.md` from the intake form and any available call transcripts. This is the moment where the client's own voice enters the system — everything downstream (website copy, content, proposals) gets richer when this document is complete. Run after the proposal is signed.

## Inputs Required
- `clients/[business-slug]/context/profile.md` — business info, call notes, work log
- `clients/[business-slug]/context/research.md` — inferred brand, competitive context
- `clients/[business-slug]/context/client.md` — blank template to populate
- Intake form responses — pasted into the chat, or pulled from HubSpot if available
- Fireflies transcript — check for any recorded calls with this client (optional but valuable)

---

## Steps

### 1. Collect Available Inputs

Check what's available before writing anything:

**Intake form:** Ask the operator how responses are coming in:
- Pasted directly into the chat → use as-is
- In HubSpot → pull from HubSpot CRM using the contact/deal associated with this client
- Not yet received → flag this and stop. Do not populate client.md with guesses. The point of this document is the client's actual voice — fabricating it defeats the purpose.

**Fireflies transcript:** Search Fireflies for any calls associated with this client (search by business name or owner name). If a transcript exists:
- Pull key quotes — things they said unprompted that reveal positioning, frustration, goals, or personality
- Note anything that contradicts or enriches research.md
- Note any specific asks or concerns they raised

**Call notes in profile.md:** Check the Call Notes section — anything captured manually goes here too.

---

### 2. Define the Intake Form

If the operator hasn't yet built an intake form, the following questions are the standard set. Share these with the operator if needed:

**Business & Story**
1. Tell us about Adrenaline Fix Karting — how did it get started, and what drives you?
2. How do you describe what you do when someone asks at a race?
3. Who is your ideal customer — paint a picture of the person you love working with most.
4. What makes you different from other karting teams in the region? What do you offer that nobody else does?

**Goals**
5. What's the #1 thing you want to get out of this engagement?
6. What does success look like 6 months from now? What would make you say "this is working"?
7. Is there a specific keyword, market, or type of client you most want to reach?

**Brand**
8. How do you want your business to sound online? (Professional? Passionate? Technical? Accessible? All of the above?)
9. Are there phrases or a tone of voice you want to avoid?
10. Do you have brand guidelines, a logo file, or confirmed hex codes you can share?

**Access & Assets**
11. Do we have access to your Google Business Profile? If not, who manages it?
12. Do we have access to your website backend? (Wix login / HubSpot access)
13. Do you have any existing photography or video we can use?

**Other**
14. Anything else we should know going in — existing clients we should avoid mentioning, sensitivities, things that have been tried before that didn't work?

---

### 3. Populate client.md

Write to `clients/[business-slug]/context/client.md` section by section. Rules:

- **Use their words.** If they said "we're the team that shows up when everyone else is wrenching alone in the paddock" — write that verbatim. Don't paraphrase it into marketing language.
- **Do not infer or fill gaps with research.md.** If a section has no response, leave it blank with a `<!-- not yet collected -->` note. Downstream skills will use research.md as the fallback.
- **Flag contradictions.** If their answer contradicts something in research.md (e.g., they describe their customer differently than we inferred), add a `<!-- contradicts research.md — use this -->` note so downstream skills know which to trust.
- **Preserve raw responses.** Paste the raw intake form responses verbatim into the `## Intake Form Responses` section at the bottom — even after extracting the key points into the structured sections above.

**Brand Assets:**
- If confirmed hex codes are provided, update both client.md AND add a note to research.md Inferred Brand section marking the previous values as superseded.
- If a logo file is shared, note the path in client.md.
- If brand assets aren't yet confirmed, leave as "not yet received" — do not carry over inferred values as confirmed.

---

### 4. Surface Key Insights

After populating client.md, write a brief **Onboarding Summary** as a comment block at the top of the file (below the existing header):

```
<!-- ONBOARDING SUMMARY — [date]
Key quotes:
- "[verbatim quote that best captures their voice]"
- "[verbatim quote about their goals]"

Contradictions with research.md:
- [any conflicts found, or "none"]

Gaps still to collect:
- [anything missing from the intake form or unanswered]

Ready for: [list which downstream skills can now run — website-builder, gbp-optimizer, etc.]
-->
```

---

### 5. Update Profile and Work Log
- Append to work log in `context/profile.md`: `| [today's date] | Client Onboarder | client.md populated from intake form |`
- Update Lifecycle:
  - Stage: Onboard
  - Next Action: Run `website-builder` and/or `gbp-optimizer` to begin delivery

---

## Output
- `clients/[business-slug]/context/client.md` — fully populated with client's voice, confirmed brand assets, and onboarding summary
- `context/profile.md` — lifecycle updated to Onboard, work log appended
