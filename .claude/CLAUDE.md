# SIH26027 AI Block Planning System - Claude AI Guidelines

## Project Context
- **Name**: SIH26027 AI-Powered Automatic Block Planning System
- **Domain**: Indian Railways Infrastructure Maintenance (Engineering, Signal & Telecom, Traction)
- **Architecture**: 4-layer system (Unified Model, Prioritization, Optimization, Interaction)
- **Goal**: Merge maintenance blocks to reduce downtime and ensure safety.

## Tech Stack
- **Backend**: Python 3.13, FastAPI, SQLAlchemy, SQLite, LightGBM, OR-Tools, NetworkX
- **Frontend**: React 18, TypeScript, Vite, TailwindCSS, Zustand
- **Deployment**: Docker, docker-compose

## Core Principles (The "Skills")
1. **Human-in-Command**: AI never auto-approves blocks. AI recommends, human dispatchers approve.
2. **Transparent AI**: Always expose LightGBM SHAP values to the UI so users know *why* a task is prioritized.
3. **Safety First**: Policy overrides (like Rail Fracture) supersede ML scores unconditionally.

## File Organization
- `/backend/app/routers/` - FastAPI endpoints
- `/backend/app/ml/` - LightGBM and policy code
- `/backend/app/optimization/` - OR-Tools CP-SAT models
- `/frontend/src/pages/` - React pages
- `/frontend/src/components/ui/` - Modern Shadcn/UI React components

## Development Commands
- **Backend Dev**: `cd backend && uvicorn app.main:app --reload`
- **Frontend Dev**: `cd frontend && npm run dev`
- **Tests**: `cd backend && pytest tests/ -v`
- **Docker**: `docker-compose up --build`
