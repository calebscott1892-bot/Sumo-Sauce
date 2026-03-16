# Live Vercel Audit

Date: 2026-03-15
Live URL: `https://sumo-sauce.vercel.app/`
Repo: `C:\Users\belac\OneDrive\Documents\GitHub\Sumo-Sauce`

## Routes Audited

Desktop:
- `/`
- `/search`
- `/rikishi`
- `/search?q=Oka`
- `/rikishi/3842`
- `/stables`
- `/stables/isegahama`
- `/basho`
- `/basho/202603`
- `/basho/202603/makuuchi`
- `/compare/3842/4227`
- `/rivalries`
- `/leaderboard`
- `/analytics`

Mobile-width:
- `/`
- `/rikishi/3842`
- `/basho/202603`

## Overall Read

The live site is not in a release-worthy state. The static profile layer is partly working, but the deployed frontend appears to be missing a working hosted API origin, so many flagship routes degrade into 404-backed failure states, empty analytics shells, or misleading “not found” messaging. The result is a product that looks half-alive: enough data appears to imply authority, then core pages collapse when you try to use them.

## 1. Broken / Misleading

### 1. Live Vercel appears disconnected from the real API

Severity: Critical

Evidence:
- `rikishi-hoshoryu-3842.json`
- `stable-isegahama.json`
- `basho-202603-overview.json`
- `leaderboard.json`

What is happening:
- The deployed app is making same-origin requests like `/api/v1/rikishi/...`, `/api/v1/basho/...`, and `/api/entities/...`
- Those requests are returning `404` from the Vercel deployment
- Static profile surfaces still render, which makes the failure feel inconsistent and confusing

Why this is bad:
- It breaks the product’s core promise
- It makes the site feel unreliable and unfinished
- It causes users to distrust the displayed dataset counts

### 2. Routeable rikishi pages are falsely presenting backend failure as missing wrestler data

Severity: Critical

Evidence:
- `rikishi-hoshoryu-3842.png`
- `mobile-rikishi-hoshoryu-3842.png`

What is happening:
- `/rikishi/3842` for Hoshoryu resolves to `NOT_FOUND Rikishi not found.`
- The same deployed site also claims hundreds of published profiles elsewhere

Why this is bad:
- This is not a clean “service unavailable” message
- It tells the user the wrestler does not exist when the system clearly knows he exists
- That is a direct trust failure

### 3. Stable pages and latest basho overview are effectively broken

Severity: Critical

Evidence:
- `stable-isegahama.png`
- `basho-202603-overview.png`
- `mobile-basho-202603-overview.png`

What is happening:
- `/stables/isegahama` shows `FETCH_ERROR Failed to load stable data`
- `/basho/202603` shows `FETCH_ERROR Failed to load data`

Why this is bad:
- These are marquee navigation targets
- Latest basho is supposed to feel alive; instead it looks dead on arrival

### 4. Analytics page looks unfinished rather than degraded gracefully

Severity: High

Evidence:
- `analytics.png`

What is happening:
- The page hero loads
- Most of the body remains blank/skeleton-like with no clear explanation

Why this is bad:
- It looks like a broken internal prototype
- Users do not know whether data is loading, missing, or permanently unavailable

### 5. Compare page and rivalry explorer feel inert because they do not recover well when backing data is unavailable

Severity: High

Evidence:
- `compare-3842-4227.png`
- `rivalries.png`

What is happening:
- Compare sits in a low-information loading/skeleton state
- Rivalries reports `0 rikishi sampled` and `0 pair lookups attempted`

Why this is bad:
- These are supposed to be high-signal exploratory surfaces
- In production they currently signal “empty experiment”

### 6. Leaderboard explicitly surfaces API failure in the UI

Severity: High

Evidence:
- `leaderboard.png`

What is happening:
- The page shows `Connection error API request failed (404/404)`

Why this is bad:
- Honest error copy is better than silence, but this is still a hard product failure on a top-level browse page

## 2. Ugly / Low-Trust / Inconsistent

### 7. Homepage still feels too long and text-heavy

Severity: High

Evidence:
- `homepage.png`
- `mobile-homepage.png`

What is happening:
- The hero is improved, but the page still stacks dense explanatory modules quickly
- There is still too much copy for the first-run experience

Why this is bad:
- It weakens the premium feel
- It makes the product feel more like a project document than a sharp front door

### 8. Failure-state hierarchy is visually harsh and inconsistent

Severity: Medium

Evidence:
- `rikishi-hoshoryu-3842.png`
- `stable-isegahama.png`
- `basho-202603-overview.png`

What is happening:
- Some pages use giant uppercase error codes
- Some show plain fetch errors
- Some show skeletons without explanation

Why this is bad:
- The system feels stitched together instead of cohesive
- The premium tone disappears the moment anything goes wrong

### 9. Basho browser and directory surfaces are visually cumbersome

Severity: Medium

Evidence:
- `basho-browser.png`
- `rikishi-directory.png`
- `stables-directory.png`

What is happening:
- Long archive grids and large card stacks dominate the page
- Pages feel operational and heavy rather than elegant

Why this is bad:
- Browse surfaces should feel confident and scannable
- Right now they feel laborious

## 3. Premium Improvements

### 10. Brand presentation is still not strong enough above the fold

Severity: Medium

Evidence:
- `homepage.png`
- `mobile-homepage.png`

What is happening:
- The homepage brand mark is present but does not dominate
- The first screen still feels more like a dense UI module than a signature product moment

Why this matters:
- The product needs a sharper, more memorable front door
- Right now the design language is competent but not decisive

### Additional premium opportunities

- The live product needs more deliberate visual fallback states, not raw loading skeletons and error codes
- Search and profile-only discovery are stronger than many other surfaces; that clarity should become the visual baseline
- The current data/trust messaging needs to stay honest but be shorter, calmer, and more confident

## 4. Mobile-Specific Issues

### Mobile issue A: homepage becomes a claustrophobic vertical stack

Evidence:
- `mobile-homepage.png`

Problems:
- Too much stacked copy
- Cards feel compressed
- The premium feel gets buried under density

### Mobile issue B: broken rikishi state is especially ugly on small screens

Evidence:
- `mobile-rikishi-hoshoryu-3842.png`

Problems:
- The big `NOT_FOUND` block consumes the experience
- It reads like a dead-end error page, not a graceful degraded product state

### Mobile issue C: latest basho failure is severe and visually weak

Evidence:
- `mobile-basho-202603-overview.png`

Problems:
- Important current-basho entry point collapses to a generic error block
- There is no elegant next-step guidance

## Strongest Working Surfaces

These are not perfect, but they are the healthiest parts of the live deployment:

- `search.png`
  - Search feels reasonably clear
  - Published profile counts are visible
- `profile-only-search-oka.png`
  - The profile-only label is clear and honest
  - This is one of the few places where the product currently feels truthful and usable

## Top Priorities

1. Fix the live frontend-to-backend connection so API-backed routes stop 404ing on Vercel
2. Replace misleading “not found” messaging on routeable wrestler pages with truthful degraded-state handling
3. Simplify the homepage further, especially mobile, so the front door feels premium instead of text-heavy

## Screenshot Index

- `homepage.png`
- `search.png`
- `rikishi-directory.png`
- `profile-only-search-oka.png`
- `rikishi-hoshoryu-3842.png`
- `stables-directory.png`
- `stable-isegahama.png`
- `basho-browser.png`
- `basho-202603-overview.png`
- `basho-202603-makuuchi.png`
- `compare-3842-4227.png`
- `rivalries.png`
- `leaderboard.png`
- `analytics.png`
- `mobile-homepage.png`
- `mobile-rikishi-hoshoryu-3842.png`
- `mobile-basho-202603-overview.png`

