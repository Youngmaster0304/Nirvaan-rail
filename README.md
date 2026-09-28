# SIH26027 — AI-Powered Automatic Block Planning System
# Smart India Hackathon 2026

> **Problem Statement ID**: 26027 | **Organization**: Ministry of Railways | **Category**: Software
>
> 🌐 **Live Backend (Render)**: [https://nirvaan-f4oi.onrender.com](https://nirvaan-f4oi.onrender.com)  
> 📑 **Interactive API Docs (Swagger)**: [https://nirvaan-f4oi.onrender.com/docs](https://nirvaan-f4oi.onrender.com/docs)  
> 💻 **GitHub Repository**: [Youngmaster0304/sih26027-a-abps](https://github.com/Youngmaster0304/sih26027-a-abps)

## Problem Statement
The Indian Railways executes massive track maintenance across Engineering (TMS), Signal & Telecom (SMMS), and Traction (TDMS) departments. Currently, maintenance planning is siloed, leading to redundant track closures, suboptimal block durations, and schedule conflicts. Problem statement SIH26027 requires an AI-driven system to harmonize tasks across departments and optimize block planning while retaining the Human-in-Command principle.

## Solution Overview
We have engineered a 4-layer AI planning system that integrates cross-departmental data, prioritizes critical tasks using Machine Learning, resolves topological conflicts, and merges compatible tasks using constraint programming.

1. **Ingestion Layer**: Merges TMS, SMMS, TDMS tasks into a unified task model
2. **Prioritization Layer**: LightGBM scores task severity while Policy Layer enforces absolute safety rules
3. **Optimization Layer**: OR-Tools models tasks as constraints on a NetworkX spatial graph
4. **Interaction Layer**: A React frontend offering clear, explainable AI recommendations (via SHAP) for human approval

## Quick Start

### Option 1: Docker (Recommended)

```bash
# Clone and start everything with one command
docker-compose up --build

# Frontend: http://localhost:3000
# Backend API: http://localhost:8000
# API Docs: http://localhost:8000/docs
```

### Option 2: Manual Setup

```bash
# Terminal 1: Backend
cd backend
python -m venv venv
venv\Scripts\activate          # Windows
# source venv/bin/activate     # Linux/Mac
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Terminal 2: Frontend
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

### Demo Login Personas
| Employee ID | Password | Role | Department / Zone |
|---|---|---|---|
| `EMP-NR-001` | `demo123` | Chief Controller (CPTM) | Operating / Northern Railway |
| `EMP-NCR-204` | `demo123` | Section Engineer (SSE) | Engineering (P-Way) / NCR |
| `EMP-WR-102` | `demo123` | Traffic Dispatcher | Operations / Western Railway |
| `EMP-CRS-088` | `demo123` | Safety Auditor (CRS) | Safety / Railway Board |

> 💡 **Quick Access**: The login page also features an **⚡ Instant Demo Access** button that preloads a verified session without requiring manual credentials.

## Architecture Diagram
```mermaid
graph TD
    subgraph Data Sources
        TMS[TMS - Engineering]
        SMMS[SMMS - Signal & Telecom]
        TDMS[TDMS - Traction]
        COA[COA - Control Office]
    end

    subgraph Layer 1 - Unified Task Model
        ADAPT[API Adapters]
        NORM[Normalizer + Quality Checks]
    end

    subgraph Layer 2 - AI Prioritization
        FE[Feature Engineering]
        LGBM[LightGBM Model]
        SHAP[SHAP Explainer]
        POLICY[Policy Override Layer]
    end

    subgraph Layer 3 - Optimization
        NX[NetworkX Corridor Graph]
        MERGE[Task Merger]
        CPSAT[OR-Tools CP-SAT Solver]
    end

    subgraph Layer 4 - Human-in-Command
        SIM[Impact Simulator]
        EXPLAIN[Explainability Engine]
        AUDIT[Audit Trail]
    end

    TMS & SMMS & TDMS --> ADAPT --> NORM
    COA --> NORM
    NORM --> FE --> LGBM --> SHAP
    LGBM --> POLICY
    POLICY --> MERGE
    NX --> MERGE --> CPSAT
    CPSAT --> SIM --> EXPLAIN
    EXPLAIN --> AUDIT
    AUDIT --> UI[React Government Portal]
```

## Tech Stack
| Layer | Technology |
|-------|-----------|
| **Backend API** | FastAPI, Pydantic v2, SQLAlchemy 2.0, SQLite |
| **ML Prioritization** | LightGBM, SHAP, scikit-learn |
| **Optimization** | Google OR-Tools (CP-SAT), NetworkX |
| **Frontend** | React 18, TypeScript, Vite, TailwindCSS |
| **State Management** | Zustand, TanStack Query |
| **Visualization** | Recharts, Leaflet.js (maps), Plotly |
| **i18n** | react-i18next (English + Hindi) |
| **Export** | jsPDF, xlsx (Excel) |
| **Deployment** | Docker, docker-compose, nginx |

## Features
- ✅ **Unified Multi-Departmental Ingestion**: 500+ tasks normalized across TMS (Civil), SMMS (Signals), and TDMS (Traction)
- ✅ **Machine Learning Prioritization**: LightGBM scoring engine trained on defect severity, line capacity, and overdue metrics
- ✅ **Explainable AI (SHAP Waterfall)**: Interactive factor breakdown drawer explaining why tasks are prioritized with exact positive/negative contributions
- ✅ **Policy Override Safety Layer**: Absolute safety rules (e.g. rail fractures, critical signal failures) bypass ML black-box scoring
- ✅ **CP-SAT Optimization & Block Merging**: Google OR-Tools merges compatible cross-department tasks to minimize overall track closures
- ✅ **Spatial Corridor Topology**: NetworkX corridor graph modeling tracks, sections, stations, and directional dependencies
- ✅ **Figma-Aligned Block Planning**: Interactive Gantt timeline with clickable task inspector modal and live operational KPIs
- ✅ **Multi-Time-Horizon Planning**: Dedicated Weekly (`/weekly`) and Monthly (`/monthly`) planning workbenches
- ✅ **Counterfactual Impact Simulation**: Side-by-side with-AI vs. without-AI comparison (punctuality impact, speed restriction savings)
- ✅ **AI Railway Assistant Chatbot**: Integrated conversational assistant grounded in live database queries, Railway Board rules, and data.gov.in datasets
- ✅ **Official CRIS / Indian Railways GIGW 3.0 Theme**: Authentic government aesthetic (`#002D62`, `#DDE4EF`), Ashoka Chakra emblem, live IST clock
- ✅ **Frosted Glassmorphism & Scrim Blur**: `backdrop-blur-md` background effects on all modal and drawer scrims
- ✅ **CAG-Compliant Immutable Audit Trail**: Role-based action logging capturing user approvals, modifications, and system overrides
- ✅ **Bilingual Support & Accessibility**: English + Hindi localization (`react-i18next`), high-contrast toggle, font size scalers
- ✅ **Official Statutory Export**: One-click PDF and Excel `.xlsx` report generation for field engineers and controllers

## SIH26027 Pillars Addressed
| Pillar | Implementation |
|--------|---------------|
| **A. Multi-Departmental Integration** | Unified Task Model normalizes TMS/SMMS/TDMS data into common schema |
| **B. AI/ML Prioritization** | LightGBM + SHAP + Policy Layer — hybrid approach, never pure black-box |
| **C. Optimized Block Scheduling** | OR-Tools CP-SAT minimizes downtime, maximizes task merging |
| **D. Multi-Time-Horizon Planning** | Weekly (7-day) and Monthly (30-day) plan generators |

## Project Structure
```
sih-railway-ps/
├── docker-compose.yml          # One-command deployment
├── .env.example                # Environment configuration
├── README.md                   # This file
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   └── app/
│       ├── main.py             # FastAPI entry point
│       ├── config.py           # Settings
│       ├── database.py         # SQLAlchemy setup
│       ├── models/             # ORM models
│       ├── schemas/            # Pydantic schemas
│       ├── routers/            # API endpoints
│       ├── adapters/           # TMS/SMMS/TDMS/COA mock clients
│       ├── services/           # Business logic
│       ├── ml/                 # LightGBM + SHAP + Policy
│       ├── optimization/       # OR-Tools + NetworkX
│       ├── simulation/         # Impact simulator
│       └── data/               # Synthetic data + corridors
└── frontend/
    ├── Dockerfile
    ├── nginx.conf
    ├── package.json
    └── src/
        ├── App.tsx             # Main app with routing
        ├── components/         # 17 reusable govt-style components
        ├── pages/              # 11 full pages
        ├── services/           # API client + mock data
        ├── store/              # Zustand state management
        ├── hooks/              # TanStack Query hooks
        ├── types/              # TypeScript interfaces
        ├── utils/              # Formatters, export utilities
        └── i18n/               # English + Hindi translations
```

## API Endpoints

All endpoints are live and covered by `backend/tests`. Authenticate with
`POST /api/auth/login`, then send `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | JWT auth — verifies the bcrypt password against `users` |
| GET | `/api/auth/me` | Current user from the token |
| GET | `/api/tasks` | Paginated tasks (filter by department, severity, status, corridor) |
| POST | `/api/tasks` | Create a task |
| GET | `/api/tasks/{id}` | Single task |
| POST | `/api/tasks/bulk-action` | Approve / reject many tasks |
| POST | `/api/prioritize` | LightGBM scoring + policy overrides, persists scores |
| GET | `/api/prioritize/results` | Tasks ranked by `priority_score` |
| GET | `/api/prioritize/shap/{task_id}` | SHAP factor contributions for one task |
| POST | `/api/optimize/weekly` | Weekly CP-SAT plan (merger → solver → `block_plans`) |
| POST | `/api/optimize/monthly` | Monthly plan |
| GET | `/api/optimize/plans` | List generated plans |
| GET | `/api/optimize/plans/{plan_id}` | Plan detail with blocks |
| POST | `/api/simulate` | With-AI vs without-AI impact simulation |
| GET | `/api/simulate/results/{plan_id}` | Cached simulation result |
| GET | `/api/audit` | Audit trail (filter by action, entity, date) |
| POST | `/api/approve` | Approve a block plan + audit entry |
| POST | `/api/reject` | Reject a block plan + audit entry |
| GET | `/api/corridors` | Corridors with sections |
| GET | `/api/corridors/kpis` | Corridor KPI register |
| GET | `/api/corridors/{id}/topology` | Station/section graph for the map |
| POST | `/api/reports/generate` | Report generation (`productivity`, `utilization`, `health`, `overdue`, `accuracy`) |
| GET | `/api/chat` | Chatbot suggested prompts |
| POST | `/api/chat` | Chatbot — answers grounded in live DB facts |
| GET | `/api/gov/datasets` | Available government open-data datasets |
| GET | `/api/gov/railway-live` | Government/railway data with 3-tier fallback |
| GET | `/api/health` | Health check |

### Chatbot
`POST /api/chat` takes `{message, history}` and returns `{reply, source, data}`.
`source` is `db` (answered from a live query), `rules` (deterministic intent +
policy answer) or `llm`. It works with **no API key configured** — set
`OPENAI_API_KEY` or `GEMINI_API_KEY` to let an LLM phrase the answer using the
same verified facts. An LLM failure always falls back to the rule answer.

### Government data
`GET /api/gov/railway-live?dataset=<key>` degrades in three tiers so a demo
never fails: bundled snapshot → keyless live source → data.gov.in (requires a
free `DATA_GOV_IN_API_KEY`). The response reports which tier answered in `source`
and explains any fallback in `note`.

## Deployment

### Backend → Render (Live)
- **Live Service URL**: `https://nirvaan-f4oi.onrender.com`
- **Health Check**: [https://nirvaan-f4oi.onrender.com/api/health](https://nirvaan-f4oi.onrender.com/api/health)
- **Swagger Documentation**: [https://nirvaan-f4oi.onrender.com/docs](https://nirvaan-f4oi.onrender.com/docs)

**Deployment Steps**:
1. Push this repository to GitHub (`main` branch).
2. On Render: **New → Blueprint** → select `Youngmaster0304/sih26027-a-abps`. The `render.yaml` specification will auto-provision the FastAPI web service with Python 3.13.
3. Configure `CORS_ORIGINS` in Render environment settings with your Vercel URL (e.g. `https://<app>.vercel.app,http://localhost:5173`).
4. On startup, SQLite automatically seeds 500+ tasks across Civil, Electrical, and Signaling with pre-calculated LightGBM priority scores.

### Frontend → Vercel (Monorepo Zero-Config)
The repository includes a root `vercel.json` and `package-lock.json` configured for seamless monorepo deployment:
- **Root Directory**: `.` (Repository root)
- **Build Command**: `npm --prefix frontend run build`
- **Install Command**: `npm --prefix frontend install`
- **Output Directory**: `frontend/dist`
- **SPA Rewrites**: Handled automatically by `vercel.json` routing all routes to `/index.html`.

**Environment Variables on Vercel**:
- Set `VITE_API_URL` = `https://nirvaan-f4oi.onrender.com` (no trailing slash).
- (For local development, `VITE_API_URL` defaults to using the Vite proxy to `http://localhost:8000`).

### Environment
Copy `.env.example` to `.env`. Every entry has a working default, so an empty
`.env` is enough locally. The optional keys (data.gov.in, OpenAI, Gemini) are
documented inline with free-registration steps.


## License
MIT

