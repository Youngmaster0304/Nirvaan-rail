import logging
from typing import List, Dict, Any, Tuple

logger = logging.getLogger(__name__)

def normalize_task(raw_data: Dict[str, Any], source_system: str) -> Dict[str, Any]:
    """
    General task normalizer - calls the specific adapter's normalizer 
    but we keep this interface as requested.
    Normally this would dispatch to adapter, here we assume it's already adapter-normalized.
    """
    # Assuming data is mostly normalized by the adapter, just validating here
    return raw_data

def validate_task(task_data: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Quality checks.
    Returns (valid, errors)
    """
    errors = []
    
    if not task_data.get("corridor_id") or task_data.get("corridor_id") == "UNKNOWN":
        errors.append("Missing or invalid corridor_id")
        
    if not task_data.get("section_id") or task_data.get("section_id") == "UNKNOWN":
        errors.append("Missing or invalid section_id")
        
    if task_data.get("required_duration_min", 0) <= 0:
        errors.append("Invalid required_duration_min")

    dept = task_data.get("department")
    asset = task_data.get("asset_type")
    
    # Inconsistent asset type for department
    if dept == "Engineering" and asset not in ["Track", "Bridge"]:
        errors.append(f"Inconsistent asset type {asset} for {dept}")
    elif dept == "S&T" and asset not in ["Signal", "Telecom"]:
        errors.append(f"Inconsistent asset type {asset} for {dept}")
    elif dept == "Traction" and asset not in ["OHE", "Substation"]:
        errors.append(f"Inconsistent asset type {asset} for {dept}")
        
    return len(errors) == 0, errors

def quarantine_invalid(tasks: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """Separates valid/invalid tasks."""
    valid = []
    invalid = []
    seen_ids = set()
    
    for task in tasks:
        task_id = task.get("task_id")
        # Duplicate task_id detection
        if task_id in seen_ids:
            task["_errors"] = ["Duplicate task_id"]
            invalid.append(task)
            continue
            
        seen_ids.add(task_id)
        
        is_valid, errors = validate_task(task)
        if is_valid:
            valid.append(task)
        else:
            task["_errors"] = errors
            invalid.append(task)
            
    return valid, invalid
