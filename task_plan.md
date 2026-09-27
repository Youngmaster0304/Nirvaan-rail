# Task Plan — SIH26027 A-ABPS Redesign & Wiring

> **Status: complete.** This file is kept as the design-spec and API-contract
> reference for the codebase. Phases A–D below were implemented and verified:
> 26/26 endpoints return 200 (401 on bad credentials), `pytest` 25 passed,
> `tsc --noEmit` and `npm run build` both exit 0. See `README.md` for the
> endpoint table and deployment steps.

Status legend: `TODO` / `WIP` / `DONE` / `BLOCKED`

---

## 0. Goal

Make the existing product real and make it look like a designed government operations console
(matching the Figma reference), without discarding working code.

Three deliverables:
1. Backend actually runs its own ML / optimisation / simulation / DB layers.
2. Frontend redesign to the Figma design language, connected to the backend.
3. A small chatbot + a free-government-data integration.

---

## 1. Design reference (extracted from the Figma bundle)

Source: `https://clone-moss-61072584.figma.site/` — CSS `assets/index-DLvgiZRz.css` + JSX strings.

### Canvas
| Token | Value |
|---|---|
| Page background | `#dde4ef` (light blue-grey, NOT white) |
| Ink / text | `#0d1a2d` |
| Muted text | `#546380` |
| Hairline | `#DCE5F0` / `#C8D4E6` / `#b8cae0` / `#d0daf0` |
| Max width | `1700px` |
| Radius | `4px` cards, `2px` stamps/chips |
| Scrollbar | 5px, thumb `#a0b0cc` |

### Dark chrome
```
.m-dark   background: linear-gradient(175deg,#004492 0%,#002d62 48%,#001a3a 100%)
          inset 0 1px #ffffff38, inset 0 -1px #00000052, 0 4px 14px #00000047
.nav-pill color #ffffff9e, 12.5px, radius 2px, pad 4px 14px
.nav-pill.active color #fff, bg linear-gradient(145deg,#ffffff2e,#ffffff14), border #ffffff24
```

### Surfaces
```
.m-card   background: linear-gradient(148deg,#fff 0%,#f6f9fe 52%,#eff4fb 100%)
          border: 1px solid; border-color: #fffffffa #002d6217 #002d6221 #ffffffbf
          radius 4px; inset 0 1px #fff, 0 2px 4px #002d6214, 0 6px 18px #002d6212
.m-row-even  linear-gradient(#fafcff 0%,#f4f7fd 100%)
.m-row-odd   #fff
.m-row-hover linear-gradient(#ebf0fa 0%,#e4edf8 100%)
.m-row-selected inset 3px 0 #002d62, bg #e0eaff→#d6e3ff
.m-thead   linear-gradient(#eaf0f8 0%,#dde6f2 100%), inset 0 -2px #b8cae0
.goi-bar   linear-gradient(#fff,#f8fafe), border-bottom #d0daf0
```

### Accents (Indian tricolor, purposeful only)
```
saffron  linear-gradient(148deg,#f93 0%,#e8820c 60%,#cc6a00 100%)
green    linear-gradient(148deg,#1a9c35 0%,#138808 55%,#0a5e1c 100%)
red      linear-gradient(148deg,#dc2626 0%,#b91c1c 55%,#7f1d1d 100%)
tricolor-line  4px, saffron 33.33% / white 33.33% / green 66.66%
```

### Stamp badges — JetBrains Mono 10px, 700, uppercase, tracking .04em, radius 2px, pad 2px 8px
| Variant | Text | BG | Border |
|---|---|---|---|
| approved | `#0a6b21` | `#e5f4ea→#d2edd8` | `#8dd4a0` |
| pending | `#92400e` | `#fef3e2→#fdebc8` | `#f5c070` |
| critical | `#7f1d1d` | `#fee2e2→#fecaca` | `#f87171` |
| active | `#002d62` | `#ebf0fa→#d6e4ff` | `#93b4f0` |
| medium | `#713f12` | `#fef9e2→#fdf2c0` | `#f0c040` |

### Type
- Sans: `Noto Sans`, `Noto Sans Devanagari` (Hindi labels exist in nav)
- Mono: `JetBrains Mono` — all meta, refs, scores, section labels
- `.section-label` 9px / 700 / tracking .12em / uppercase / `#546380`
- `.sys-meta`, `.form-ref` — JetBrains Mono 10px `#546380`
- Table cell sizes 8–11px (dense by intent — this is an operations console)

### Page anatomy (from JSX)
1. `.goi-bar` — "Government of India / Ministry of Railways" · centre "Centre for Railway Information Systems (CRIS)" · right session meta
2. `.tricolor-line`
3. `nav.m-dark` — logo tile + `A-ABPS v2.1` + form ref · pills: Operations Dashboard / Task Prioritisation / Block Programme (each with Hindi `labelHi`) · right: `AI ENGINE ACTIVE` green pulse + user + logout
4. Body (bg `#dde4ef`, max-w 1700):
   - **Operations Overview** — "AI-Powered Automatic Block Planning System", `Allahabad Division · NCR Zone · <date>`, `All Systems Operational`
   - **4 KPI cards** w/ sparklines: Active Blocks 23 · Blocks Merged (AI) 47 · Downtime Saved 128h · Critical Alerts 3
   - **Corridor Track Condition Register** — UTSM/TRC table
   - **AI Recommendations** — Live Dispatch · NCR Control · LIVE · 5 recs with severity stamps
   - **Block Programme · Task Register** — table, row click → SHAP drawer
   - **SHAP Explainability Report** drawer (440px right) — score, task details, factor contribution bars
   - **Block Programme · Gantt View** — VIEW/DEPT/STATUS filters, corridor × time grid
   - side stats: Train Runs Today 1,247 · Pending Approvals · Maintenance Efficiency · Total/Active/Approved/Emergency blocks

### Anti-vibe rules (from the user brief) that bind this build
No rainbow gradients, no emoji icons, no pure-white page, no fake testimonials/metrics-as-social-proof,
no bento-for-bento's-sake, no glassmorphism, restrained hover animation, real product data only,
Privacy/Terms/Contact present because a login collects data, accessible contrast + focus + reduced-motion.

---

## 2. API contract (frontend ⇄ backend — single source of truth)

Base: `/api` (Vite dev proxy → `localhost:8000`, nginx → `backend:8000`).
Auth: `Authorization: Bearer <token>`.

| # | Method | Path | Req body / query | Resp | Status |
|---|---|---|---|---|---|
| 1 | POST | `/auth/login` | `{employee_id, password}` | `{access_token, token_type, user:{employee_id,name,role,department,zone}}` | TODO |
| 2 | GET | `/auth/me` | — | `user` | TODO |
| 3 | GET | `/tasks` | `?department&severity&status&page&page_size` | `{items,total,page,page_size}` | TODO |
| 4 | GET | `/tasks/{id}` | — | task | TODO |
| 5 | POST | `/tasks/bulk-action` | `{task_ids[], action}` | `{updated}` | TODO |
| 6 | POST | `/prioritize` | `{task_ids?[]}` | `{tasks[], total_count, model_version, timestamp}` | TODO |
| 7 | GET | `/prioritize/results` | `?limit` | `{items[]}` | TODO |
| 8 | GET | `/prioritize/shap/{task_id}` | — | `{task_id, base_value, score, contributions:[{feature,value,display}]}` | TODO |
| 9 | POST | `/optimize/weekly` | `{start_date?, horizon_days?}` | `{plan_id, blocks[], total_blocks, total_tasks_scheduled, estimated_impact, window}` | TODO |
| 10 | POST | `/optimize/monthly` | `{start_date?, horizon_days?}` | same shape | TODO |
| 11 | GET | `/optimize/plans` | `?horizon` | `{items[]}` | TODO |
| 12 | GET | `/optimize/plans/{id}` | — | plan + blocks | TODO |
| 13 | POST | `/simulate` | `{plan_id}` | `{plan_id, trains_affected, avg_delay_minutes, freight_throughput_impact_pct, corridor_capacity_pct, details{}, with_ai{}, without_ai{}}` | TODO |
| 14 | GET | `/simulate/results/{plan_id}` | — | same | TODO |
| 15 | GET | `/audit` | `?page&page_size&action` | `{items,total}` | TODO |
| 16 | POST | `/approve` | `{plan_id, note?}` | `{ok, audit_id}` | TODO |
| 17 | POST | `/reject` | `{plan_id, note?}` | `{ok, audit_id}` | TODO |
| 18 | GET | `/corridors` | — | `{items[]}` | TODO |
| 19 | GET | `/corridors/kpis` | — | `{items[]}` | TODO |
| 20 | GET | `/corridors/{id}/topology` | — | `{nodes[], edges[]}` | TODO |
| 21 | POST | `/reports/generate` | `{type, plan_id?}` | `{report_id, summary, download_url, generated_at}` | TODO |
| 22 | GET | `/chat` history POST `/chat` | `{message, history[]}` | `{reply, source, data?}` | TODO |
| 23 | GET | `/gov/railway-live` | `?dataset` | `{source, dataset, fetched_at, records[], cached}` | TODO |
| 24 | GET | `/health` | — | `{status, model, tasks, version}` | already |

**New endpoints added by this work:** `#8` (SHAP detail), `#22` (chatbot), `#23` (government data).

---

## 3. Work breakdown

### Phase A — Backend P0: make it run (agent: `backend-fixer`)
- [ ] A1 Seed 4 demo users with bcrypt on startup; `POST /auth/login` verifies password.
- [ ] A2 `get_current_user` reads DB (no stub), includes `zone`; `TokenResponse` includes `user`.
- [ ] A3 Fix all response-model mismatches (prioritize, optimize ×2, simulate ×2, reports, corridors, kpis).
- [ ] A4 Wire `TaskPrioritizer` + `PolicyLayer` + SHAP into `POST /prioritize`; persist `priority_score` + `shap_values`.
- [ ] A5 Add `GET /prioritize/shap/{task_id}`.
- [ ] A6 Wire `WeeklyPlanner`/`MonthlyPlanner` + `BlockOptimizer` into `/optimize/*`; persist `BlockPlan` rows.
- [ ] A7 Wire `ImpactSimulator` into `/simulate`.
- [ ] A8 Wire audit service into `/audit`, `/approve`, `/reject`.
- [ ] A9 Seed DB: synthetic tasks (500+), corridors from `data/corridors.json`, KPIs — idempotent, only when empty.
- [ ] A10 Fix `corridor_graph` path + `corridors.json`/`stations.json` schema mismatch so the graph has real nodes.
- [ ] A11 `main.py`: CORS from `settings.CORS_ORIGINS`; startup runs seed + `ensure_model_exists()`.
- [ ] A12 Fix `docker-compose.yml` + `.env.example` → `sqlite+aiosqlite:///...`.
- [ ] A13 Endpoint smoke test: every route returns 200/401, none 500.

### Phase B — Backend P1: new capabilities (agent: `backend-fixer`)
- [ ] B1 `POST/GET /api/chat` — intent router over real DB (task counts, top priority, plan status, corridor KPI, safety rules) + optional LLM via `OPENAI_API_KEY`/`GEMINI_API_KEY`; always returns a grounded answer offline.
- [ ] B2 `GET /api/gov/railway-live` — data.gov.in client (`DATA_GOV_IN_API_KEY`), documented free-key path, bundled fallback dataset so the demo never breaks offline.

### Phase C — Frontend redesign (agent: me)
- [ ] C1 `index.css` + `tailwind.config.js`: adopt the Figma token set as the only source of truth; delete dead CSS.
- [ ] C2 Shell: `GovBar`, `TricolorLine`, `DarkNav` (pills + Hindi labels + AI pulse), `Footer` with working legal links.
- [ ] C3 Login page → real `POST /api/auth/login`, wired to `authStore`, redirect `/`, survives refresh.
      **KEEP the existing login design**: tricolor top bar, `भारतीय रेल | INDIAN RAILWAYS` heading, Employee ID,
      Password, Role select, arithmetic captcha, IT-Act-66 warning strip, demo-credential hint, footer links.
      Only restyle to the new tokens and swap the hardcoded credential check for the API call.
- [ ] C4 Dashboard → **KEEP the existing dashboard design**: 5 KPI cards (Total Pending Tasks, Overdue Tasks,
      Today's Blocks, Corridor Health Index, Block Productivity), Corridor Health table, Recent Activity feed,
      System Alerts panel, and the 3 action buttons. Restyle + feed from API instead of hardcoded arrays.
- [ ] C5 Task Prioritisation: filters that work, ranked table, SHAP drawer wired to `#8`.
- [ ] C6 Block Programme: real Gantt from plan data (replace `[GanttChart Component…]` placeholder).
- [ ] C7 Weekly / Monthly plan pages wired to `#9-12`.
- [ ] C8 Corridor Map, Impact Simulation, Audit Trail, Reports — wired; remove placeholder text.
- [ ] C9 Chatbot widget (dock, keyboard accessible) → `#22`.
- [ ] C10 Legal pages: Privacy, Terms, Contact, Disclaimer, RTI, Sitemap → real routes.
- [ ] C11 Fix all dead nav paths; consistent routes.
- [ ] C12 Wire government-data panel → `#23`.
- [ ] C13 Delete unused components/imports/dead modules.

### Phase D — Verify (agent: me)
- [ ] D1 `tsc --noEmit` → exit 0.
- [ ] D2 `npm run build` → success.
- [ ] D3 Backend boot + curl every endpoint.
- [ ] D4 `pytest` backend.
- [ ] D5 Responsive + contrast + keyboard pass.

---

## 4. Decisions

| Decision | Choice | Why |
|---|---|---|
| Rewrite vs refactor | **Refactor** | User forbade blind rewrite; audit shows structure/tokens are sound. |
| Design direction | Dense government operations console | Matches both the Figma ref and the product (dispatchers read dense tables). |
| Fonts | Noto Sans + Noto Sans Devanagari + JetBrains Mono | Exactly what the reference ships; Devanagari needed for Hindi nav. |
| Page background | `#dde4ef` | Reference is explicitly not white; avoids "pure white AI site". |
| Chatbot backend | Rule+DB grounded, LLM optional | Judges' laptops may be offline; never fail. |
| Gov data | `DATA_GOV_IN_API_KEY` + bundled fallback | A free key requires user registration I cannot perform for them. |
| Colors | 1 navy primary + tricolor accents + semantic stamps | Per brief: no rainbow, accents earn their place. |

## 5. Risks

- **R1** OR-Tools CP-SAT can hit its 30s cap on large instances → keep horizon small, return partial plan with flag.
- **R2** `model.pkl` trained on synthetic labels → label SHAP output as "model v2.1 (synthetic-labelled)" in UI, not as ground truth.
- **R3** data.gov.in needs a registered key → offline fallback must be first-class.
- **R4** Frontend/backend parallel edits → Phase C is mine alone; A/B are the subagent's (disjoint dirs).

## 6. Out of scope (deliberate)

- No i18n rewrite (Hindi labels ship as static nav labels only).
- No Postgres migration (SQLite is fine for the demo; note it in README).
- No removal of `venv/` (would break the running environment).

---

## 7. Phase R — AI feature parity + plan continuity (post-deploy request)

User request: (a) apply the AI features shown in the reference frontend, (b) weekly/monthly
generation must build on the **previous plan**. P0 = must ship, P1 = if time allows.

| ID | Action | Where | Status |
|---|---|---|---|
| R1 | `generate_plan()` resolves the latest same-type plan as base, unions its task ids into the job set (carry-forward), returns `based_on` + `carried_over_tasks` | `backend/app/services/planning_service.py` | done — `WEEK-2026-W39-R6 based_on=R5 carried=60` |
| R2 | Add `base_plan_id` to `PlanRequest`; add `based_on`, `carried_over_tasks` to `WeeklyPlanResponse`; pass through + audit it | `backend/app/schemas/block_schemas.py`, `backend/app/routers/optimize.py` | done |
| R3 | New `GET /api/recommendations` (merge / defer / alert / optimize derived from live DB rows) + `POST /api/recommendations/{id}/decision` writing the audit trail; decisions read back from audit | `backend/app/routers/recommendations.py`, `main.py` | done — approve → next GET shows APPROVED |
| R4 | Dashboard: **Run AI Analysis** header button → `POST /api/prioritize`, busy state, result notice, data refresh | `frontend/src/pages/DashboardPage.tsx` | done — "500 tasks scored · model v2.1" |
| R5 | Dashboard: **AI Recommendations** LIVE panel (status chip, rationale, savings, ref, APPROVE/DISMISS) | `frontend/src/components/AiRecommendations.tsx` + dashboard | done — UI approve → APPROVED stamp |
| R6 | KPI cards: bilingual EN/हिं labels, real Δ vs previous day from `kpiHistory`, `DATA SYNCED HH:MM:SS IST` | `frontend/src/pages/DashboardPage.tsx` | done — e.g. `-2 VS PREV DAY` |
| R7 | Plan workbench: show which previous plan a new run builds on + carried-forward count in the notice | `frontend/src/components/PlanWorkbench.tsx` | done — "Builds on: …-R6 · 60 tasks carried forward" |
| R8 | Corridor register: derived STATUS column (≥85 healthy / ≥70 fair / ≥60 degraded / <60 critical); stats strip: pending approvals, maintenance efficiency, open critical defects | `frontend/src/pages/DashboardPage.tsx` | done — deviation: efficiency delta is vs 14-day mean (`kpiHistory` only holds 14 days), not "last month" |

Bugs found and fixed during Phase R:
- `optimizer.py` compared **job ids** against `blocks[].tasks` (**maintenance task ids**), so every
  job was reported unscheduled and the impact string always claimed "N jobs deferred" while all
  tasks were scheduled. Now a job counts as unscheduled only when none of its tasks are in a block;
  impact reads `60 tasks in 57 blocks (6 merged) · ~3.6 h downtime saved`.
- `DashboardPage` load effect set `mounted = false` on cleanup but never reset it, so the
  StrictMode remount dropped every response and the board stayed in `loading` (KPI `…`, buttons
  disabled). Effect now re-arms `mounted` on mount.

Rules carried over from §1: no fabricated numbers — every figure above comes from an API
field or is computed from API fields; `TRAIN RUNS TODAY` is not shown because
`/api/gov/railway-live` returns no train counts (P2, skipped).

Verification (2026-09-27): `pytest` 25 passed · `tsc --noEmit` clean · `npm run build` ok ·
Playwright `verify3.js` 13 PASS / 0 FAIL, `PAGE_ERRORS=0` (dashboard, Run AI Analysis, recommendation
approve end-to-end, weekly Builds-on line).
