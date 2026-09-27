import pytest
import pandas as pd
from app.ml.feature_engineering import extract_features, extract_features_batch, FEATURE_NAMES

def test_extract_features_basic(sample_task):
    features = extract_features(sample_task)
    for name in FEATURE_NAMES:
        assert name in features
        assert isinstance(features[name], float)
    
def test_severity_encoding(sample_task):
    task = sample_task.copy()
    
    task["defect_severity"] = "CRITICAL"
    assert extract_features(task)["defect_severity_encoded"] == 4.0
    
    task["defect_severity"] = "HIGH"
    assert extract_features(task)["defect_severity_encoded"] == 3.0
    
    task["defect_severity"] = "MEDIUM"
    assert extract_features(task)["defect_severity_encoded"] == 2.0
    
    task["defect_severity"] = "LOW"
    assert extract_features(task)["defect_severity_encoded"] == 1.0

def test_criticality_encoding(sample_task):
    task = sample_task.copy()
    
    task["section_criticality"] = "JUNCTION"
    assert extract_features(task)["section_criticality_encoded"] == 3.0
    
    task["section_criticality"] = "MAINLINE"
    assert extract_features(task)["section_criticality_encoded"] == 2.0
    
    task["section_criticality"] = "BRANCH"
    assert extract_features(task)["section_criticality_encoded"] == 1.0

def test_batch_extraction(sample_tasks):
    df = extract_features_batch(sample_tasks)
    assert isinstance(df, pd.DataFrame)
    assert df.shape == (len(sample_tasks), len(FEATURE_NAMES))
    for name in FEATURE_NAMES:
        assert name in df.columns

def test_missing_fields():
    task = {}
    features = extract_features(task)
    assert features["defect_severity_encoded"] == 1.0
    assert features["days_overdue"] == 0.0
