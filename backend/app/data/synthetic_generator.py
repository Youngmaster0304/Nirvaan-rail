import json
import random
import uuid
import datetime
from pathlib import Path
from typing import Dict, List, Any
import logging

from app.security import hash_password

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def get_password_hash(password: str) -> str:
    return hash_password(password)


DEPARTMENT_BY_SOURCE = {"TMS": "Engineering", "SMMS": "S&T", "TDMS": "Traction"}
ASSET_BY_SOURCE = {"TMS": ["Track", "Bridge"], "SMMS": ["Signal", "Telecom"], "TDMS": ["OHE", "Substation"]}
SEVERITY_BY_URGENCY = {"CRITICAL": "Critical", "HIGH": "High", "MEDIUM": "Medium", "LOW": "Low"}


class SyntheticDataGenerator:
    """Generates synthetic maintenance and operations data for SIH26027."""

    def __init__(self, data_dir: str = None):
        self.data_dir = Path(data_dir) if data_dir else Path(__file__).parent
        self.seed = 42
        random.seed(self.seed)

        self.tms_defects = {
            "Rail Crack": {"prob": 0.15, "duration": (120, 240), "urgency": "CRITICAL"},
            "Worn Rail": {"prob": 0.20, "duration": (180, 360), "urgency": "HIGH"},
            "Ballast Deficiency": {"prob": 0.15, "duration": (240, 360), "urgency": "MEDIUM"},
            "Weld Defect": {"prob": 0.10, "duration": (120, 180), "urgency": "HIGH"},
            "Rail Fracture": {"prob": 0.05, "duration": (180, 360), "urgency": "CRITICAL"},
            "Sleeper Damage": {"prob": 0.15, "duration": (120, 240), "urgency": "MEDIUM"},
            "Track Geometry Defect": {"prob": 0.10, "duration": (60, 120), "urgency": "MEDIUM"},
            "Bridge Inspection Due": {"prob": 0.05, "duration": (180, 300), "urgency": "HIGH"},
            "Level Crossing Repair": {"prob": 0.05, "duration": (120, 240), "urgency": "MEDIUM"},
        }

        self.smms_defects = {
            "Signal Cable Aging": {"prob": 0.20, "duration": (120, 240), "urgency": "MEDIUM"},
            "Relay Failure": {"prob": 0.15, "duration": (60, 120), "urgency": "HIGH"},
            "Signal Lamp Defect": {"prob": 0.15, "duration": (30, 90), "urgency": "MEDIUM"},
            "Interlocking Fault": {"prob": 0.10, "duration": (180, 360), "urgency": "CRITICAL"},
            "Track Circuit Failure": {"prob": 0.15, "duration": (60, 180), "urgency": "HIGH"},
            "Point Machine Defect": {"prob": 0.10, "duration": (120, 240), "urgency": "HIGH"},
            "Cable Route Damage": {"prob": 0.10, "duration": (180, 360), "urgency": "MEDIUM"},
            "Axle Counter Fault": {"prob": 0.05, "duration": (120, 240), "urgency": "HIGH"},
        }

        self.tdms_defects = {
            "OHE Wire Wear": {"prob": 0.20, "duration": (180, 300), "urgency": "HIGH"},
            "Catenary Mast Damage": {"prob": 0.10, "duration": (240, 360), "urgency": "CRITICAL"},
            "Insulator Defect": {"prob": 0.15, "duration": (60, 120), "urgency": "MEDIUM"},
            "Power Block Required": {"prob": 0.20, "duration": (120, 240), "urgency": "MEDIUM"},
            "Transformer Maintenance": {"prob": 0.10, "duration": (180, 300), "urgency": "HIGH"},
            "Contact Wire Replacement": {"prob": 0.10, "duration": (240, 360), "urgency": "CRITICAL"},
            "Foundation Bolt Check": {"prob": 0.10, "duration": (60, 120), "urgency": "LOW"},
            "Dropper Wire Issue": {"prob": 0.05, "duration": (60, 180), "urgency": "MEDIUM"},
        }

        self.users_data = [
            {"emp_id": "EMP-NR-001", "name": "Rajesh Kumar", "role": "Dispatcher", "zone": "Northern Railway", "dept": "TMS", "division": "Allahabad Division"},
            {"emp_id": "EMP-NR-002", "name": "Suresh Sharma", "role": "Maintenance Officer", "zone": "Northern Railway", "dept": "S&T", "division": "Lucknow Division"},
            {"emp_id": "EMP-WR-001", "name": "Priya Patel", "role": "Supervisor", "zone": "Western Railway", "dept": "Traction", "division": "Mumbai Division"},
            {"emp_id": "EMP-HQ-001", "name": "Amit Singh", "role": "Admin", "zone": "Railway Board", "dept": "Planning", "division": "HQ"},
        ]

    def _load_json(self, filename: str) -> List[Dict[str, Any]]:
        path = self.data_dir / filename
        if not path.exists():
            logger.warning(f"{filename} not found at {path}. Returning empty list.")
            return []
        with open(path, "r", encoding="utf-8") as f:
            return json.load(f)

    def generate_users(self) -> List[Dict[str, Any]]:
        hashed = get_password_hash("demo123")
        users = []
        for u in self.users_data:
            users.append({
                "employee_id": u["emp_id"],
                "name": u["name"],
                "role": u["role"],
                "department": u["dept"],
                "zone": u["zone"],
                "division": u["division"],
                "is_active": True,
                "hashed_password": hashed,
            })
        return users

    def _asset_type(self, source: str, defect_name: str) -> str:
        if source == "TMS":
            if "Bridge" in defect_name:
                return "Bridge"
            if "Level Crossing" in defect_name:
                return "Track"
            return "Track"
        if source == "SMMS":
            if "Cable" in defect_name:
                return "Telecom"
            return "Signal"
        if "Transformer" in defect_name or "Power Block" in defect_name:
            return "Substation"
        return "OHE"

    def _section_context(self, corridors: List[Dict[str, Any]]) -> Dict[str, Dict[str, Any]]:
        context: Dict[str, Dict[str, Any]] = {}
        for corr in corridors:
            density = random.randint(140, 200) if corr.get("sections") and corr["sections"][0].get("section_type") == "TRUNK" else random.randint(40, 120)
            for sec in corr["sections"]:
                context[sec["section_id"]] = {
                    "corridor_id": corr["corridor_id"],
                    "corridor_name": corr.get("corridor_name", corr["corridor_id"]),
                    "criticality": random.choices(
                        ["JUNCTION", "MAINLINE", "BRANCH"], weights=[35, 50, 15], k=1
                    )[0],
                    "traffic_density": density,
                }
        return context

    def generate_tasks(self, corridors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        tasks = []
        context = self._section_context(corridors)
        all_sections = []
        for corr in corridors:
            for sec in corr["sections"]:
                all_sections.append(sec)

        if not all_sections:
            return []

        def get_defect(defect_dict):
            keys = list(defect_dict.keys())
            probs = [defect_dict[k]["prob"] for k in keys]
            chosen = random.choices(keys, weights=probs, k=1)[0]
            return chosen, defect_dict[chosen]

        task_counts = {"TMS": 200, "SMMS": 150, "TDMS": 150}
        defect_dicts = {"TMS": self.tms_defects, "SMMS": self.smms_defects, "TDMS": self.tdms_defects}
        today = datetime.date.today()

        for source, count in task_counts.items():
            for i in range(count):
                section = random.choice(all_sections)
                sec_ctx = context[section["section_id"]]
                defect_name, defect_info = get_defect(defect_dicts[source])

                days_overdue = min(int(random.expovariate(1 / 30)), 120)
                duration_min = random.randint(defect_info["duration"][0], defect_info["duration"][1])

                status = random.choices(
                    ["PENDING", "APPROVED", "MERGED", "COMPLETED"], weights=[80, 10, 5, 5], k=1
                )[0]

                safety_constraints = []
                if source == "TDMS" or "Power Block" in defect_name:
                    safety_constraints.append("POWER_BLOCK_REQUIRED")
                if defect_info["urgency"] == "CRITICAL":
                    safety_constraints.append("SPEED_RESTRICTION_REQUIRED")
                if random.random() < 0.2:
                    safety_constraints.append("NO_ADJACENT_BLOCKS")

                due_date = (
                    today - datetime.timedelta(days=days_overdue)
                    if days_overdue > 0
                    else today + datetime.timedelta(days=random.randint(0, 30))
                )

                tasks.append({
                    "task_id": f"{source}-2026-{i + 1:04d}",
                    "source_system": source,
                    "department": DEPARTMENT_BY_SOURCE[source],
                    "asset_type": self._asset_type(source, defect_name),
                    "section_id": section["section_id"],
                    "corridor_id": sec_ctx["corridor_id"],
                    "corridor_name": sec_ctx["corridor_name"],
                    "defect_type": defect_name,
                    "defect_severity": SEVERITY_BY_URGENCY[defect_info["urgency"]],
                    "days_overdue": days_overdue,
                    "due_date": due_date,
                    "required_duration_min": duration_min,
                    "safety_constraints": safety_constraints,
                    "weather_sensitivity": source == "TDMS" or "Bridge" in defect_name,
                    "incompatible_with": [],
                    "asset_age_years": round(max(1.0, min(60.0, random.gauss(20, 10))), 1),
                    "historical_failure_rate": round(random.uniform(0.01, 0.5), 3),
                    "section_criticality": sec_ctx["criticality"],
                    "corridor_traffic_density": sec_ctx["traffic_density"],
                    "status": status,
                    "created_at": datetime.datetime.now() - datetime.timedelta(days=days_overdue),
                })

        for t in tasks:
            if random.random() < 0.1:
                other = random.choice(tasks)
                if other["task_id"] != t["task_id"]:
                    t["incompatible_with"] = [other["task_id"]]

        return tasks

    def generate_trains(self, corridors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        trains = []
        types = [
            ("Rajdhani Express", 6), ("Shatabdi Express", 5), 
            ("Duronto Express", 6), ("Superfast Express", 4), 
            ("Mail", 3), ("Passenger", 2), ("Freight", 1)
        ]
        
        for i in range(50):
            t_type, priority = random.choice(types)
            corr = random.choice(corridors)
            source_sec = corr["sections"][0]
            dest_sec = corr["sections"][-1]
            
            # Simple random timetable
            start_hour = random.randint(0, 23)
            start_minute = random.randint(0, 59)
            
            trains.append({
                "train_number": f"{12000 + i}",
                "train_name": f"{source_sec['from_name']} - {dest_sec['to_name']} {t_type}",
                "corridor_id": corr["corridor_id"],
                "type": t_type.split()[0].upper(),
                "priority": priority,
                "departure_time": f"{start_hour:02d}:{start_minute:02d}",
                "running_days": random.choice([
                    ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                    ["Mon", "Wed", "Fri"],
                    ["Tue", "Thu", "Sat"],
                    ["Sun"]
                ])
            })
        return trains

    def generate_kpis(self, corridors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        kpis = []
        base_date = datetime.date.today() - datetime.timedelta(days=30)
        
        for corr in corridors:
            for day in range(30):
                current_date = base_date + datetime.timedelta(days=day)
                punctuality = round(random.uniform(70.0, 95.0), 2)
                reliability = round(random.uniform(60.0, 90.0), 2)
                productivity = round(random.uniform(40.0, 75.0), 2)
                failure_rate = round(random.uniform(0.01, 0.15), 3)
                
                composite = (punctuality * 0.4) + (reliability * 0.3) + (productivity * 0.3)
                
                kpis.append({
                    "corridor_id": corr["corridor_id"],
                    "date": current_date.isoformat(),
                    "punctuality_pct": punctuality,
                    "block_reliability_pct": reliability,
                    "block_productivity_pct": productivity,
                    "asset_failure_rate": failure_rate,
                    "composite_score": round(composite, 2)
                })
        return kpis

    def generate_all(self) -> Dict[str, Any]:
        logger.info("Generating synthetic data...")
        corridors = self._load_json("corridors.json")
        stations = self._load_json("stations.json")
        
        data = {
            "stations": stations,
            "corridors": corridors,
            "users": self.generate_users(),
            "tasks": self.generate_tasks(corridors),
            "trains": self.generate_trains(corridors),
            "kpis": self.generate_kpis(corridors)
        }
        
        logger.info(f"Generated {len(data['users'])} users.")
        logger.info(f"Generated {len(data['tasks'])} maintenance tasks.")
        logger.info(f"Generated {len(data['trains'])} trains.")
        logger.info(f"Generated {len(data['kpis'])} KPI records.")
        
        return data

    async def seed_database(self, session):
        """Seeds users, corridors, sections, KPIs and tasks. Idempotent, only fills empty tables."""
        from app.data.seed import seed_database as run_seed
        return await run_seed(session)

if __name__ == "__main__":
    generator = SyntheticDataGenerator()
    result = generator.generate_all()
    print("\n--- Summary Statistics ---")
    print(f"Total Corridors: {len(result['corridors'])}")
    print(f"Total Stations: {len(result['stations'])}")
    print(f"Total Users: {len(result['users'])}")
    print(f"Total Tasks: {len(result['tasks'])}")
    
    # Task breakdown
    tms_count = sum(1 for t in result['tasks'] if t['source_system'] == 'TMS')
    smms_count = sum(1 for t in result['tasks'] if t['source_system'] == 'SMMS')
    tdms_count = sum(1 for t in result['tasks'] if t['source_system'] == 'TDMS')
    print(f"  - TMS Tasks: {tms_count}")
    print(f"  - SMMS Tasks: {smms_count}")
    print(f"  - TDMS Tasks: {tdms_count}")
    
    print(f"Total Trains: {len(result['trains'])}")
    print(f"Total KPI Records: {len(result['kpis'])}")
