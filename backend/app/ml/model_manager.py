import logging
import os
import datetime
from .train_model import train_model, MODEL_PATH
from .prioritizer import TaskPrioritizer
from .feature_engineering import FEATURE_NAMES

logger = logging.getLogger(__name__)

_prioritizer_instance = None

def ensure_model_exists():
    """Trains if no model file found."""
    if not os.path.exists(MODEL_PATH):
        logger.info("No model found. Training initial model...")
        train_model()
    else:
        logger.info("Model already exists.")

def get_prioritizer() -> TaskPrioritizer:
    """Returns a singleton TaskPrioritizer instance."""
    global _prioritizer_instance
    if _prioritizer_instance is None:
        ensure_model_exists()
        _prioritizer_instance = TaskPrioritizer()
    return _prioritizer_instance

def retrain_model():
    """Retrains on current data and reloads the prioritizer."""
    global _prioritizer_instance
    logger.info("Retraining model...")
    train_model()
    # Reload singleton
    _prioritizer_instance = TaskPrioritizer()
    
def get_model_info() -> dict:
    """Returns info about the model."""
    if not os.path.exists(MODEL_PATH):
        return {"status": "Not Trained"}
        
    mtime = os.path.getmtime(MODEL_PATH)
    dt = datetime.datetime.fromtimestamp(mtime)
    
    prioritizer = get_prioritizer()
    # Attempt to get feature importance if LightGBM supports it this way
    try:
        importance = prioritizer.model.feature_importance()
        importance_dict = dict(zip(FEATURE_NAMES, [float(i) for i in importance]))
    except:
        importance_dict = {}
        
    return {
        "status": "Ready",
        "last_trained": dt.isoformat(),
        "features": FEATURE_NAMES,
        "feature_importance": importance_dict
    }
