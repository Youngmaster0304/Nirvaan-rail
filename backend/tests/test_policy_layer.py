import pytest
from app.ml.policy_layer import PolicyLayer

def test_rail_fracture_override(sample_task):
    sample_task["defect_type"] = "severe rail fracture detected"
    score, rules = PolicyLayer.apply_policy(sample_task, 50.0)
    assert score == 100.0
    assert len(rules) > 0

def test_critical_severity(sample_task):
    sample_task["defect_severity"] = "CRITICAL"
    sample_task["defect_type"] = "routine check"
    score, rules = PolicyLayer.apply_policy(sample_task, 80.0)
    assert score >= 95.0
    
def test_extreme_overdue(sample_task):
    sample_task["days_overdue"] = 100
    sample_task["defect_severity"] = "LOW"
    sample_task["defect_type"] = "routine check"
    score, rules = PolicyLayer.apply_policy(sample_task, 40.0)
    assert score == 85.0

def test_no_override(sample_task):
    sample_task["defect_severity"] = "LOW"
    sample_task["defect_type"] = "minor issue"
    sample_task["days_overdue"] = 5
    score, rules = PolicyLayer.apply_policy(sample_task, 65.0)
    assert score == 65.0
    assert len(rules) == 0

def test_multiple_rules(sample_task):
    sample_task["defect_type"] = "rail fracture"
    sample_task["defect_severity"] = "CRITICAL"
    sample_task["days_overdue"] = 100
    score, rules = PolicyLayer.apply_policy(sample_task, 50.0)
    assert score == 100.0
    assert len(rules) >= 1
