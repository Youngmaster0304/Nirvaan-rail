import pandas as pd
from typing import Dict, Any, List

FEATURE_NAMES = [
    'defect_severity_encoded',
    'days_overdue',
    'days_overdue_normalized',
    'section_criticality_encoded',
    'asset_age_years',
    'historical_failure_rate',
    'corridor_traffic_density',
    'weather_risk',
    'department_encoded',
    'required_duration_hours',
    'safety_constraint_count',
    'has_incompatible_tasks'
]

def extract_features(task: Dict[str, Any]) -> Dict[str, float]:
    """Extract features from a single task dict."""
    severity_map = {'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1}
    severity_encoded = severity_map.get(str(task.get('defect_severity')).upper(), 1)
    
    days_overdue = int(task.get('days_overdue', 0))
    # Cap at 365 days for normalization
    days_overdue_normalized = min(days_overdue / 365.0, 1.0)
    
    criticality_map = {'JUNCTION': 3, 'MAINLINE': 2, 'BRANCH': 1}
    criticality_encoded = criticality_map.get(str(task.get('section_criticality')).upper(), 1)
    
    dept_map = {'ENGINEERING': 1, 'S&T': 2, 'TRACTION': 3}
    department_encoded = dept_map.get(str(task.get('department')).upper(), 1)
    
    # Weather risk (simplified proxy for current monsoon season)
    weather_risk = 1.0 if task.get('weather_sensitivity', False) else 0.0
    
    duration_hours = float(task.get('required_duration_min', 60)) / 60.0
    
    constraints = task.get('safety_constraints', [])
    safety_constraint_count = len(constraints) if isinstance(constraints, list) else 0
    
    incompat = task.get('incompatible_with', [])
    has_incompatible_tasks = 1.0 if (isinstance(incompat, list) and len(incompat) > 0) else 0.0
    
    features = {
        'defect_severity_encoded': float(severity_encoded),
        'days_overdue': float(days_overdue),
        'days_overdue_normalized': float(days_overdue_normalized),
        'section_criticality_encoded': float(criticality_encoded),
        'asset_age_years': float(task.get('asset_age_years', 5.0)),
        'historical_failure_rate': float(task.get('historical_failure_rate', 0.0)),
        'corridor_traffic_density': float(task.get('corridor_traffic_density', 50.0)),
        'weather_risk': weather_risk,
        'department_encoded': float(department_encoded),
        'required_duration_hours': duration_hours,
        'safety_constraint_count': float(safety_constraint_count),
        'has_incompatible_tasks': has_incompatible_tasks
    }
    
    return features

def extract_features_batch(tasks: List[Dict[str, Any]]) -> pd.DataFrame:
    """Extract features for a batch of tasks into a pandas DataFrame."""
    features_list = [extract_features(t) for t in tasks]
    df = pd.DataFrame(features_list)
    # Ensure correct column order
    for col in FEATURE_NAMES:
        if col not in df.columns:
            df[col] = 0.0
    return df[FEATURE_NAMES]
