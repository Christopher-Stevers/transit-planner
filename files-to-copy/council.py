"""AI Transit Council — multi-agent, 6-round station-level debate.

Agents:
  Alex Chen       — Ridership & Equity Planner
  Jordan Park     — Infrastructure Cost Analyst
  Margaret T.     — NIMBY Neighbourhood Rep
  Devon Walsh     — PR Director
  Alex & Jordan   — Joint Rebuttal
  Commission      — Final Decision

Each planner turn emits a route_update so the map updates live.
"""

from __future__ import annotations

import asyncio
import json
import re
from typing import AsyncIterator

from .backboard import create_assistant, create_thread, stream_message
from .data_tools import build_data_brief

# ── Models ─────────────────────────────────────────────────────────────────────
# Use Haiku for critique-only agents; Sonnet for agents that generate coordinates

_HAIKU = "claude-haiku-4-5-20251001"
_SONNET = "claude-sonnet-4-5-20251101"

# ── Route JSON instruction (appended to planner prompts) ───────────────────────

# Per-agent quote instructions with distinct voices
_QUOTE_ALEX = 'End with a ```quote block — one punchy sentence (max 12 words) from Alex\'s equity/ridership POV:\n```quote\n...\n```'
_QUOTE_JORDAN = 'End with a ```quote block — one blunt sentence (max 12 words) from Jordan\'s cost/ROI POV:\n```quote\n...\n```'
_QUOTE_MARGARET = 'End with a ```quote block — one EMOTIONAL fearful sentence (max 12 words) from a worried resident\'s POV:\n```quote\n...\n```'
_QUOTE_DEVON = 'End with a ```quote block — one dry PR-speak sentence (max 12 words) about optics/headlines:\n```quote\n...\n```'
_QUOTE_REBUTTAL = 'End with a ```quote block — one decisive joint-position sentence (max 12 words):\n```quote\n...\n```'
_QUOTE_COMMISSION = 'End with a ```quote block — one authoritative ruling sentence (max 12 words):\n```quote\n...\n```'

_ROUTE_BLOCK = """
End your message with a ```route block containing valid JSON:

```route
{
  "name": "Route Name",
  "type": "subway"|"streetcar"|"bus",
  "color": "#hexcolor",
  "stops": [{"name": "Intersection or Landmark", "coords": [-79.XXXX, 43.XXXX]}]
}
```

MANDATORY GEOMETRY RULES — violating any rule makes the route invalid:

1. MODE: This is a subway-only planning exercise. All routes MUST use type "subway". No streetcar, no bus.

2. ONE DIRECTION ONLY: Pick start and end termini on opposite ends of the city. Travel in a single corridor. NO loops, NO U-turns, NO doubling back.

3. PRIMARY AXIS — CRITICAL: Decide if your route runs primarily EAST-WEST or NORTH-SOUTH before placing any stops.
   - East-West route: every stop's longitude must be STRICTLY GREATER (going east) or STRICTLY LESS (going west) than the previous stop. No exceptions.
   - North-South route: every stop's latitude must be STRICTLY GREATER (going north) or STRICTLY LESS (going south) than the previous stop. No exceptions.
   - Diagonal route (e.g. NE): longitude AND latitude must both progress in the same direction for every stop.

4. NO SHARP TURNS: The bearing change between any two consecutive segments must never exceed 60°. If stop N+1 would require a turn >60° from N→N+1 to N+1→N+2, remove that stop and re-route. Z-shapes and S-curves are FORBIDDEN.

5. SPACING: Consecutive stops must be 350–650 m apart. Never cluster stops within 300 m. Never leave a gap over 700 m.

6. TRANSFERS — SCAN ALL: Look at EVERY existing stop in the brief. If your route passes within 400 m of any existing stop, you MUST include a stop named "<ExistingStation> Transfer" at that exact location. Missing an obvious transfer is a critical error.

7. BOUNDS: lon −79.65 to −79.10, lat 43.638 to 43.85. Minimum 7 stops, maximum 12 stops.

8. WATER BOUNDARY: lat < 43.638 is Lake Ontario. Any stop below 43.638 is invalid — absolute rule.

9. REAL INFRASTRUCTURE: Subways follow Yonge, Bloor, Eglinton, Sheppard, Finch, or equivalent arterials. Streetcars follow King, Queen, Dundas, College, Spadina. Buses follow any arterial. Never cut diagonally through blocks or parks.

10. DENSITY FIRST: Use boardings data. Prioritize high-demand intersections and underserved dense neighbourhoods. Avoid low-density stops.

11. PROSE ONLY: Do NOT write raw coordinates anywhere in analysis text. Use intersection names only. Coordinates go in the route block only.
""".strip()

# ── System prompts ─────────────────────────────────────────────────────────────

PLANNER_A_SYSTEM = f"""You are Alex Chen, Senior Transit Planner at the City of Toronto. You champion ridership, equity, and underserved communities. You believe transit should reach people who need it most — low-income riders, seniors, areas without good service. You are optimistic and people-focused.

Use the boardings data in the brief to identify the busiest stops and most underserved corridors. Gravitate toward population-dense areas and intersections with high demand. Follow major roads or rail corridors — do not invent diagonal cuts through neighbourhoods.

For each proposed station: nearest intersection name + one sentence on who benefits (density, destinations, equity). Do NOT include coordinates in your prose.

{_QUOTE_ALEX}

{_ROUTE_BLOCK}"""

PLANNER_B_SYSTEM = f"""You are Jordan Park, Infrastructure Cost Analyst at the TTC. Skeptical, numbers-driven, allergic to cost overruns.

You REJECT Alex's corridor entirely. Your route MUST:
- Run on a DIFFERENT street/corridor than Alex's (different direction if possible)
- Use type "subway" — this is a subway-only planning exercise
- Serve a DIFFERENT set of neighbourhoods than Alex's

After your proposal, score Alex's stations: Cost Risk 1–10, ROI 1–10. Reference stops by intersection name only — no coordinates in prose.

{_QUOTE_JORDAN}

{_ROUTE_BLOCK}"""

NIMBY_SYSTEM = f"""You are Margaret Thompson, chair of the local Residents' Association. Fiercely protective, emotional, but not stupid.

YOU MUST USE THIS EXACT FORMAT — no intro, no paragraphs, no deviation:

**[Street] & [Street]**: [who is hurt and how, ≤12 words]. Resistance: X/10. Fix: [specific ask, ≤8 words].
**[Street] & [Street]**: [who is hurt and how, ≤12 words]. Resistance: X/10. Fix: [specific ask, ≤8 words].
**[Street] & [Street]**: [who is hurt and how, ≤12 words]. Resistance: X/10. Fix: [specific ask, ≤8 words].

{_QUOTE_MARGARET}

Exactly 3 entries. No prose before or after. No route JSON."""

PR_SYSTEM = f"""You are Devon Walsh, TTC Director of Communications. Calculating, cynical, allergic to bad headlines.

YOU MUST USE THIS EXACT FORMAT — no prose paragraphs, no deviation:

| Station | Displacement | Noise | Gentrif. | Env.J. | Total |
|---------|-------------|-------|----------|--------|-------|
| [name]  | X           | X     | X        | X      | XX    |
| [name]  | X           | X     | X        | X      | XX    |
| [name]  | X           | X     | X        | X      | XX    |

PR Score: XX/40. Liability: [YES/NO].
Fix: [single station swap in ≤12 words].

{_QUOTE_DEVON}

No route JSON."""

REBUTTAL_SYSTEM = f"""You are Alex Chen and Jordan Park issuing a joint rebuttal. You disagree on many things, but you've found a genuine compromise. Alex conceded on one expensive station; Jordan conceded on one equity-critical stop. The result is a route you can both defend.

Defend strong stations with data. For contested stations: explicitly state concede-or-hold and why. State the tradeoffs directly.

{_QUOTE_REBUTTAL}

{_ROUTE_BLOCK}"""

COMMISSION_SYSTEM = f"""You are the Toronto Transit Commission Planning Committee.

Rule on each contested station (Confirmed / Modified / Rejected), state one mitigation per concern, give revised PR Score /40.

Then output the binding final route. The final route must be geometrically correct: linear path, no loops, stops 350–650 m apart, transfer stops where the route crosses existing lines. The route must follow real Toronto road or rail corridors and not place any stop in Lake Ontario (lat < 43.638 is forbidden). Prioritize high-ridership corridors supported by the demand data.

{_QUOTE_COMMISSION}

{_ROUTE_BLOCK}"""

# ── Agent registry ─────────────────────────────────────────────────────────────

AGENTS = [
    {"key": "planner_a",  "name": "Alex Chen",          "role": "Ridership Planner",      "color": "#2563eb", "system": PLANNER_A_SYSTEM,  "model": _SONNET, "max_tokens": 700},
    {"key": "planner_b",  "name": "Jordan Park",         "role": "Infrastructure Analyst", "color": "#16a34a", "system": PLANNER_B_SYSTEM,  "model": _SONNET, "max_tokens": 700},
    {"key": "nimby",      "name": "Margaret Thompson",   "role": "Neighbourhood Rep",      "color": "#dc2626", "system": NIMBY_SYSTEM,      "model": _HAIKU,  "max_tokens": 200},
    {"key": "pr",         "name": "Devon Walsh",         "role": "PR Director",            "color": "#d97706", "system": PR_SYSTEM,         "model": _HAIKU,  "max_tokens": 250},
    {"key": "rebuttal",   "name": "Alex & Jordan",       "role": "Joint Rebuttal",         "color": "#7c3aed", "system": REBUTTAL_SYSTEM,   "model": _SONNET, "max_tokens": 700},
    {"key": "commission", "name": "Planning Commission", "role": "Final Decision",         "color": "#0f172a", "system": COMMISSION_SYSTEM, "model": _SONNET, "max_tokens": 800},
]

# ── SSE helper ─────────────────────────────────────────────────────────────────

def _sse(payload: dict) -> str:
    return "data: " + json.dumps(payload) + "\n\n"


def _fix_route_geometry(route: dict) -> dict:
    """Sort stops monotonically along the primary axis to eliminate Z/S shapes."""
    stops = route.get("stops", [])
    if len(stops) < 2:
        return route

    lons = [s["coords"][0] for s in stops]
    lats = [s["coords"][1] for s in stops]
    lon_range = max(lons) - min(lons)
    lat_range = max(lats) - min(lats)

    # Determine primary axis and sort direction from first vs last stop
    if lon_range >= lat_range:
        # East-west dominant — sort by longitude
        going_east = stops[-1]["coords"][0] > stops[0]["coords"][0]
        sorted_stops = sorted(stops, key=lambda s: s["coords"][0], reverse=not going_east)
    else:
        # North-south dominant — sort by latitude
        going_north = stops[-1]["coords"][1] > stops[0]["coords"][1]
        sorted_stops = sorted(stops, key=lambda s: s["coords"][1], reverse=not going_north)

    return {**route, "stops": sorted_stops}


def _extract_route(text: str) -> dict | None:
    m = re.search(r"```route\s*(.*?)```", text, re.DOTALL)
    if not m:
        return None
    try:
        route = json.loads(m.group(1).strip())
        return _fix_route_geometry(route)
    except json.JSONDecodeError:
        return None


def _extract_quote(text: str) -> str | None:
    m = re.search(r"```quote\s*(.*?)```", text, re.DOTALL)
    return m.group(1).strip() if m else None


def _strip_blocks(text: str) -> str:
    """Remove route and quote code blocks from display text."""
    return re.sub(r"```(?:route|quote)\s*.*?```", "", text, flags=re.DOTALL).strip()


# ── Stream one agent turn — yields (sse_chunk, accumulated_text) in real time ──

async def _turn(agent: dict, thread_id: str, prompt: str):
    yield _sse({"type": "agent_start", "agent": agent["name"], "role": agent["role"], "color": agent["color"]}), ""
    full = ""
    async for chunk in stream_message(thread_id, prompt, model=agent["model"], max_tokens=agent["max_tokens"]):
        full += chunk
        yield _sse({"type": "agent_text", "agent": agent["name"], "text": chunk}), full
    quote = _extract_quote(full)
    if quote:
        yield _sse({"type": "agent_quote", "agent": agent["name"], "text": quote}), full
    yield _sse({"type": "agent_end", "agent": agent["name"]}), full


# ── Council orchestration ──────────────────────────────────────────────────────

async def run_council(
    neighbourhoods: list[str],
    stations: list[str],
    line_type: str | None,
    extra_context: str | None,
    existing_lines: list[dict] | None = None,
) -> AsyncIterator[str]:

    yield _sse({"type": "status", "text": "Fetching transit data…"})
    try:
        data_brief, stops = await build_data_brief(neighbourhoods, stations)
    except Exception as exc:
        yield _sse({"type": "status", "text": f"Data fetch failed: {exc}. Continuing without transit data."})
        data_brief, stops = "No transit data available.", []

    yield _sse({"type": "status", "text": f"{len(stops)} stops found. Assembling council…"})

    # Create sessions (in parallel for speed)
    try:
        async def _make_session(ag: dict) -> tuple[str, str]:
            aid = await create_assistant(ag["name"], ag["system"])
            tid = await create_thread(aid)
            return ag["key"], tid

        results = await asyncio.gather(*[_make_session(ag) for ag in AGENTS])
        sessions: dict[str, str] = dict(results)
    except Exception as exc:
        yield _sse({"type": "status", "text": f"Council setup failed: {exc}"})
        yield _sse({"type": "done"})
        return

    yield _sse({"type": "status", "text": "Council ready — deliberation begins."})

    # Shared brief (concise)
    type_str = f"REQUIRED MODE: {line_type}. " if line_type else "REQUIRED MODE: subway. All routes must use type \"subway\". "
    brief = (
        f"# Planning Brief\n"
        f"Serve: {', '.join(neighbourhoods) or 'Toronto'}. "
        f"Connect: {', '.join(stations) or 'None specified'}. "
        f"{type_str}\n\n"
        f"## Stop demand data\n{data_brief}"
    )
    if existing_lines:
        by_route: dict[str, list[str]] = {}
        for s in existing_lines:
            by_route.setdefault(s["route"], []).append(
                f"{s['name']} ({s['coords'][0]:.4f}, {s['coords'][1]:.4f})"
            )
        lines_text = "\n".join(
            f"  {route}: {', '.join(stops)}" for route, stops in by_route.items()
        )
        brief += (
            f"\n\n## Existing TTC lines & stops (coords shown for transfer detection)\n{lines_text}\n"
            "\nMANDATORY TRANSFER RULE: Go through EVERY existing stop listed above one by one. "
            "If any existing stop's coordinates place it within ~400 m of your route corridor, "
            "you MUST include a stop named '<ExistingStation> Transfer' at that exact location. "
            "400 m ≈ 0.004 degrees of latitude or longitude. "
            "Missing an obvious transfer is a critical planning error."
        )
    if extra_context:
        brief += f"\n\nExtra context: {extra_context}"

    def ag(key: str) -> dict:
        return next(a for a in AGENTS if a["key"] == key)

    try:
        # ── R1: Planner A initial proposal ────────────────────────────────────
        full_a = ""
        async for sse_chunk, full_a in _turn(ag("planner_a"), sessions["planner_a"],
            brief + "\n\nPropose 6–20 stations. Name each by nearest intersection, one sentence justification each. Output route block."):
            yield sse_chunk
        route_a = _extract_route(full_a)
        if route_a: yield _sse({"type": "route_update", "route": route_a, "round": 1})

        # ── R2: Planner B — independent alternative route ─────────────────────
        # Strip Alex's route block so Jordan cannot copy the coordinates
        alex_prose = _strip_blocks(full_a)
        full_b = ""
        async for sse_chunk, full_b in _turn(ag("planner_b"), sessions["planner_b"],
            brief + f"\n\n## Alex's Analysis (prose only — do NOT copy Alex's stops or coordinates)\n{alex_prose}\n\n"
            "Propose YOUR OWN subway route on a COMPLETELY DIFFERENT corridor. "
            "If Alex ran east-west, you MUST run north-south. If Alex ran north-south, you MUST run east-west. "
            "Your stops must be on entirely different streets and serve different neighbourhoods than Alex's. "
            "Do not reuse any of Alex's stops. Output YOUR route block."):
            yield sse_chunk
        route_b = _extract_route(full_b)
        if route_b: yield _sse({"type": "route_update", "route": route_b, "round": 2})
        current = route_b or route_a

        # ── R3 + R4 in parallel ────────────────────────────────────────────────
        full_n = ""
        full_pr = ""
        para_queue: asyncio.Queue[str | None] = asyncio.Queue()

        async def _run_nimby() -> None:
            nonlocal full_n
            route_names = [s["name"] for s in (current or {}).get("stops", [])]
            async for sse_chunk, full_n in _turn(
                ag("nimby"), sessions["nimby"],
                f"Two proposals are on the table:\n"
                f"Alex's route stops: {route_names or '(none)'}\n"
                f"Jordan's route: different corridor.\n"
                f"Affected areas: {', '.join(neighbourhoods) or 'Toronto'}.\n\n"
                "Identify 2–3 most disruptive stations across both proposals. NIMBY scores + mitigations."
            ):
                await para_queue.put(sse_chunk)
            await para_queue.put(None)

        async def _run_pr() -> None:
            nonlocal full_pr
            async for sse_chunk, full_pr in _turn(
                ag("pr"), sessions["pr"],
                f"Full debate:\n**Alex:** {full_a[:400]}…\n**Jordan:** {full_b[:400]}…\n\n"
                "Score top 3 stations on Displacement/Noise/Gentrification/EnvJustice. "
                "Overall PR score /40. One highest-impact recommendation."
            ):
                await para_queue.put(sse_chunk)
            await para_queue.put(None)

        tasks = [asyncio.create_task(_run_nimby()), asyncio.create_task(_run_pr())]
        pending = 2
        while pending > 0:
            item = await para_queue.get()
            if item is None:
                pending -= 1
            else:
                yield item
        await asyncio.gather(*tasks)

        # ── R5: Joint rebuttal ─────────────────────────────────────────────────
        full_reb = ""
        async for sse_chunk, full_reb in _turn(ag("rebuttal"), sessions["rebuttal"],
            brief + f"\n\n**Alex:** {full_a}\n**Jordan:** {full_b}\n**Margaret:** {full_n}\n**Devon:** {full_pr}\n\n"
            "Issue joint rebuttal. Defend or replace the 1–2 most contested stations. Output compromise route block."):
            yield sse_chunk
        route_reb = _extract_route(full_reb)
        if route_reb: yield _sse({"type": "route_update", "route": route_reb, "round": 5})

        # ── R6: Commission final ───────────────────────────────────────────────
        full_com = ""
        async for sse_chunk, full_com in _turn(ag("commission"), sessions["commission"],
            brief + f"\n\n**Alex:** {full_a}\n**Jordan:** {full_b}\n**Margaret:** {full_n}\n"
            f"**Devon:** {full_pr}\n**Rebuttal:** {full_reb}\n\n"
            "Rule on each contested station. Commit to mitigations. Revised PR score. Output final route block."):
            yield sse_chunk

        route_final = _extract_route(full_com) or route_reb or current
        if route_final:
            # Extract PR score /40 from PR agent or commission text
            pr_score: int | None = None
            for src in (full_com, full_pr):
                m = re.search(r"(?:PR Nightmare Score|score)[^\d]*(\d+)\s*/\s*40", src, re.IGNORECASE)
                if m:
                    pr_score = int(m.group(1))
                    break
            payload: dict = {"type": "route_final", "route": route_final}
            if pr_score is not None:
                payload["pr_score"] = pr_score
            yield _sse(payload)

    except Exception as exc:
        yield _sse({"type": "status", "text": f"Council error: {exc}"})

    yield _sse({"type": "done"})
