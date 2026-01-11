from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


ALLOWED_STATUS = {
    "Working in Base44",
    "Broken in Base44",
    "Never fully worked",
    "Unknown",
}


@dataclass(frozen=True)
class Requirement:
    feature_area: str
    requirement: str
    status: str
    verification: str


def _norm(text: str) -> str:
    return re.sub(r"\s+", " ", text).strip().lower()


def _ensure_period(text: str) -> str:
    text = re.sub(r"\s+", " ", text).strip()
    if not text.endswith("."):
        text += "."
    return text


def _verify(feature_area: str) -> str:
    return {
        "Leaderboard": "Open Leaderboard with sample data; verify filter/search/sort and details behavior.",
        "Data": "Run ingestion/import; validate schema, ordering, reproducibility, and sources used.",
        "Live": "During an active basho, verify live feed refresh interval and displayed matches/results/standings.",
        "Compare": "Compare 2–3 wrestlers; confirm side-by-side stats and best-value highlighting.",
        "Personalization": "Follow a wrestler; confirm feed, notifications, and dashboard widget toggles persist.",
        "History": "Verify history pages/charts show correct computed stats from stored matches/basho records.",
        "Tournament": "Verify tournaments listing/details/charts match a known basho dataset and link to forum discussions.",
        "Community": "Create topic/reply/rating; verify persistence, display, sharing, and achievements behavior.",
        "Moderation": "As moderator/admin, lock/pin/delete/ban/report; verify permissions and outcomes.",
        "Games": "Create/join league, submit predictions, run scoring; verify leaderboards, points, and dedupe rules.",
        "Navigation": "Use floating nav across pages; confirm usability and correct routing.",
        "Privacy": "Verify usernames replace emails publicly; validate email visibility controls and fallbacks.",
        "Security": "Attempt unauthorized reads/writes and admin-only operations; verify access control.",
        "Bugfix": "Reproduce the prior failure; verify no crash/500 and safe defaults are used.",
        "Performance": "Inspect network/write volume; verify caching, polling intervals, and diffing reduce calls and writes.",
        "UI": "Verify UI behavior matches requirement.",
    }.get(feature_area, "Verify behavior matches requirement.")


def add(reqs: list[Requirement], area: str, requirement: str, status: str) -> None:
    requirement = _ensure_period(requirement)
    if status not in ALLOWED_STATUS:
        raise ValueError(f"Invalid status: {status}")
    reqs.append(
        Requirement(
            feature_area=area,
            requirement=requirement,
            status=status,
            verification=_verify(area),
        )
    )


def extract_phrases(transcript: str) -> list[str]:
    # High-signal phrases used as coverage anchors.
    patterns = [
        r"\bAdded\b[^\n]{0,800}",
        r"\bCreated\b[^\n]{0,800}",
        r"\bImplemented\b[^\n]{0,800}",
        r"\bFixed\b[^\n]{0,800}",
        r"\bBuilt\b[^\n]{0,800}",
        r"\bTightened\b[^\n]{0,800}",
        r"\bAllow\b[^\n]{0,600}",
        r"\bImplement\b[^\n]{0,600}",
        r"\bInclude\b[^\n]{0,600}",
        r"\bIntroduce\b[^\n]{0,600}",
        r"\bEnable\b[^\n]{0,600}",
        r"\bDesign\b[^\n]{0,600}",
        r"\bBuild\b[^\n]{0,600}",
        r"AxiosError:[^\n]{0,200}",
        r"BASE44 MASTER PROMPT[^\n]{0,200}",
    ]
    rx = re.compile("|".join(patterns), flags=re.I)

    # Split by timestamp markers to reduce accidental spanning.
    segs = re.split(r"\b\d+\s+days\s+ago\b", transcript)
    items: list[str] = []
    for seg in segs:
        seg = seg.replace("Base44 AIBase44", " ").replace("Revert this", " ")
        for m in rx.finditer(seg):
            s = re.sub(r"\s+", " ", m.group(0)).strip()
            if not s:
                continue
            if s.startswith(("Wrote ", "Read ", "Edited ")):
                continue
            if s == "Created":
                continue
            items.append(s)

    # exact de-dupe
    seen: set[str] = set()
    out: list[str] = []
    for x in items:
        k = x.lower()
        if k in seen:
            continue
        seen.add(k)
        out.append(x)
    return out


def build_requirements(transcript: str) -> tuple[list[Requirement], list[str], list[str], list[str]]:
    reqs: list[Requirement] = []

    contradictions: list[str] = []
    base44_only: list[str] = []
    excluded_noise: list[str] = []

    # Noise exclusions (explicitly called out in report)
    excluded_noise = [
        "timestamps (e.g., '23 days ago')",
        "speaker labels (e.g., 'Base44 AIBase44')",
        "'Revert this' markers",
        "tooling/file operation logs (Wrote/Read/Edited)",
        "terminal command output and wc/grep noise",
        "raw JSON dumps of wrestler arrays",
    ]

    phrases = extract_phrases(transcript)

    # --- Anchor: product scope (leaderboard)
    add(reqs, "Leaderboard", "The app shall display a leaderboard of Japanese professional sumo rankings", "Working in Base44")
    add(reqs, "UI", "The UI shall be presentable and interactive for the leaderboard experience", "Working in Base44")

    # Extract the leaderboard feature list if present.
    m = re.search(
        r"Created a beautiful, interactive sumo wrestling leaderboard with:(.*?)(?:You can now import|how best to import|\b\d+\s+days\s+ago\b)",
        transcript,
        flags=re.I | re.S,
    )
    lb = re.sub(r"\s+", " ", m.group(1)).strip() if m else ""
    if lb:
        # Hard-split on known phrases to avoid run-on requirements.
        add(reqs, "Data", "The system shall store wrestler records with fields for rank, side, wins, losses, stable, physical stats, and career achievements", "Working in Base44")
        add(reqs, "Leaderboard", "The leaderboard shall support filtering by rank divisions (e.g., Yokozuna, Ozeki, Sekiwake, Komusubi, Maegashira, Juryo)", "Working in Base44")
        add(reqs, "Leaderboard", "Division filter labels shall include Japanese kanji", "Working in Base44")
        add(reqs, "Leaderboard", "The leaderboard shall provide search by wrestler name (shikona)", "Working in Base44")
        add(reqs, "Leaderboard", "The leaderboard shall provide search by wrestler stable (heya)", "Working in Base44")
        add(reqs, "Leaderboard", "Leaderboard entries shall be displayed as rank cards with color-coding by rank/division", "Working in Base44")
        add(reqs, "Leaderboard", "Top ranks shall use distinctive icons (at minimum: crown for Yokozuna and star for Ozeki)", "Working in Base44")
        add(reqs, "Leaderboard", "The leaderboard shall show current tournament performance via a visual win/loss indicator (e.g., progress bars)", "Working in Base44")
        add(reqs, "Leaderboard", "The UI shall provide a wrestler detail view/modal that shows stats, achievements, and career record", "Working in Base44")
        add(reqs, "UI", "The UI shall be responsive and usable on mobile and desktop", "Working in Base44")

    # --- Data import guidance and master prompt
    add(reqs, "Data", "The system shall support importing wrestler data from a JSON array matching the Wrestler schema", "Working in Base44")
    add(reqs, "Data", "The system shall support importing wrestler data from CSV by parsing into schema-conformant JSON objects", "Unknown")
    add(reqs, "Data", "When a data point is missing, ingestion shall omit the key rather than storing null/\"N/A\"/empty strings for numeric or boolean fields", "Working in Base44")

    if "BASE44 MASTER PROMPT" in transcript:
        add(reqs, "Data", "The data pipeline shall programmatically gather, normalize, validate, and export live sumo wrestler data from authoritative public sources", "Unknown")
        add(reqs, "Data", "The data pipeline output shall be deterministic and reproducible given identical source content", "Unknown")
        add(reqs, "Data", "The pipeline output dataset shall contain the top 200 active professional sumo wrestlers ordered strictly by current official rank", "Unknown")
        add(reqs, "Data", "The pipeline output shall be schema-clean and shall not contain nulls, placeholders, or fabricated values", "Unknown")
        add(reqs, "Data", "The pipeline shall prioritize SumoDB/Sumo Reference as the primary source for banzuke and wrestler profiles", "Unknown")
        add(reqs, "Data", "The pipeline shall validate rankings against the Japan Sumo Association (JSA) website", "Unknown")
        add(reqs, "Data", "The pipeline shall fetch wrestler images via Wikipedia/Wikimedia using the MediaWiki API and stable image URLs", "Unknown")

    # --- Data import system / sync
    if any("Created a comprehensive data import system" in p for p in phrases):
        add(reqs, "Data", "The app shall provide a Data Import page that can auto-collect and import a dataset of up to 200 wrestlers from live sources", "Working in Base44")
        add(reqs, "Data", "The ingestion system shall collect wrestler profiles from SumoDB, JSA, and Wikipedia", "Working in Base44")

    if any("Built a self-sufficient live data sync system" in p for p in phrases):
        add(reqs, "Data", "The system shall automatically sync wrestler data from external sources on an hourly schedule", "Working in Base44")
        add(reqs, "Performance", "The sync system shall implement caching to reduce repeated external fetches", "Working in Base44")
        add(reqs, "Performance", "The sync system shall implement diffing so that only changed wrestler records are updated", "Working in Base44")
        add(reqs, "Data", "The UI shall provide an auto-sync toggle to enable or disable periodic sync", "Working in Base44")
        add(reqs, "Data", "The UI shall provide a manual refresh action to run sync on demand", "Working in Base44")
        add(reqs, "Data", "The UI shall show real-time sync status for the latest sync run", "Working in Base44")

    # --- Compare
    if any("Added head-to-head comparison" in p for p in phrases):
        add(reqs, "Compare", "The UI shall allow users to select 2–3 wrestlers for head-to-head comparison", "Working in Base44")
        add(reqs, "Compare", "The comparison view shall render selected wrestlers side-by-side with aligned stat rows", "Working in Base44")
        add(reqs, "Compare", "For each stat category, the best value among compared wrestlers shall be highlighted", "Working in Base44")

    # --- Live tournament feed
    if any("Added live tournament feed" in p for p in phrases):
        add(reqs, "Live", "When a basho is active, the app shall display a live tournament feed", "Working in Base44")
        add(reqs, "Live", "The live tournament feed shall refresh automatically using polling at a 2-minute interval", "Working in Base44")
        add(reqs, "Live", "The live tournament feed shall display ongoing matches", "Working in Base44")
        add(reqs, "Live", "The live tournament feed shall display today's results", "Working in Base44")
        add(reqs, "Live", "The live tournament feed shall display upcoming bouts", "Working in Base44")
        add(reqs, "Live", "The live tournament feed shall display current standings", "Working in Base44")

    # --- Personalization
    if any("Added complete personalization system" in p for p in phrases):
        add(reqs, "Personalization", "Users shall be able to follow and unfollow wrestlers from the UI (e.g., a star icon)", "Working in Base44")
        add(reqs, "Personalization", "The app shall provide a personalized feed showing matches for followed wrestlers", "Working in Base44")
        add(reqs, "Personalization", "The app shall send real-time notifications when a followed wrestler enters an active bout", "Working in Base44")
        add(reqs, "Personalization", "Users shall be able to customize their dashboard by enabling/disabling widgets", "Working in Base44")
        add(reqs, "Personalization", "Dashboard settings shall include widget toggles for at least: live feed, standings, and results", "Working in Base44")

    # --- History
    if any("Added comprehensive historical data" in p for p in phrases):
        add(reqs, "History", "Each wrestler shall display career performance stats", "Working in Base44")
        add(reqs, "History", "Each wrestler shall display past tournament victories", "Working in Base44")
        add(reqs, "History", "Each wrestler shall display kimarite usage frequency", "Working in Base44")
        add(reqs, "History", "The app shall provide rank progression charts over time for wrestlers", "Working in Base44")
        add(reqs, "History", "The app shall provide a Sumo History page and a dedicated navigation entry", "Working in Base44")
        add(reqs, "History", "Wrestler cards shall include tabs/sections for historical data", "Working in Base44")

    if any("Added interactive performance trend charts" in p for p in phrases):
        add(reqs, "History", "The app shall provide interactive performance trend charts across multiple basho (e.g., win rate and W/L record)", "Working in Base44")
        add(reqs, "History", "The app shall display wrestler rivalries including head-to-head records and key matches", "Working in Base44")
        add(reqs, "History", "The app shall provide a Sumo Legends feature comparing historical wrestlers by championships, dominance, and career stats", "Working in Base44")

    if any("Added Match History tab" in p for p in phrases):
        add(reqs, "History", "The app shall provide a Match History tab showing past matches with opponent, outcome, basho, and winning technique", "Working in Base44")
        add(reqs, "History", "Match history shall be filterable by basho and outcome", "Working in Base44")

    # --- Tournaments
    if any("Created Tournaments page" in p for p in phrases):
        add(reqs, "Tournament", "The app shall provide a Tournaments section listing past and upcoming basho", "Working in Base44")
        add(reqs, "Tournament", "Tournament details shall display winners, upsets, and special prizes", "Working in Base44")
        add(reqs, "Tournament", "Tournament details shall include interactive charts tracking win progression throughout the basho", "Working in Base44")

    if any("Created Tournament Hub" in p for p in phrases):
        add(reqs, "Tournament", "The Tournament Hub shall aggregate schedules, results, and standout performances", "Working in Base44")
        add(reqs, "Community", "Tournament pages shall link to relevant forum discussions", "Working in Base44")
        add(reqs, "Tournament", "Tournament pages shall include trend visualizations including championship leaders, attendance, and win rate distribution", "Working in Base44")

    if any("Added daily results breakdown" in p for p in phrases):
        add(reqs, "Tournament", "Tournament Hub and Tournaments pages shall include daily results breakdown", "Working in Base44")
        add(reqs, "Tournament", "Tournament Hub and Tournaments pages shall include a win/loss distribution chart", "Working in Base44")
        add(reqs, "Tournament", "Tournament Hub and Tournaments pages shall include a match outcome heatmap", "Working in Base44")
        add(reqs, "Tournament", "Wrestler names in tournament views shall be clickable and navigate to wrestler profiles", "Working in Base44")

    # --- Leaderboard advanced filters/sort
    if any("Added advanced search and filtering" in p for p in phrases):
        add(reqs, "Leaderboard", "Leaderboard shall allow filtering by active status", "Working in Base44")
        add(reqs, "Leaderboard", "Leaderboard shall allow filtering by country of origin", "Working in Base44")
        add(reqs, "Leaderboard", "Leaderboard shall allow filtering by win rate", "Working in Base44")
        add(reqs, "Leaderboard", "Leaderboard shall allow filtering by tournament performance metrics", "Working in Base44")
        add(reqs, "Leaderboard", "Leaderboard shall support sorting by name", "Working in Base44")
        add(reqs, "Leaderboard", "Leaderboard shall support sorting by wins", "Working in Base44")
        add(reqs, "Leaderboard", "Leaderboard shall support sorting by win rate", "Working in Base44")
        add(reqs, "Leaderboard", "Leaderboard shall support sorting by career wins", "Working in Base44")
        add(reqs, "Leaderboard", "Leaderboard shall support sorting by tournament titles", "Working in Base44")

    # --- Moderation
    if any("Added forum moderation" in p for p in phrases):
        add(reqs, "Moderation", "Administrators shall be able to delete forum posts/topics", "Working in Base44")
        add(reqs, "Moderation", "Administrators shall be able to pin and lock topics", "Working in Base44")
        add(reqs, "Moderation", "Administrators shall be able to ban users", "Working in Base44")
        add(reqs, "Moderation", "Users shall be able to report content for moderator review", "Working in Base44")

    # --- Community: forum/topics/replies, ratings, and shareable comparison reports
    if re.search(r"forum with discussion topics and replies", transcript, flags=re.I):
        add(reqs, "Community", "The app shall provide a forum section with a list of discussion topics", "Working in Base44")
        add(reqs, "Community", "Users shall be able to create forum topics with a title and body", "Working in Base44")
        add(reqs, "Community", "Users shall be able to view a forum topic detail page that renders the topic and its replies", "Working in Base44")
        add(reqs, "Community", "Users shall be able to post replies to forum topics", "Working in Base44")

    if re.search(r"5-star\s+wrestler\s+rating\s+system", transcript, flags=re.I):
        add(reqs, "Community", "Users shall be able to rate wrestlers on a 5-star scale", "Working in Base44")
        add(reqs, "Community", "Wrestler ratings shall support detailed category ratings", "Working in Base44")
        add(reqs, "Community", "The app shall display an aggregate rating summary for each wrestler", "Working in Base44")

    if re.search(r"shareable\s+comparison\s+reports", transcript, flags=re.I):
        add(reqs, "Compare", "Users shall be able to save a selected comparison of 2–3 wrestlers as a comparison report", "Working in Base44")
        add(reqs, "Compare", "Saved comparison reports shall support public/private visibility controls", "Working in Base44")
        add(reqs, "Compare", "Public comparison reports shall be accessible via a shareable link", "Working in Base44")
        if re.search(r"social\s+features", transcript, flags=re.I):
            add(reqs, "Compare", "Public comparison reports shall include the transcript-described 'social features' (details not specified in transcript)", "Unknown")

    # --- Achievements
    if any("Added achievement system" in p for p in phrases):
        add(reqs, "Community", "User profiles shall include a section listing earned achievements", "Working in Base44")
        add(reqs, "Community", "Achievements shall include badges for forum participation and community contributions", "Working in Base44")
        add(reqs, "Community", "Achievements shall be displayed with rarity tiers", "Working in Base44")
        add(reqs, "Community", "The app shall show real-time achievement notifications", "Working in Base44")

    # --- Games
    if any("Tournament Prediction Game implemented" in p for p in phrases):
        add(reqs, "Games", "The app shall provide a tournament prediction game", "Working in Base44")
        add(reqs, "Games", "Users shall be able to create prediction leagues", "Working in Base44")
        add(reqs, "Games", "Users shall be able to join leagues via a join code", "Working in Base44")
        add(reqs, "Games", "The prediction game shall include a leaderboard ranking users by prediction accuracy", "Working in Base44")
        add(reqs, "Games", "The prediction game shall award points based on prediction accuracy", "Working in Base44")

    if any("Tightened up the prediction system" in p for p in phrases):
        add(reqs, "Games", "Prediction scoring operations shall be atomic", "Working in Base44")
        add(reqs, "Games", "The system shall prevent duplicate predictions where disallowed by league rules", "Working in Base44")
        add(reqs, "Games", "The system shall provide admin scoring controls", "Working in Base44")
        add(reqs, "Games", "Predictions shall be scoped per league when leagues are used", "Working in Base44")

    if any("Allow users to select two wrestlers" in p for p in phrases) or any("Match Predictor" in p for p in phrases):
        add(reqs, "Games", "The app shall provide a match predictor for a selected matchup", "Working in Base44")
        add(reqs, "Games", "Match prediction shall be probability-based and derived from historical data, current rankings, and recent performance", "Working in Base44")
        add(reqs, "Games", "The app shall track user predictions and display accuracy over time", "Working in Base44")

    # --- Live match system (30s polling)
    if any("Real-time live match system implemented" in p for p in phrases):
        add(reqs, "Live", "The app shall provide real-time live bout tracking during an active basho", "Working in Base44")
        add(reqs, "Live", "Live match updates shall use polling at a 30-second interval", "Working in Base44")
        add(reqs, "Games", "The system shall automatically resolve predictions when live match results are available", "Working in Base44")
        add(reqs, "Personalization", "Users shall receive notifications for relevant live bouts involving followed wrestlers", "Working in Base44")

    # --- Notification center (explicit line exists)
    if any("Implemented a comprehensive notification system" in p for p in phrases):
        add(reqs, "Personalization", "The app shall provide a notification center accessible via a bell icon", "Working in Base44")
        add(reqs, "Personalization", "The notification center shall show an unread badge/count", "Working in Base44")
        add(reqs, "Personalization", "Notifications shall auto-refresh every 30 seconds", "Working in Base44")
        add(reqs, "Personalization", "Notifications shall be generated for tournament updates", "Working in Base44")
        add(reqs, "Personalization", "Notifications shall be generated for league invitations", "Working in Base44")
        add(reqs, "Personalization", "Notifications shall be generated when predictions are closing", "Working in Base44")
        add(reqs, "Personalization", "Notifications shall be generated for match results", "Working in Base44")
        add(reqs, "Personalization", "Notifications shall be generated for forum replies", "Working in Base44")
        add(reqs, "Personalization", "Notifications shall be generated for achievements", "Working in Base44")

    # --- Navigation
    if any("floating navigation" in p.lower() for p in phrases):
        add(reqs, "Navigation", "The app shall provide a floating navigation bubble that expands to show all pages when clicked", "Working in Base44")

    # --- UI readability
    if any("dropdown" in p.lower() or "Select" in p for p in phrases):
        add(reqs, "UI", "Select/dropdown controls shall be readable on dark backgrounds (e.g., white text on dark)", "Working in Base44")

    # --- Import safety / chunked imports
    if re.search(r"phased,\s*chunked\s+JSON\s+import\s+strategy", transcript, flags=re.I):
        add(reqs, "Data", "The import process shall support phased, chunked JSON imports rather than requiring a single large paste", "Unknown")

    if re.search(r"Remember last selected entity", transcript, flags=re.I):
        add(reqs, "Data", "The import UI shall remember the last selected entity type across reloads", "Working in Base44")

    if re.search(r"dry-run\s*/\s*validate\s+only\s+mode", transcript, flags=re.I):
        add(reqs, "Data", "The import system shall provide a validate-only (dry-run) mode that checks required fields, duplicate IDs, and broken foreign keys without importing", "Working in Base44")

    if re.search(r"Import system is now foolproof", transcript, flags=re.I):
        add(reqs, "Data", "The import system shall enforce strict validation for required fields when importing", "Working in Base44")
        add(reqs, "Data", "The import system shall enforce uniqueness/duplicate detection for imported records", "Working in Base44")
        add(reqs, "Data", "The import system shall validate foreign-key relationships between imported entities", "Working in Base44")

    # --- Reliability: defensive handling explicitly mentioned in transcript
    if re.search(r"deep merging for user preferences", transcript, flags=re.I):
        add(reqs, "Bugfix", "User preference updates shall deep-merge defaults to prevent missing widget/notification structures", "Unknown")

    if re.search(r"safe defaults on API failures", transcript, flags=re.I):
        add(reqs, "Bugfix", "Live tournament fetches shall return safe defaults on API failures instead of throwing", "Unknown")

    if re.search(r"Added defensive checks for array operations", transcript, flags=re.I):
        add(reqs, "Bugfix", "Array operations in UI logic shall be guarded against undefined/null inputs", "Unknown")

    if re.search(r"added a null check for followedWrestlers", transcript, flags=re.I):
        add(reqs, "Bugfix", "Follow/favorites logic shall handle missing followed-wrestlers state without crashing", "Unknown")

    if re.search(r"added null check for prediction\.factors", transcript, flags=re.I):
        add(reqs, "Bugfix", "Prediction display logic shall handle missing prediction factors without crashing", "Unknown")

    # --- Ranking correctness and explanation
    if any("Fixed ranking accuracy" in p for p in phrases):
        add(reqs, "Leaderboard", "Default ranking order shall use current tournament standings (wins-losses) when available rather than static banzuke rank", "Working in Base44")
        add(reqs, "Leaderboard", "The UI shall explain how leaderboard sorting is determined when using tournament standings", "Working in Base44")

    # --- Wrestler photos
    if any("Added official profile photos" in p for p in phrases):
        add(reqs, "Data", "The app shall display profile photos for wrestlers and use official JSA photos when available", "Working in Base44")

    # --- Privacy / username
    if any("username system" in p.lower() for p in phrases):
        add(reqs, "Privacy", "Users shall be able to set a custom public username", "Working in Base44")
        add(reqs, "Privacy", "Users shall be able to write a public bio", "Working in Base44")
        add(reqs, "Privacy", "Users shall be able to control whether their email is publicly visible", "Working in Base44")
        add(reqs, "Privacy", "Forum posts shall display usernames rather than emails", "Working in Base44")
        add(reqs, "Privacy", "Leaderboards shall display usernames rather than emails", "Working in Base44")

    # --- Reliability: repeated 500 errors, .filter vs .list, limits
    if any("AxiosError" in p for p in phrases):
        add(reqs, "Bugfix", "The app shall not return HTTP 500 for core read operations under normal usage", "Never fully worked")
        add(reqs, "Bugfix", "Pages shall fail gracefully with an error screen/early return instead of breaking the entire page on API errors", "Never fully worked")
        add(reqs, "Bugfix", "Entity queries shall not rely on server-side filter operations that conflict with platform security rules; non-admin users shall not crash when querying their own data", "Never fully worked")
        add(reqs, "Bugfix", "All entity list queries shall include any required pagination/limit parameters so they do not fail at runtime", "Never fully worked")
        add(reqs, "Bugfix", "The app shall not crash or white-screen due to missing helper/utility modules", "Never fully worked")

    # Contradictions detection
    if any("2-minute polling" in p for p in phrases) and any("30-second polling" in p for p in phrases):
        contradictions.append("Transcript contains both 2-minute polling (live tournament feed) and 30-second polling (real-time live match system and notification auto-refresh); interval policy needs consolidation.")

    if any("username" in p.lower() and "emails" in p.lower() for p in phrases) and any("emails as fallback" in p.lower() for p in phrases):
        contradictions.append("Transcript aims to display usernames instead of emails, but also references showing emails as fallback for some users; privacy/default behavior needs clarification in the owned implementation.")

    if any("all 500 errors" in p.lower() and "resolved" in p.lower() for p in phrases) and any("AxiosError" in p for p in phrases):
        contradictions.append("Transcript repeatedly claims 500 errors are resolved, yet errors recur; indicates instability rather than a single confirmed fix.")

    # Base44-only mechanisms
    base44_only = [
        "Base44 SDK entity operations (e.g., base44.entities.* bulkCreate/update/list/filter)",
        "Base44-hosted backend functions/integrations (e.g., Core.ExtractDataFromUploadedFile; 'enable backend functions')",
        "Base44 platform security rules that behave differently for filter() vs list()",
        "Base44-specific function file conventions and auto-generated modules",
    ]

    # De-dupe requirements (exact)
    dedup: dict[tuple[str, str, str], Requirement] = {}
    for r in reqs:
        key = (r.feature_area, _norm(r.requirement), r.status)
        if key in dedup:
            continue
        dedup[key] = r
    reqs = list(dedup.values())

    # Sort for readability: stable ordering by feature area then requirement
    area_order = {
        "Leaderboard": 1,
        "Data": 2,
        "Live": 3,
        "Compare": 4,
        "Personalization": 5,
        "History": 6,
        "Tournament": 7,
        "Community": 8,
        "Moderation": 9,
        "Games": 10,
        "Navigation": 11,
        "Privacy": 12,
        "Security": 13,
        "Performance": 14,
        "Bugfix": 15,
        "UI": 16,
    }
    reqs.sort(key=lambda r: (area_order.get(r.feature_area, 999), _norm(r.requirement)))

    return reqs, contradictions, base44_only, excluded_noise


def render_table(reqs: list[Requirement]) -> str:
    lines: list[str] = []
    lines.append("Source: BASE44_TRANSCRIPT.md (verbatim).")
    lines.append("")
    lines.append(
        "This table re-expresses transcript intent as atomic, testable requirements. Tooling logs/timestamps/speaker labels were excluded."
    )
    lines.append("")
    lines.append("Status enum: `Working in Base44` / `Broken in Base44` / `Never fully worked` / `Unknown`.")
    lines.append("")
    lines.append("| ID | Feature Area | Requirement | Status | Files | Verification |")
    lines.append("|---|---|---|---|---|---|")

    for i, r in enumerate(reqs, start=1):
        rid = f"PSA-{i:03d}"
        req = r.requirement.replace("|", "\\|")
        ver = r.verification.replace("|", "\\|")
        lines.append(f"| {rid} | {r.feature_area} | {req} | {r.status} |  | {ver} |")

    return "\n".join(lines) + "\n"


def replace_prompt_set_a(migration_spec_path: Path, new_body: str) -> None:
    ms = migration_spec_path.read_text(encoding="utf-8", errors="replace")

    header = "## Prompt Set A — Base44 Transcript"
    start = ms.find(header)
    if start == -1:
        raise RuntimeError(f"Header not found: {header}")

    after_header = ms.find("\n", start)
    if after_header == -1:
        raise RuntimeError("Unexpected EOF after header")

    # Find next top-level section header after Prompt Set A
    m = re.search(r"^## ", ms[after_header + 1 :], flags=re.M)
    end = after_header + 1 + m.start() if m else len(ms)

    updated = ms[: after_header + 1] + "\n" + new_body + "\n" + ms[end:]
    migration_spec_path.write_text(updated, encoding="utf-8")


def append_if_missing(path: Path, heading: str, content: str) -> None:
    cur = path.read_text(encoding="utf-8", errors="replace")
    if heading in cur:
        return
    if not cur.endswith("\n"):
        cur += "\n"
    cur += "\n" + heading + "\n\n" + content.rstrip() + "\n"
    path.write_text(cur, encoding="utf-8")


def main() -> None:
    root = Path(__file__).resolve().parents[1]

    transcript = (root / "BASE44_TRANSCRIPT.md").read_text(encoding="utf-8", errors="replace")
    reqs, contradictions, base44_only, excluded_noise = build_requirements(transcript)

    table = render_table(reqs)

    # 1) MIGRATION_SPEC.md Prompt Set A section
    replace_prompt_set_a(root / "MIGRATION_SPEC.md", table)

    # 2) DATA_MODEL.md append-only additions
    append_if_missing(
        root / "DATA_MODEL.md",
        "## Transcript Additions (Prompt Set A)",
        "- User profile fields implied by transcript: `bio` (text), `email_visibility` (text or bool), and display-name handling for public surfaces (forum/leaderboards).\n"
        "- Achievement awarding is implied beyond the `Achievement` catalog: add a `UserAchievement` join table with `user_id`, `achievement_id`, `earned_at`, and optional `rarity_tier_at_award`.\n"
        "- Notification system implies richer fields: `link_path`/`action_url`, `source_type`/`source_id`, and consistent unread state (`read_at` already exists).\n"
        "- Wrestler rating system mentions category ratings: add `category_scores` (jsonb) or a normalized `RatingCategory` child table.\n"
        "- Live bout tracking implies a `LiveBout`/`LiveMatchEvent` model (or additional fields on `Match`) to represent in-progress state, polling snapshots, and resolution timestamps.",
    )

    # 3) ENVIRONMENT.md append-only additions
    append_if_missing(
        root / "ENVIRONMENT.md",
        "## Additional implied variables (from transcript)",
        "Optional LLM/scraping (implied by \"AI-powered web scraping\"):\n\n"
        "| Variable | Required | Used by | Purpose |\n"
        "|---|---:|---|---|\n"
        "| `LLM_PROVIDER` | No | Ingest worker | LLM provider selector (if using LLM-assisted parsing). |\n"
        "| `LLM_API_KEY` | Maybe | Ingest worker | API key for the selected LLM provider. |\n"
        "| `LLM_MODEL` | No | Ingest worker | Model name for extraction/enrichment. |\n\n"
        "Polling/refresh intervals (explicit in transcript):\n\n"
        "| Variable | Required | Used by | Purpose |\n"
        "|---|---:|---|---|\n"
        "| `LIVE_MATCH_POLL_INTERVAL_SECONDS` | No | Ingest worker/API | Real-time live bout polling interval (transcript mentions 30s). |\n"
        "| `NOTIFICATIONS_POLL_INTERVAL_SECONDS` | No | API/client | Notification center refresh interval (transcript mentions 30s). |\n\n"
        "Prediction automation (implied by \"automatic prediction resolution\"):\n\n"
        "| Variable | Required | Used by | Purpose |\n"
        "|---|---:|---|---|\n"
        "| `PREDICTION_AUTO_RESOLVE_ENABLED` | No | Worker | Enable automatic prediction resolution from live results. |\n"
        "| `PREDICTION_AUTO_RESOLVE_INTERVAL_SECONDS` | No | Worker | How often to attempt resolution. |\n\n"
        "Query safety (implied by repeated Base44 query failures):\n\n"
        "| Variable | Required | Used by | Purpose |\n"
        "|---|---:|---|---|\n"
        "| `DEFAULT_LIST_LIMIT` | No | API/worker | Default limit for list queries to avoid runtime failures. |",
    )

    # Print report for the agent to surface
    print(f"PSA_REQUIREMENTS_TOTAL {len(reqs)}")
    if contradictions:
        print("CONTRADICTIONS")
        for c in contradictions:
            print(f"- {c}")
    print("BASE44_ONLY")
    for b in base44_only:
        print(f"- {b}")
    print("EXCLUDED_NOISE")
    for n in excluded_noise:
        print(f"- {n}")


if __name__ == "__main__":
    main()
