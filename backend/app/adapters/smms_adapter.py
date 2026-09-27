import logging
import random
import uuid
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class SMMSAdapter:
    """
    Mock SMMS (Signal Maintenance Management System) API client.
    Handles S&T defects (signal failures, cable aging, relay faults)
    """
    def __init__(self):
        self.system_name = "SMMS"

    def fetch_defects(self) -> List[Dict[str, Any]]:
        logger.info(f"[{self.system_name}] Fetching raw defects...")
        defects = []
        defect_types = ['Signal Failure', 'Cable Aging', 'Relay Fault', 'Interlocking Fault']
        severities = ['Low', 'Medium', 'High', 'Critical']
        for _ in range(10):
            defects.append({
                "smms_ref": str(uuid.uuid4())[:8],
                "fault_desc": random.choice(defect_types),
                "severity_level": random.choice(severities),
                "corridor": random.choice(['COR-001', 'COR-002']),
                "section": random.choice(['SEC-001', 'SEC-002']),
                "repair_time": random.randint(45, 180),
                "equipment_age": round(random.uniform(2.0, 15.0), 1),
                "delay_days": random.randint(0, 50),
                "rain_sensitive": random.choice([True, False])
            })
        return defects

    def fetch_overdue_tasks(self) -> List[Dict[str, Any]]:
        return [d for d in self.fetch_defects() if d['delay_days'] > 15]

    def normalize(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        normalized = []
        for raw in raw_data:
            try:
                task = {
                    "task_id": f"SMMS-{raw['smms_ref']}",
                    "department": "S&T",
                    "source_system": self.system_name,
                    "asset_type": "Signal",
                    "section_id": raw.get("section", "UNKNOWN"),
                    "corridor_id": raw.get("corridor", "UNKNOWN"),
                    "corridor_name": f"Corridor {raw.get('corridor', 'UNKNOWN')}",
                    "defect_type": raw.get("fault_desc", "Unknown Defect"),
                    "defect_severity": raw.get("severity_level", "Medium").upper(),
                    "days_overdue": raw.get("delay_days", 0),
                    "required_duration_min": raw.get("repair_time", 60),
                    "safety_constraints": ["Signal Disconnection Required"],
                    "weather_sensitivity": raw.get("rain_sensitive", False),
                    "incompatible_with": [],
                    "asset_age_years": raw.get("equipment_age", 5.0),
                    "historical_failure_rate": random.uniform(0.02, 0.15),
                    "section_criticality": random.choice(["JUNCTION", "MAINLINE", "BRANCH"]),
                    "corridor_traffic_density": random.randint(50, 150),
                    "status": "PENDING"
                }
                normalized.append(task)
            except Exception as e:
                logger.error(f"Failed to normalize SMMS record {raw}: {e}")
        return normalized
