import pytest
from app.services.normalizer import validate_task, quarantine_invalid

def test_valid_task_passes(sample_task):
    is_valid, errors = validate_task(sample_task)
    assert is_valid is True
    assert len(errors) == 0

def test_missing_corridor_id(sample_task):
    sample_task["corridor_id"] = ""
    is_valid, errors = validate_task(sample_task)
    assert is_valid is False
    assert "Missing or invalid corridor_id" in errors

def test_invalid_section_id(sample_task):
    sample_task["section_id"] = "UNKNOWN"
    is_valid, errors = validate_task(sample_task)
    assert is_valid is False
    assert "Missing or invalid section_id" in errors

def test_quarantine_separation(sample_tasks):
    sample_tasks[0]["corridor_id"] = "UNKNOWN"
    sample_tasks[1]["section_id"] = ""
    
    valid, invalid = quarantine_invalid(sample_tasks)
    assert len(valid) == len(sample_tasks) - 2
    assert len(invalid) == 2
    assert "_errors" in invalid[0]
