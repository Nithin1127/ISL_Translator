"""
Verification script for /predict and /health endpoints.
Uses direct endpoint invocation with standard Python libraries (no extra dependencies required).

Tests:
1. Health check - verifies service status and model_loaded: true
2. /predict with sample_hand.jpg (open palm)
3. /predict with Letters/A.jpg (ISL letter A gesture)
4. /predict with blank image (confirms graceful hand_detected: false handling)
"""

import sys
import os
import base64
import json
from pathlib import Path
import cv2
import numpy as np

# Safe stdout encoding for Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(CURRENT_DIR))

from app.main import app, health_check, predict_gesture
from app.schemas.predict_schema import PredictRequest

def encode_file_to_base64_uri(file_path: Path) -> str:
    with open(file_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"

def run_tests():
    print("=" * 65)
    print("ISL Prediction Endpoint Verification Test (/predict & /health)")
    print("=" * 65)

    # Test 1: Health check
    print("\n[TEST 1] Testing health_check()...")
    health = health_check()
    print("Response:")
    print(json.dumps(health, indent=2))
    assert health["model_loaded"] is True, "Expected model_loaded to be True"
    assert health["status"] == "ok", "Expected status to be 'ok'"
    print(">>> [PASS] Health check confirms model is loaded.")

    # Test 2: Predict with sample_hand.jpg
    sample_hand_path = CURRENT_DIR / "tests" / "sample_hand.jpg"
    print(f"\n[TEST 2] Testing /predict with sample hand image ({sample_hand_path.name})...")
    assert sample_hand_path.exists(), f"Sample hand image not found at {sample_hand_path}"
    req1 = PredictRequest(image=encode_file_to_base64_uri(sample_hand_path))
    res1 = predict_gesture(req1)
    res1_dict = res1.model_dump() if hasattr(res1, "model_dump") else res1.dict()
    print("Response:")
    print(json.dumps({
        "success": res1_dict["success"],
        "hand_detected": res1_dict["hand_detected"],
        "prediction": res1_dict["prediction"],
        "sign": res1_dict["sign"],
        "confidence": res1_dict["confidence"],
        "landmarks_count": res1_dict["landmarks_count"],
        "feature_vector_size": res1_dict["feature_vector_size"],
        "message": res1_dict["message"],
    }, indent=2))
    assert res1.success is True
    assert res1.hand_detected is True
    assert res1.prediction is not None
    assert res1.confidence is not None
    assert res1.feature_vector_size == 63
    print(f">>> [PASS] Hand detected! Predicted: '{res1.prediction}' (confidence: {res1.confidence})")

    # Test 3: Predict with real ISL sign gesture (Letters/A.jpg)
    letter_a_path = CURRENT_DIR / "training" / "dataset" / "raw" / "Letters" / "A.jpg"
    if letter_a_path.exists():
        print(f"\n[TEST 3] Testing /predict with real ISL sign gesture (Letter A)...")
        req2 = PredictRequest(image=encode_file_to_base64_uri(letter_a_path))
        res2 = predict_gesture(req2)
        res2_dict = res2.model_dump() if hasattr(res2, "model_dump") else res2.dict()
        print("Response:")
        print(json.dumps({
            "success": res2_dict["success"],
            "hand_detected": res2_dict["hand_detected"],
            "prediction": res2_dict["prediction"],
            "confidence": res2_dict["confidence"],
            "landmarks_count": res2_dict["landmarks_count"],
            "message": res2_dict["message"],
        }, indent=2))
        assert res2.success is True
        assert res2.hand_detected is True
        assert res2.prediction == "A", f"Expected 'A', got {res2.prediction}"
        print(f">>> [PASS] Real ISL sign gesture correctly classified as '{res2.prediction}' with confidence {res2.confidence}!")

    # Test 4: Predict with blank image (verify graceful hand_detected: false)
    print("\n[TEST 4] Testing /predict with non-hand blank canvas (empty frame test)...")
    blank_img = np.zeros((100, 100, 3), dtype=np.uint8)
    _, buf = cv2.imencode(".jpg", blank_img)
    blank_b64 = base64.b64encode(buf).decode("utf-8")
    req3 = PredictRequest(image=f"data:image/jpeg;base64,{blank_b64}")
    res3 = predict_gesture(req3)
    res3_dict = res3.model_dump() if hasattr(res3, "model_dump") else res3.dict()
    print("Response:")
    print(json.dumps({
        "success": res3_dict["success"],
        "hand_detected": res3_dict["hand_detected"],
        "prediction": res3_dict["prediction"],
        "confidence": res3_dict["confidence"],
        "landmarks_count": res3_dict["landmarks_count"],
        "message": res3_dict["message"],
    }, indent=2))
    assert res3.success is True
    assert res3.hand_detected is False
    assert res3.prediction is None
    assert res3.confidence is None
    print(">>> [PASS] Gracefully returns hand_detected: false without error or crash.")

    print("\n" + "=" * 65)
    print("[SUCCESS] ALL ENDPOINT TESTS PASSED!")
    print("=" * 65)

if __name__ == "__main__":
    run_tests()
