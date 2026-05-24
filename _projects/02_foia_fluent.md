---
layout: project
title: FOIA Fluent
description: Civic AI for public records. Multi-source document discovery, anti-hallucination request drafting grounded in statute + eCFR + outcomes, real-time 19-source signals ingest, LLM-driven cross-source pattern detection, and a tool-using chat assistant with 4-tier accuracy escalation.
img: assets/img/projects/foia_homepage.png
importance: 2
category: ai-engineering
affiliation: NYC Data Science for Social Good
date: 2026-03-01
date_display: Mar 2026 – Present
role: Data Science for Social Good (NYCxDSSG)
---

## Overview

An open-source civic AI platform for journalists, lawyers, researchers, and citizens, covering the full FOIA lifecycle from discovery through filing through tracking through pattern analysis. Built with NYC Data Science for Social Good. The codebase is a FastAPI backend + Next.js 14 frontend, Supabase for persistence and auth, Claude (Haiku 4.5 + Sonnet 4.6) for the language model work, and a registry-driven ingest pipeline that pulls from 19 federal sources daily.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/foia_homepage.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="540px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Homepage: entry to Discover & Draft, the Transparency Hub, Live FOIA Signals, My Requests, and the chat assistant.
</div>

## Live + Code

🔗 [www.foiafluent.com](https://www.foiafluent.com) · 📂 [github.com/dssg-nyc/FOIA-Fluent](https://github.com/dssg-nyc/FOIA-Fluent)

## Why It Exists

The Freedom of Information Act promises transparency, but the operational process is broken in specific, addressable ways:

- **Documents exist but are scattered.** Public records sit across MuckRock, DocumentCloud, agency reading rooms, and the open web with no unified search.
- **Jurisdictions differ.** Federal FOIA, NY FOIL, California CPRA, and Texas PIA each have unique exemptions, deadlines, appeals, and fee rules.
- **Requests fail at high rates.** Poorly worded requests, wrong agencies, missing legal citations, and vague scope give agencies easy reasons to deny or delay.
- **No shared intelligence.** Journalists, lawyers, and civic groups each re-invent the same research.
- **The process is opaque.** Response timelines stretch from weeks to years, improper redactions go unchallenged, and most people give up.

The platform tries to attack all five with a single integrated stack.

## Architecture

```
Frontend (Next.js 14)          Backend (FastAPI)              External Services
┌──────────────────┐          ┌──────────────────────┐       ┌─────────────────┐
│                  │   HTTP   │                      │       │ Claude API      │
│  Transparency Hub│ ───────▶ │  Chat Orchestrator   │ ────▶ │ (Haiku + Sonnet)│
│  Discover & Draft│          │  Discovery Pipeline  │       │                 │
│  My Requests     │   SSE    │  FOIA Drafter        │       │ Tavily Search   │
│  My Discoveries  │ ◀─────── │  Agency Intel Agent  │       │                 │
│  FOIA Signals    │          │  Response Analyzer   │       │ MuckRock API    │
│  Chat Panel      │          │  Letter Generator    │       │ FOIA.gov API    │
│  Left Sidebar    │          │  Signals Ingestion   │       │ DocumentCloud   │
│                  │          │  Discoveries Service │       │ eCFR API        │
│                  │          │  Chat Tools (11)     │       │ EPA ECHO        │
└──────────────────┘          └──────────────────────┘       └─────────────────┘
                                          │
                              ┌───────────▼──────────┐
                              │      Supabase        │
                              │ PostgreSQL + Auth    │
                              │ + Row Level Security │
                              └──────────────────────┘
```

The backend is async-native (FastAPI + asyncio) so the same process can serve user requests *and* tick the 19-source ingest dispatcher on a 60-minute loop without external cron infrastructure.

## 1. Discover and Draft: Grounded Request Drafting

The discover-and-draft pipeline is the platform's flagship feature: a natural-language query becomes a unified result set across MuckRock, DocumentCloud, and the open web, and any result can be converted into a drafted FOIA request grounded in verified legal context.

### Query interpretation

A free-text query is parsed by Claude into structured fields:

- relevant **federal agencies** (with alternatives + reasoning)
- candidate **record types**
- an **intent summary**

This structured intent drives the parallel search across sources rather than dispatching raw text.

### Three-pane results

Left filter rail (source / year / type / sort), unified compact row list of results from all sources, persistent right detail pane with Save / Track / Open / Note actions.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/foia_draft_page.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="540px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Discover & Draft: unified search across MuckRock, DocumentCloud, and the open web. The detail pane drives Save, Track, and Draft actions.
</div>

### Anti-hallucination drafting

The drafter cannot cite law from the model's training data. Each generated request letter is grounded in **three explicit context layers**, retrieved fresh per request:

1. **Statute text:** the relevant federal or state FOIA/FOIL/CPRA/PIA statute.
2. **Agency regulations:** verbatim CFR text pulled from the **eCFR API**, scoped to the target agency.
3. **Agency outcomes:** historical request outcomes for that agency from **MuckRock** (successful, denied, exemptions cited).

The drafter is constrained by prompt to only cite from this retrieved context. The resulting letter is paired with a *"How We Built This Draft"* interpretability panel that surfaces which strategies the model applied and why.

## 2. Live FOIA Signals: Multi-Source Ingest

A real-time intelligence feed aggregating government activity from **19 federal sources**, with cross-source pattern detection on top.

### Source registry + 6 fetch strategies

Adding a source is **one entry** in `backend/app/data/signals_sources.py` (a `SourceConfig`). No new cron jobs and no new scripts. Six fetch strategies handle the format variation:

- **RSS:** most agency news feeds (DOJ press, White House actions, FDA press).
- **HTML scrape:** agency pages without machine-readable feeds.
- **JSON API:** structured endpoints (Congress.gov, regulations.gov, CourtListener, SAM.gov).
- **CSV bulk download:** bulk datasets (FEC, certain enforcement archives).
- **Sitemap crawl:** for sources that expose `sitemap.xml` but no feeds.
- **PDF vision:** Claude multimodal for sources that publish FOIA logs as PDFs (e.g. DHS FOIA logs), where text-extraction tools fail on scanned tables.

Coverage spans enforcement (EPA ECHO, FDA warning letters, NHTSA / CPSC / USDA FSIS recalls, IRS), courts (SEC EDGAR litigation, CourtListener opinions, DOJ press), oversight (IG reports, CIGIE aggregator, GAO bid protests and reports), elections + lobbying (FEC enforcement, Senate LDA), executive (White House, regulations.gov dockets, SAM.gov contracts), and legislative (Congress.gov bills) channels.

### Dispatcher loop

A 60-minute `asyncio` loop ticks an in-process dispatcher. Each source self-gates by its per-source `cadence_minutes` field: daily sources run once per day, hourly sources run every hour, all without external cron. Pattern detection (below) fires automatically inline after new signals land, with a 12-hour debounce.

### Categorization + entity resolution

- **20-category taxonomy** (`agency_enforcement`, `drug_recalls`, `court_opinions`, `legislation`, ...). Categories are the data primitive on each signal.
- **7 persona bundles** (journalist, pharma analyst, hedge fund, environmental, policy researcher, legal analyst, consumer safety). Each persona is a named bundle of categories that expands when selected.
- **Per-signal entity extraction** of companies, agencies, people, locations, and regulations. Slugified entities link cross-source so a company's full activity is one click away.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/foia_intelligence_page.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="540px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Live FOIA Signals: feed aggregating 19 federal sources, with AI-detected cross-source patterns surfacing on the same dashboard.
</div>

## 3. Pattern Detection Engine

Built on top of the ingest layer: a Claude-driven engine that detects **cross-source narratives**, patterns no single source can show on its own.

### Seven pattern types

Each encodes a different temporal / agency-flow shape:

- **Compounding risk:** multiple risk signals stacking on one entity.
- **Coordinated activity:** multiple agencies acting on the same entity in close succession.
- **Trend shift:** change in volume or pattern of a category over time.
- **Convergence:** independent signals converging on the same target.
- **Regulatory cascade:** one regulation triggers downstream enforcement / litigation.
- **Recall → litigation:** product recalls followed by lawsuits.
- **Oversight → action:** IG / GAO findings followed by enforcement.

### Sliding window + dedup

- **60-day lookback, 400-signal corpus.** Wide enough to catch slow-burning narratives, capped to keep token cost predictable.
- **Per-run dedup context.** The last 7 days of pattern titles are passed to Claude as already-seen, so the dashboard does not fill with duplicates.
- **Cost ceiling.** One run is ~$0.50 on Sonnet 4.6, capped to one run per ingest cycle → ~$15 per month at daily cadence.

### Pattern galaxy visualization

A force-directed graph (d3-force) renders each pattern as a colored cluster. **Shared entity nodes bridge clusters** when the same company or agency appears across patterns, exposing higher-order connections. Pan, scroll zoom, pinch zoom on touch. Click a cluster → in-page right-side drawer with the narrative + full evidence timeline; galaxy isolates to the selected cluster while the drawer is open.

<div class="row">
  <div class="col-sm mt-3 mt-md-0 text-center">
    {% include figure.liquid loading="eager" path="assets/img/projects/foia_pattern_graph.png" class="img-fluid rounded z-depth-1 mx-auto d-block" width="auto" max-height="540px" zoomable=true %}
  </div>
</div>
<div class="caption">
  Pattern galaxy: each cluster is one Claude-detected cross-source pattern. Nodes are signals (colored by cluster) and shared entities (companies, agencies, people, locations) that link clusters.
</div>

## 4. AI Chat Assistant: Tool-Using + Tiered Accuracy

A persistent FOIA research assistant available on every page (Cmd+K toggle), with **tool use**, anti-hallucination grounding, and an explicit cost / accuracy tiering.

### 11 tools

- lookup exemptions
- search agencies
- query the user's requests
- search web (trusted-domain mode)
- search web (broad mode)
- search MuckRock
- query Transparency Hub stats
- search the user's saved discoveries
- read a saved document's content
- query the signals feed
- (… plus one specialized lookup)

### 4-tier accuracy system

Each user message resolves through an escalation ladder:

1. **Instant local lookup:** reference data the backend ships with (exemption catalog, agency directory, persona definitions).
2. **Trusted-domain web search:** Tavily, scoped to a curated whitelist of authoritative domains.
3. **Deep research agent:** broader search + multi-tool chaining, escalates the model from **Haiku 4.5 to Sonnet 4.6**.
4. **Graceful fallback:** when no source can satisfy the question, returns a structured response with the resource links it consulted rather than fabricating an answer.

### Safety constraints

- **Read-only at the code level.** The chat cannot modify any database records, enforced in `chat_tools.py`.
- **Grounded in tool results.** Every fact must come from a tool result or verified reference data. Sources surface as clickable chips next to the answer.
- **Platform-expert mode.** Knows which page the user is on and tailors guidance.
- **SSE streaming.** Real-time response with thinking dots, tool-call indicators, and incremental text.

## 5. Transparency Hub: Aggregation + Composite Scoring

A public dashboard surfacing aggregated FOIA performance data across the federal government and 54 state jurisdictions.

### Federal: 1,600+ agencies

Each agency gets a **Transparency Score**, a single composite metric:

```
Transparency Score = 0.40 · success_rate
                   + 0.30 · response_speed
                   + 0.15 · fee_rate
                   + 0.15 · portal_availability
```

Backed by MuckRock data refreshed weekly into Supabase. Each agency has a per-agency deep dive (outcome pie chart, score breakdown, exemption patterns, success/denial patterns).

### State + local: choropleth

Interactive US map color-coded by per-state transparency score, with click-through to per-state stats and a searchable agency directory. Jurisdiction-scoped agency routing (`/hub/states/california/department-of-education`) avoids slug conflicts across states.

### Insights: FOIA.gov annual reports

Long-range trends pulled from FOIA.gov annual reports (FY 2008–2024) into a Recharts-based dashboard: request volume, transparency rates, processing times, costs and staffing, appeals and litigation. Plus a Claude-curated **AI News Digest** that ingests 10 RSS feeds and produces categorized FOIA news summaries.

## 6. My Requests: Workflow Engine

Per-user request lifecycle from filing through resolution.

- **Supabase Row-Level Security** so each user only sees their own requests; **OTP auth** via Supabase Auth.
- **Deadline calculator.** 20 business days, skipping weekends + federal holidays.
- **Response analyzer.** Claude evaluates an agency response for completeness, validates each cited exemption, identifies missing records, and recommends next steps.
- **Letter generation.** Appeal + follow-up letters generated directly from the communication timeline.
- **Linked discoveries.** Documents from the discovery library link into the relevant tracked request for a unified research trail.
- **Import existing requests.** Pull in already-filed FOIA requests for full research-pipeline analysis.

## Stack

**Backend:** FastAPI (Python 3.11), async-native, SSE streaming, Pydantic validation, Supabase (PostgreSQL + Auth + RLS), OTP authentication.

**Frontend:** Next.js 14 (React 18, TypeScript, App Router, SSR), Recharts for charts, react-simple-maps for the state choropleth, d3-force for the pattern galaxy.

**AI + search:** Claude API, Haiku 4.5 default, Sonnet 4.6 escalation, Sonnet 4.6 for pattern detection and PDF-vision ingest. Tool use, 200K context. Tavily API for domain-scoped web search.

**Infrastructure:** Railway (backend), Vercel (frontend). 19-source ingest dispatcher runs in-process inside the backend, no external cron.

## Key Data Sources

| Source | What it provides |
|---|---|
| [MuckRock](https://www.muckrock.com) | FOIA requests, agency response data, outcome intelligence |
| [FOIA.gov](https://www.foia.gov) | Annual report data (FY 2008–2024) for 100+ federal agencies |
| [DocumentCloud](https://www.documentcloud.org) | Searchable repository of public-interest documents |
| [Tavily](https://tavily.com) | Domain-scoped web search |
| [eCFR](https://www.ecfr.gov) | Verbatim CFR regulation text for 52 federal agencies |
| [EPA ECHO](https://echo.epa.gov) | Environmental enforcement and compliance data |

## Links

🔗 [Live site](https://www.foiafluent.com) · 📂 [Repo](https://github.com/dssg-nyc/FOIA-Fluent)
