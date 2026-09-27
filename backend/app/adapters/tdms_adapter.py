import logging
import random
import uuid
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class TDMSAdapter:
    """
    Mock TDMS (Traction Distribution Management System) API client.
    Handles traction/power defects (OHE faults, catenary issues, transformer maintenance)
    """
    def __init__(self):
        self.system_name = "TDMS"

    def fetch_defects(self) -> List[Dict[str, Any]]:
        logger.info(f"[{self.system_name}] Fetching raw defects...")
        defects = []
        defect_types = ['OHE Fault', 'Catenary Issue', 'Transformer Maintenance', 'Insulator Flashover']
        severities = ['Low', 'Medium', 'High', 'Critical']
        for _ in range(12):
            defects.append({
                "tdms_id": str(uuid.uuid4())[:8],
                "issue": random.choice(defect_types),
                "priority": random.choice(severities),
                "corr_id": random.choice(['COR-001', 'COR-003']),
                "sec_id": random.choice(['SEC-003', 'SEC-004']),
                "duration_min": random.randint(60, 300),
                "asset_age": round(random.uniform(5.0, 40.0), 1),
                "overdue_days": random.randint(0, 60),
                "weather_issue": True
            })
        return defects

    def fetch_overdue_tasks(self) -> List[Dict[str, Any]]:
        return [d for d in self.fetch_defects() if d['overdue_days'] > 20]

    def normalize(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        for raw in raw_data:
            try:
                task = {
                    "task_id": f"TDMS-{raw['tdms_id']}",
                    "department": "Traction",
                    "source_system": self.system_name,
                    "asset_type": "OHE",
                    "section_id": raw.get("sec_id", "UNKNOWN"),
                    "corridor_id": raw.get("corr_id", "UNKNOWN"),
                    "corridor_name": f"Corridor {raw.get('corr_id', 'UNKNOWN')}",
                    "defect_type": raw.get("issue", "Unknown Defect"),
                    "defect_severity": raw.get("priority", "Medium").upper(),
                    "days_overdue": raw.get("overdue_days", 0),
                    "required_duration_min": raw.get("duration_min", 60),
                    "safety_constraints": ["Power Block Required"],
                    "weather_sensitivity": raw.get("weather_issue", True),
                    "incompatible_with": [],
                    "asset_age_years": raw.get("asset_age", 10.0),
                    "historical_failure_rate": random.uniform(0.01, 0.08),
                    "section_criticality": random.choice(["JUNCTION", "MAINLINE", "BRANCH"]),
                    "corridor_traffic_density": random.randint(50, 150),
                    "status": "PENDING"
                }
                normalized.append(task)
            except Exception as e:
                logger.error(f"Failed to normalize TDMS record {raw}: {e}")
        return normalized
