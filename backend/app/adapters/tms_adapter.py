import logging
import random
import uuid
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

class TMSAdapter:
    """
    Mock TMS (Track Management System) API client.
    Handles engineering defects (rail cracks, worn rails, ballast, etc.)
    """
    def __init__(self):
        self.system_name = "TMS"

    def fetch_defects(self) -> List[Dict[str, Any]]:
        """Mock fetching raw engineering defects."""
        logger.info(f"[{self.system_name}] Fetching raw defects...")
        defects = []
        defect_types = ['Rail Fracture', 'Worn Rail', 'Ballast Settlement', 'Sleeper Damage']
        severities = ['Low', 'Medium', 'High', 'Critical']
        corridors = ['COR-001', 'COR-002', 'COR-003']
        sections = ['SEC-001', 'SEC-002', 'SEC-003', 'SEC-004']
        
        for _ in range(15):
            defects.append({
                "tms_id": str(uuid.uuid4())[:8],
                "track_issue": random.choice(defect_types),
                "urgency": random.choice(severities),
                "location_corridor": random.choice(corridors),
                "location_section": random.choice(sections),
                "time_needed_mins": random.randint(30, 240),
                "track_age_yrs": round(random.uniform(1.0, 30.0), 1),
                "days_pending": random.randint(0, 100),
                "weather_sensitive": random.choice([True, False])
            })
        return defects

    def fetch_overdue_tasks(self) -> List[Dict[str, Any]]:
        """Mock fetching overdue maintenance items."""
        return [d for d in self.fetch_defects() if d['days_pending'] > 30]

    def normalize(self, raw_data: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Normalize raw TMS data to unified Task schema."""
        normalized = []
        for raw in raw_data:
            try:
                task = {
                    "task_id": f"TMS-{raw['tms_id']}",
                    "department": "Engineering",
                    "source_system": self.system_name,
                    "asset_type": "Track",
                    "section_id": raw.get("location_section", "UNKNOWN"),
                    "corridor_id": raw.get("location_corridor", "UNKNOWN"),
                    "corridor_name": f"Corridor {raw.get('location_corridor', 'UNKNOWN')}",
                    "defect_type": raw.get("track_issue", "Unknown Defect"),
                    "defect_severity": raw.get("urgency", "Medium").upper(),
                    "days_overdue": raw.get("days_pending", 0),
                    "required_duration_min": raw.get("time_needed_mins", 60),
                    "safety_constraints": ["Requires Track Possession"],
                    "weather_sensitivity": raw.get("weather_sensitive", False),
                    "incompatible_with": [],
                    "asset_age_years": raw.get("track_age_yrs", 5.0),
                    "historical_failure_rate": random.uniform(0.01, 0.1),
                    "section_criticality": random.choice(["JUNCTION", "MAINLINE", "BRANCH"]),
                    "corridor_traffic_density": random.randint(50, 150),
                    "status": "PENDING"
                }
                normalized.append(task)
            except Exception as e:
                logger.error(f"Failed to normalize TMS record {raw}: {e}")
        return normalized
