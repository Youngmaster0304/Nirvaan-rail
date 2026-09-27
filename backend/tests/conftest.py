import pytest
from typing import Dict, Any, List
from fastapi.testclient import TestClient

from app.main import app
from app.optimization.corridor_graph import CorridorGraph

@pytest.fixture
def sample_task() -> Dict[str, Any]:
    return {
        "task_id": "TSK-001",
        "department": "Engineering",
        "source_system": "TMS",
        "asset_type": "Track",
        "section_id": "SEC_1",
        "corridor_id": "DELHI_HOWRAH",
        "corridor_name": "Delhi-Howrah Main Line",
        "defect_type": "Rail Fracture",
        "defect_severity": "CRITICAL",
        "days_overdue": 5,
        "required_duration_min": 120,
        "safety_constraints": ["Track block required"],
        "weather_sensitivity": False,
        "incompatible_with": [],
        "asset_age_years": 10.5,
        "historical_failure_rate": 0.05,
        "section_criticality": "MAINLINE",
        "corridor_traffic_density": 80
    }

@pytest.fixture
def sample_tasks(sample_task) -> List[Dict[str, Any]]:
    tasks = []
    for i in range(10):
        task = sample_task.copy()
        task["task_id"] = f"TSK-00{i}"
        tasks.append(task)
    return tasks

@pytest.fixture
def db_session():
    # Placeholder for a real DB session fixture if needed
    pass

@pytest.fixture
def corridor_graph():
    return CorridorGraph()

@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
