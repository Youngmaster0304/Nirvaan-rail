# SIH26027 Backend — AI Block Planning Engine

## Architecture
The backend follows a robust 4-layer architecture to handle the complexities of railway operations:

1. **Data Ingestion Layer**: Syncs and normalizes data from TMS, SMMS, and TDMS.
2. **AI Prioritization Layer**: Uses LightGBM and SHAP for scoring tasks based on severity, criticality, and historical data, applying manual rules via a Policy Layer.
3. **CP-SAT Optimization Layer**: Groups compatible tasks, avoids conflict across departments, and proposes multi-department maintenance blocks using OR-Tools.
4. **API / Presentation Layer**: Exposes secure REST endpoints via FastAPI for the frontend portal.

## Quick Start

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Service health check |
| GET | `/api/tasks` | Get list of maintenance tasks |
| POST | `/api/prioritize` | Trigger AI prioritization |
| GET | `/api/corridors` | Get corridor topology |
| GET | `/api/audit` | View audit logs |

## Project Structure
```
backend/
├── app/
│   ├── ml/             # Feature extraction and Policy logic
│   ├── models/         # SQLAlchemy DB models
│   ├── optimization/   # CP-SAT and Graph logic
│   ├── routers/        # FastAPI endpoints
│   ├── schemas/        # Pydantic validation
│   ├── services/       # Core business logic
│   └── main.py         # Application entrypoint
├── tests/              # Pytest unit tests
└── requirements.txt
```

## Tech Stack
- **Web**: FastAPI
- **Database**: SQLAlchemy, SQLite (for prototyping)
- **AI/ML**: LightGBM, SHAP, Pandas
- **Optimization**: OR-Tools (CP-SAT solver), NetworkX

## How Each SIH26027 Pillar is Satisfied
- **Data Integration**: Extensible models handling Engineering, S&T, and Traction data uniformly.
- **AI Prioritization**: Custom feature extraction coupled with LightGBM models.
- **Conflict Resolution**: NetworkX graph for topology & CP-SAT constraints.
- **Human-in-Command**: SHAP explanations in responses; endpoints only recommend actions for human approval.

## Running Tests
```bash
python -m pytest tests/ -v
```

## Sample API Outputs
```json
{
  "task_id": "TSK-1001",
  "status": "Pending",
  "priority_score": 0.95,
  "shap_values": {"defect_severity": 0.5, "days_overdue": 0.2}
}
```
