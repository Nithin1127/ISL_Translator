from typing import Optional, List, Dict
from pydantic import BaseModel, Field

class LandmarkPoint(BaseModel):
    x: float
    y: float
    z: float

class PredictRequest(BaseModel):
    image: str = Field(..., description="Base64 encoded JPEG/PNG frame string (with or without data URI prefix)")

class PredictResponse(BaseModel):
    success: bool = True
    hand_detected: bool = False
    prediction: Optional[str] = None
    sign: Optional[str] = None
    confidence: Optional[float] = None
    handedness: Optional[str] = None
    landmarks_count: int = 0
    landmarks: Optional[List[LandmarkPoint]] = None
    normalized_landmarks: Optional[List[LandmarkPoint]] = None
    feature_vector: Optional[List[float]] = None
    feature_vector_size: int = 0
    message: str = "Inference completed."
