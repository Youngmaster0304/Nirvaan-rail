import logging
import os
import random
import pickle
import numpy as np
import pandas as pd
import lightgbm as lgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from .feature_engineering import extract_features_batch, FEATURE_NAMES

logger = logging.getLogger(__name__)

MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

def generate_training_data(n_samples: int = 1000) -> pd.DataFrame:
    """Generates synthetic labeled data."""
    tasks = []
    severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
    criticalities = ['JUNCTION', 'MAINLINE', 'BRANCH']
    departments = ['Engineering', 'S&T', 'Traction']
    
    for i in range(n_samples):
        task = {
            'task_id': f'SYN-{i}',
            'defect_severity': random.choice(severities),
            'days_overdue': random.randint(0, 200),
            'section_criticality': random.choice(criticalities),
            'department': random.choice(departments),
            'weather_sensitivity': random.choice([True, False]),
            'required_duration_min': random.randint(30, 300),
            'safety_constraints': ["Constraint"] * random.randint(0, 3),
            'incompatible_with': ["Inc"] * random.randint(0, 1),
            'asset_age_years': random.uniform(1.0, 50.0),
            'historical_failure_rate': random.uniform(0.0, 0.2),
            'corridor_traffic_density': random.randint(20, 200)
        }
        tasks.append(task)
        
    df = extract_features_batch(tasks)
    
    # Priority formula (0-100)
    # severity(max 4)/4 * 25 + overdue(max 1)*20 + criticality(max 3)/3 * 15 ...
    
    labels = (
        (df['defect_severity_encoded'] / 4.0) * 25.0 +
        (df['days_overdue_normalized']) * 20.0 +
        (df['section_criticality_encoded'] / 3.0) * 15.0 +
        (np.clip(df['historical_failure_rate'] * 5.0, 0, 1)) * 10.0 + 
        (np.clip(df['corridor_traffic_density'] / 200.0, 0, 1)) * 10.0 +
        (np.clip(df['asset_age_years'] / 50.0, 0, 1)) * 10.0 +
        (df['weather_risk']) * 5.0 +
        (np.clip(df['safety_constraint_count'] / 3.0, 0, 1)) * 5.0
    )
    
    # Add noise
    noise = np.random.normal(0, 2.5, n_samples)
    labels = np.clip(labels + noise, 0, 100)
    
    df['priority_score'] = labels
    return df

def train_model():
    """Trains LightGBM regressor and saves model."""
    logger.info("Generating synthetic training data...")
    data = generate_training_data(2000)
    
    X = data[FEATURE_NAMES]
    y = data['priority_score']
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    lgb_train = lgb.Dataset(X_train, y_train)
    lgb_eval = lgb.Dataset(X_test, y_test, reference=lgb_train)
    
    params = {
        'objective': 'regression',
        'metric': 'rmse',
        'num_leaves': 31,
        'learning_rate': 0.05,
        'verbosity': -1
    }
    
    logger.info("Training LightGBM model...")
    gbm = lgb.train(
        params,
        lgb_train,
        num_boost_round=200,
        valid_sets=[lgb_train, lgb_eval]
    )
    
    # Evaluate
    y_pred = gbm.predict(X_test, num_iteration=gbm.best_iteration)
    evaluate_model(y_test, y_pred)
    
    with open(MODEL_PATH, 'wb') as f:
        pickle.dump(gbm, f)
    logger.info(f"Model saved to {MODEL_PATH}")

def evaluate_model(y_true, y_pred):
    """Prints metrics."""
    rmse = mean_squared_error(y_true, y_pred) ** 0.5
    mae = mean_absolute_error(y_true, y_pred)
    r2 = r2_score(y_true, y_pred)
    logger.info(f"Evaluation -> RMSE: {rmse:.4f}, MAE: {mae:.4f}, R2: {r2:.4f}")

if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    train_model()
