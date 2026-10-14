import base64
import logging
from typing import Dict, Any, List, Optional, Tuple
import cv2
import numpy as np
import mediapipe as mp

logger = logging.getLogger("mediapipe_engine")

class MediaPipeHandDetector:
    """
    Encapsulates MediaPipe Hands detection, landmark extraction,
    and coordinate normalization for Indian Sign Language gesture recognition.
    """

    def __init__(
        self,
        static_image_mode: bool = True,
        max_num_hands: int = 1,
        min_detection_confidence: float = 0.5,
        min_tracking_confidence: float = 0.5,
    ):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=static_image_mode,
            max_num_hands=max_num_hands,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self.mp_drawing = mp.solutions.drawing_utils

    def decode_base64_image(self, base64_str: str) -> np.ndarray:
        """
        Decodes a base64 string (with or without data URI header) into an OpenCV BGR image array.
        """
        if not base64_str:
            raise ValueError("Empty image string provided.")

        # Strip data URL header if present (e.g. data:image/jpeg;base64,)
        if "," in base64_str:
            base64_str = base64_str.split(",", 1)[1]

        try:
            image_bytes = base64.b64decode(base64_str)
        except Exception as e:
            raise ValueError(f"Failed to base64-decode image: {str(e)}")

        np_arr = np.frombuffer(image_bytes, np.uint8)
        image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if image is None or image.size == 0:
            raise ValueError("Failed to decode image from buffer. Invalid or corrupted image format.")

        return image

    def normalize_landmarks(self, raw_landmarks: List[Dict[str, float]]) -> Tuple[List[Dict[str, float]], List[float]]:
        """
        Normalizes 21 3D hand landmarks:
        1. Translation invariance: Shifts coordinates relative to the wrist (landmark 0).
        2. Scale invariance: Divides by the maximum distance across coordinates so scale is [-1, 1].

        Returns:
            - normalized_landmarks: List of 21 normalized {x, y, z} dicts.
            - feature_vector: 1D flattened array of 63 floats [x0, y0, z0, x1, y1, z1, ..., x20, y20, z20].
        """
        if len(raw_landmarks) != 21:
            raise ValueError(f"Expected 21 landmarks, got {len(raw_landmarks)}")

        wrist = raw_landmarks[0]
        wrist_x, wrist_y, wrist_z = wrist["x"], wrist["y"], wrist["z"]

        # Step 1: Translate coordinates relative to wrist (wrist becomes origin (0, 0, 0))
        relative_coords = []
        max_distance = 0.0

        for lm in raw_landmarks:
            rel_x = lm["x"] - wrist_x
            rel_y = lm["y"] - wrist_y
            rel_z = lm["z"] - wrist_z
            relative_coords.append((rel_x, rel_y, rel_z))

            dist = max(abs(rel_x), abs(rel_y), abs(rel_z))
            if dist > max_distance:
                max_distance = dist

        # Prevent division by zero if all points are identical
        if max_distance < 1e-6:
            max_distance = 1.0

        # Step 2: Scale coordinates into [-1.0, 1.0] range
        normalized_landmarks = []
        feature_vector = []

        for rel_x, rel_y, rel_z in relative_coords:
            norm_x = float(np.round(rel_x / max_distance, 6))
            norm_y = float(np.round(rel_y / max_distance, 6))
            norm_z = float(np.round(rel_z / max_distance, 6))

            normalized_landmarks.append({"x": norm_x, "y": norm_y, "z": norm_z})
            feature_vector.extend([norm_x, norm_y, norm_z])

        return normalized_landmarks, feature_vector

    def process_image(self, image_bgr: np.ndarray) -> Dict[str, Any]:
        """
        Processes an OpenCV BGR image and extracts hand landmarks and normalized feature vectors.
        """
        # Convert BGR to RGB for MediaPipe
        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)
        image_rgb.flags.writeable = False

        results = self.hands.process(image_rgb)

        if not results.multi_hand_landmarks:
            return {
                "hand_detected": False,
                "handedness": None,
                "landmarks_count": 0,
                "landmarks": None,
                "normalized_landmarks": None,
                "feature_vector": None,
                "feature_vector_size": 0,
                "message": "No hand detected in the provided image.",
            }

        # Extract primary hand landmarks
        primary_hand_landmarks = results.multi_hand_landmarks[0]

        # Extract handedness if available
        handedness = "Right"
        if results.multi_handedness:
            handedness = results.multi_handedness[0].classification[0].label

        raw_landmarks = []
        for lm in primary_hand_landmarks.landmark:
            raw_landmarks.append({
                "x": float(np.round(lm.x, 6)),
                "y": float(np.round(lm.y, 6)),
                "z": float(np.round(lm.z, 6)),
            })

        # Calculate normalized landmarks and ML feature vector
        normalized_landmarks, feature_vector = self.normalize_landmarks(raw_landmarks)

        return {
            "hand_detected": True,
            "handedness": handedness,
            "landmarks_count": len(raw_landmarks),
            "landmarks": raw_landmarks,
            "normalized_landmarks": normalized_landmarks,
            "feature_vector": feature_vector,
            "feature_vector_size": len(feature_vector),
            "message": "Hand landmarks successfully extracted and normalized.",
        }

    def close(self):
        """Release MediaPipe resources"""
        if self.hands:
            self.hands.close()

# Singleton detector instance
_detector_instance: Optional[MediaPipeHandDetector] = None

def get_hand_detector() -> MediaPipeHandDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = MediaPipeHandDetector(
            static_image_mode=False, # Optimized for video/frame streaming
            max_num_hands=1,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5,
        )
    return _detector_instance
