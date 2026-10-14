import os
import json
import logging
from pathlib import Path
from typing import Optional, Tuple, Dict, Any, List
import numpy as np
import joblib

logger = logging.getLogger("gesture_classifier")

class GestureClassifier:
    """
    Loads and runs inference using the trained Scikit-learn RandomForestClassifier
    on 63-dimensional normalized MediaPipe hand landmarks.
    """

    def __init__(
        self,
        model_path: Optional[str] = None,
        labels_path: Optional[str] = None,
    ):
        current_dir = Path(__file__).resolve().parent
        default_model_dir = current_dir / "model_data"

        self.model_path = Path(model_path) if model_path else default_model_dir / "isl_model.pkl"
        self.labels_path = Path(labels_path) if labels_path else default_model_dir / "labels.json"

        self.model = None
        self.labels: Dict[str, str] = {}
        self.is_loaded: bool = False

        self.load()

    def load(self) -> bool:
        """Loads the serialized model (.pkl) and labels map (.json)."""
        if not self.model_path.exists():
            logger.warning(f"Model file not found at: {self.model_path.resolve()}")
            return False

        if not self.labels_path.exists():
            logger.warning(f"Labels file not found at: {self.labels_path.resolve()}")
            return False

        try:
            self.model = joblib.load(self.model_path)
            with open(self.labels_path, "r", encoding="utf-8") as f:
                self.labels = json.load(f)

            self.is_loaded = True
            logger.info(f"Gesture classifier loaded successfully from {self.model_path.name}")
            return True
        except Exception as e:
            logger.error(f"Failed to load gesture classifier: {e}")
            self.is_loaded = False
            return False

    def predict(self, feature_vector: List[float]) -> Tuple[Optional[str], Optional[float]]:
        """
        Takes a 63-element normalized feature vector and returns:
          (predicted_class_label, confidence_score)
        """
        if not self.is_loaded or self.model is None:
            logger.warning("Classifier is not loaded; cannot run prediction.")
            return None, None

        if len(feature_vector) != 63:
            raise ValueError(f"Expected feature vector of length 63, got {len(feature_vector)}")

        X = np.array(feature_vector, dtype=np.float32).reshape(1, -1)

        pred_idx = self.model.predict(X)[0]
        label = self.labels.get(str(pred_idx), str(pred_idx))

        # Calculate confidence from class probabilities
        if hasattr(self.model, "predict_proba"):
            probs = self.model.predict_proba(X)[0]
            confidence = float(np.max(probs))
            confidence = round(confidence, 4)
        else:
            confidence = 1.0

        return label, confidence


# Singleton classifier instance
_classifier_instance: Optional[GestureClassifier] = None

def get_gesture_classifier() -> GestureClassifier:
    global _classifier_instance
    if _classifier_instance is None:
        _classifier_instance = GestureClassifier()
    return _classifier_instance
