# SIH26027 Frontend — AI Block Planning Portal

Official Indian Railways / CRIS-compliant Web Portal for Problem Statement **SIH26027: AI-Powered Automatic Block Planning System**.

> 🚀 **Live Production Portal**: [https://nirvaan-rail.vercel.app](https://nirvaan-rail.vercel.app)  
> 🌐 **Live Backend API**: [https://nirvaan-f4oi.onrender.com](https://nirvaan-f4oi.onrender.com)

## Quick Start
```bash
cd frontend
npm install
npm run dev
# Opens at http://localhost:5173
```

## Design Philosophy & Compliance
Styled strictly in accordance with **GIGW 3.0 (Guidelines for Indian Government Websites)** and official Indian Railways / CRIS design standards:
- **Palette**: Official Railway Navy (`#002D62`), Crisp Slate Canvas (`#DDE4EF`), Saffron (`#FF9933`), and India Green (`#138808`).
- **Typography & Structure**: High-density operational data tables, monospace block codes, and official bilingual headers (English + Hindi).
- **Accessibility**: High-contrast mode, text size increment/decrement controls, screen reader landmarks, and full keyboard navigation.
- **Glassmorphism & Depth**: Frosted scrim backdrops (`backdrop-blur-md bg-[#001128]/45`) on all modal dialogs and slide-out explainability drawers.

---

## Core Pages & Workbenches

1. **Dashboard (`/`)**: High-level executive overview, 5 critical operational KPIs, active block counts, and departmental distribution.
2. **Task Prioritization (`/tasks`)**: Paginated multi-department task inbox with LightGBM priority scores, policy overrides, and slide-out **SHAP Explainability Drawer**.
3. **Block Planning (`/planning`)**: Multi-department optimization interface with AI Suggestion modal, interactive Gantt chart, and clickable task inspector popup.
4. **Weekly Plan (`/weekly`)**: 7-day rolling maintenance block schedule with corridor filters and dispatch readiness checks.
5. **Monthly Plan (`/monthly`)**: 30-day macro-planning horizon for major track renewals (TSR/CTR) and overhead equipment (OHE) maintenance.
6. **Impact Simulation (`/simulation`)**: Counterfactual with-AI vs. without-AI comparison measuring punctuality impact and speed restriction savings.
7. **Corridor Map (`/map`)**: GIS spatial network topology using Leaflet.js with interactive station markers and section health statuses.
8. **Audit Trail (`/audit`)**: CAG-compliant immutable action log tracking controller approvals, manual overrides, and system-generated plans.
9. **Reports (`/reports`)**: One-click PDF (`jsPDF`) and Excel (`xlsx`) report generator for official statutory railway filings.
10. **Login Portal (`/login`)**: CRIS GIGW 3.0 login page with 4 official role personas (`Chief Controller`, `Section Engineer`, `Dispatcher`, `Safety Auditor`) and one-click instant demo access.
11. **Statutory Pages**: Complete GIGW-required legal pages — Disclaimer (`/disclaimer`), Terms of Use (`/terms`), Privacy Policy (`/privacy`), RTI Act 2005 (`/rti`), Site Map (`/sitemap`), Help & Guidelines (`/help`), and Contact Directory (`/contact`).

---

## Key Components

- **`<GovtHeader />`**: Ashoka Lion Capital emblem, Ministry of Railways / CRIS branding, live IST clock, and Tiranga accent stripe.
- **`<GovtNavbar />`**: Unified portal navigation bar with top-level tabs, active route indicators, role badges, and English/Hindi language toggle.
- **`<GovtFooter />`**: Official statutory links, copyright notice, and GIGW accessibility toolbar.
- **`<ShapDrawer />` & `<SHAPExplanation />`**: Explainable AI drawer featuring clean waterfall charts and factor delta tables.
- **`<BlockGantt />` & `<TaskModal />`**: Interactive visual timeline with clickable task inspector modal showing crew, equipment, and train impact.
- **`<ChatDrawer />`**: Floating AI Railway Assistant grounded in live database queries and data.gov.in datasets.
- **`<ApprovalModal />`**: Controller sign-off modal with frosted glass blur effect (`backdrop-blur-md`).

---

## Tech Stack
- **Framework**: React 18 + TypeScript (Vite 5)
- **Styling**: TailwindCSS with official government color palette
- **Data Visualization**: Recharts (waterfall & metrics), Leaflet.js (GIS corridor maps)
- **State Management**: Zustand (client & session state), TanStack Query (server caching)
- **Internationalization**: `react-i18next` (English & Hindi)
- **Export Engines**: `jspdf`, `jspdf-autotable`, `xlsx`

---

## Production Deployment (Vercel)
- **Live Portal URL**: [https://nirvaan-rail.vercel.app](https://nirvaan-rail.vercel.app)
- **Built automatically** from the repository root via `vercel.json`:
  - **Build Command**: `npm --prefix frontend run build`
  - **Output Directory**: `frontend/dist`
  - **Backend API**: Connects to live Render backend (`https://nirvaan-f4oi.onrender.com`) via `VITE_API_URL`.
