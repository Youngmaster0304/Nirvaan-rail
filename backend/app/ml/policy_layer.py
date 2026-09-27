import logging
from typing import Dict, Any, Tuple, List

logger = logging.getLogger(__name__)

class PolicyLayer:
    """Rule-based safety overrides (TRANSPARENT, logged)."""
    
    SAFETY_RULES = [
        {
            "name": "RAIL_FRACTURE",
            "condition": lambda t: "fracture" in str(t.get("defect_type", "")).lower(),
            "override_score": 100.0,
            "reason": "Rail fracture is an absolute safety priority per Railway Board guidelines"
        },
        {
            "name": "CRITICAL_SEVERITY",
            "condition": lambda t: str(t.get("defect_severity")).upper() == "CRITICAL",
            "min_score": 95.0,
            "reason": "Critical severity defects require immediate attention"
        },
        {
            "name": "OHE_STATION_PROXIMITY",
            "condition": lambda t: str(t.get("asset_type")).upper() == "OHE" and str(t.get("section_criticality")).upper() == "JUNCTION",
            "min_score": 90.0,
            "reason": "OHE damage near junction can cascade delays"
        },
        {
            "name": "EXTREME_OVERDUE",
            "condition": lambda t: int(t.get("days_overdue", 0)) > 90,
            "min_score": 85.0,
            "reason": "Task is extremely overdue (>90 days)"
        },
        {
            "name": "INTERLOCKING_FAULT",
            "condition": lambda t: "interlocking" in str(t.get("defect_type", "")).lower(),
            "min_score": 92.0,
            "reason": "Interlocking faults severely compromise route safety"
        },
        {
            "name": "SIGNAL_FAILURE_MAINLINE",
            "condition": lambda t: "signal failure" in str(t.get("defect_type", "")).lower() and str(t.get("section_criticality")).upper() == "MAINLINE",
            "min_score": 88.0,
            "reason": "Signal failure on mainline halts major traffic"
        }
    ]

    @classmethod
    def apply_policy(cls, task: Dict[str, Any], ml_score: float) -> Tuple[float, List[str]]:
        """Applies overrides and returns (final_score, list_of_applied_rules)."""
        final_score = ml_score
        applied_rules = []
        
        for rule in cls.SAFETY_RULES:
            try:
                if rule["condition"](task):
                    if "override_score" in rule:
                        final_score = rule["override_score"]
                        applied_rules.append(rule["reason"])
                        logger.info(f"Policy override: {rule['name']} applied on {task.get('task_id')}. Score set to {final_score}")
                    elif "min_score" in rule and final_score < rule["min_score"]:
                        final_score = rule["min_score"]
                        applied_rules.append(rule["reason"])
                        logger.info(f"Policy min_score: {rule['name']} applied on {task.get('task_id')}. Score boosted to {final_score}")
            except Exception as e:
                logger.error(f"Error applying rule {rule['name']} on task {task.get('task_id')}: {e}")
                
        return final_score, applied_rules
