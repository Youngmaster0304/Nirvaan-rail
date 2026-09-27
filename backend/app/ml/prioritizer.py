import logging
import os
import pickle
import numpy as np
import shap
from typing import Dict, Any, List, Tuple
from .feature_engineering import extract_features, extract_features_batch, FEATURE_NAMES

logger = logging.getLogger(__name__)
MODEL_PATH = os.path.join(os.path.dirname(__file__), "model.pkl")

class TaskPrioritizer:
    """Inference engine for task prioritization using LightGBM and SHAP."""
    
    def __init__(self):
        self.model = None
        self.explainer = None
        self._load_model()

    def _load_model(self):
        if os.path.exists(MODEL_PATH):
            with open(MODEL_PATH, 'rb') as f:
                self.model = pickle.load(f)
            # Cache SHAP TreeExplainer
            self.explainer = shap.TreeExplainer(self.model)
            logger.info("Loaded LightGBM model and initialized SHAP explainer.")
        else:
            logger.warning(f"Model file not found at {MODEL_PATH}. Will load lazily later.")

    def _ensure_model(self):
        if self.model is None:
            self._load_model()
            if self.model is None:
                raise RuntimeError("Model is not trained. Please train the model first.")

    def prioritize_single(self, task: Dict[str, Any]) -> Tuple[float, Dict[str, float]]:
        self._ensure_model()
        features = extract_features(task)
        # Predict expects 2D array
        x_array = np.array([[features[f] for f in FEATURE_NAMES]])
        
        score = float(self.model.predict(x_array)[0])
        score = np.clip(score, 0.0, 100.0)
        
        shap_values = self.get_shap_explanation(task)
        return score, shap_values

    def prioritize_batch(self, tasks: List[Dict[str, Any]]) -> List[Tuple[float, Dict[str, float]]]:
        self._ensure_model()
        if not tasks:
            return []
            
        df = extract_features_batch(tasks)
        scores = self.model.predict(df[FEATURE_NAMES])
        scores = np.clip(scores, 0.0, 100.0)
        
        results = []
        # Bulk compute SHAP for speed
        shap_vals = self.explainer.shap_values(df[FEATURE_NAMES])
        
        for i, score in enumerate(scores):
            # Create explanation dict for this row
            explanation = {
                FEATURE_NAMES[j]: float(shap_vals[i][j])
                for j in range(len(FEATURE_NAMES))
            }
            results.append((float(score), explanation))
            
        return results

    def get_shap_explanation(self, task: Dict[str, Any]) -> Dict[str, float]:
        self._ensure_model()
        features = extract_features(task)
        x_array = np.array([[features[f] for f in FEATURE_NAMES]])
        shap_vals = self.explainer.shap_values(x_array)[0]
        
        return {
            FEATURE_NAMES[i]: float(shap_vals[i])
            for i in range(len(FEATURE_NAMES))
        }
