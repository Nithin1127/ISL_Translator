import sys
from pathlib import Path

# Ensure project root is in sys.path for direct script execution
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import os
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.schemas.predict_schema import PredictRequest, PredictResponse
from app.ml.mediapipe_engine import get_hand_detector
from app.ml.classifier import get_gesture_classifier

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Microservice providing Indian Sign Language (ISL) landmark detection and gesture classification.",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def startup_event():
    """Warm up the MediaPipe hand detector and ML classifier on startup"""
    try:
        get_hand_detector()
        classifier = get_gesture_classifier()
        if classifier.is_loaded:
            print(f"[INFO] ML gesture classifier loaded with {len(classifier.labels)} classes.")
        else:
            print("[WARN] Gesture classifier could not be loaded at startup.")
    except Exception as e:
        print(f"[Warning] Startup initialization notice: {e}")

@app.get("/", tags=["Root"])
def read_root():
    classifier = get_gesture_classifier()
    return {
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "model_loaded": classifier.is_loaded,
        "num_classes": len(classifier.labels) if classifier.is_loaded else 0,
        "docs_url": "/docs",
    }

@app.get("/health", tags=["Health"])
def health_check():
    classifier = get_gesture_classifier()
    return {
        "status": "ok",
        "service": settings.PROJECT_NAME,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "environment": settings.ENVIRONMENT,
        "model_loaded": classifier.is_loaded,
    }

@app.post("/predict", response_model=PredictResponse, tags=["Inference"])
def predict_gesture(request: PredictRequest):
    """
    Receives base64 encoded frame, decodes it, extracts 21 MediaPipe hand landmarks,
    normalizes coordinates into a 63-dimensional feature vector, and classifies the ISL sign (A-Z)
    using the trained RandomForest model.
    """
    detector = get_hand_detector()
    classifier = get_gesture_classifier()

    # Step 1: Decode image
    try:
        image_bgr = detector.decode_base64_image(request.image)
    except ValueError as val_err:
        return PredictResponse(
            success=False,
            hand_detected=False,
            prediction=None,
            sign=None,
            confidence=None,
            landmarks_count=0,
            message=f"Image decoding error: {str(val_err)}",
        )
    except Exception as err:
        return PredictResponse(
            success=False,
            hand_detected=False,
            prediction=None,
            sign=None,
            confidence=None,
            landmarks_count=0,
            message=f"Unexpected error decoding image: {str(err)}",
        )

    # Step 2: MediaPipe Landmark Detection and Normalization
    try:
        detection_result = detector.process_image(image_bgr)
    except Exception as err:
        return PredictResponse(
            success=False,
            hand_detected=False,
            prediction=None,
            sign=None,
            confidence=None,
            landmarks_count=0,
            message=f"MediaPipe processing error: {str(err)}",
        )

    # If no hand was detected, return clean response without error
    if not detection_result["hand_detected"]:
        return PredictResponse(
            success=True,
            hand_detected=False,
            prediction=None,
            sign=None,
            confidence=None,
            handedness=None,
            landmarks_count=0,
            landmarks=None,
            normalized_landmarks=None,
            feature_vector=None,
            feature_vector_size=0,
            message="No hand detected in the provided image.",
        )

    # Step 3: Run Random Forest Gesture Classification
    prediction_label = None
    confidence_score = None
    if classifier.is_loaded and detection_result["feature_vector"]:
        try:
            prediction_label, confidence_score = classifier.predict(detection_result["feature_vector"])
        except Exception as clf_err:
            print(f"[Error] Classification error: {clf_err}")

    return PredictResponse(
        success=True,
        hand_detected=True,
        prediction=prediction_label,
        sign=prediction_label,
        confidence=confidence_score,
        handedness=detection_result["handedness"],
        landmarks_count=detection_result["landmarks_count"],
        landmarks=detection_result["landmarks"],
        normalized_landmarks=detection_result["normalized_landmarks"],
        feature_vector=detection_result["feature_vector"],
        feature_vector_size=detection_result["feature_vector_size"],
        message=f"Sign recognized as '{prediction_label}' (confidence: {confidence_score})" if prediction_label else "Hand detected, but classifier unready.",
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=False
    )
