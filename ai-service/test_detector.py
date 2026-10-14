"""
Standalone verification script for MediaPipe Hand Landmark Detection & Normalization
with Scikit-learn Gesture Classification.

Usage:
    # Test using bundled sample hand image (automated, no camera required):
    python test_detector.py

    # Test using a custom image file:
    python test_detector.py --image path/to/image.jpg

    # Test using interactive live webcam feed:
    python test_detector.py --webcam
"""

import sys
import os
import argparse
import base64
from pathlib import Path
import cv2
import numpy as np

# Configure UTF-8 output safe for Windows consoles
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure app package is in sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.ml.mediapipe_engine import MediaPipeHandDetector
from app.ml.classifier import get_gesture_classifier

def test_on_image(image_path: str):
    print("=" * 60)
    print(f"Testing MediaPipe Hand Detection & Sign Classification: {image_path}")
    print("=" * 60)

    if not os.path.exists(image_path):
        print(f"[ERROR] Image file not found at '{image_path}'")
        sys.exit(1)

    # Read image using OpenCV
    image_bgr = cv2.imread(image_path)
    if image_bgr is None:
        print(f"[ERROR] Failed to read image file at '{image_path}'")
        sys.exit(1)

    print(f"[INFO] Image loaded successfully: {image_bgr.shape[1]}x{image_bgr.shape[0]} ({image_bgr.shape[2]} channels)")

    # Simulate base64 transport as used by the REST API
    _, buffer = cv2.imencode('.jpg', image_bgr)
    b64_str = base64.b64encode(buffer).decode('utf-8')
    data_uri = f"data:image/jpeg;base64,{b64_str}"

    detector = MediaPipeHandDetector(static_image_mode=True, max_num_hands=1)
    classifier = get_gesture_classifier()

    # Test base64 decode
    decoded_bgr = detector.decode_base64_image(data_uri)
    print("[OK] Base64 encoding/decoding pipeline verified.")

    # Process image with MediaPipe
    result = detector.process_image(decoded_bgr)

    # Run classifier if hand detected
    prediction_label = None
    confidence_score = None
    if result["hand_detected"] and classifier.is_loaded:
        prediction_label, confidence_score = classifier.predict(result["feature_vector"])

    print("\n" + "-" * 40)
    print("MediaPipe & Classifier Pipeline Results:")
    print("-" * 40)
    print(f"1. Hand Detected:         {'YES' if result['hand_detected'] else 'NO'}")
    print(f"2. Handedness:            {result['handedness']}")
    print(f"3. Landmarks Extracted:   {result['landmarks_count']} (expected 21)")
    print(f"4. Feature Vector Size:   {result['feature_vector_size']} (expected 63 floats)")
    print(f"5. Model Loaded:          {'YES' if classifier.is_loaded else 'NO'}")
    print(f"6. Predicted Sign:        {prediction_label if prediction_label else 'N/A'}")
    print(f"7. Confidence Score:      {confidence_score if confidence_score is not None else 'N/A'}")
    print(f"8. Status Message:        {result['message']}")

    if result['hand_detected']:
        print("\nSample Raw Landmarks:")
        print(f"   - Wrist (lm[0]):           x={result['landmarks'][0]['x']}, y={result['landmarks'][0]['y']}, z={result['landmarks'][0]['z']}")
        print(f"   - Index Tip (lm[8]):       x={result['landmarks'][8]['x']}, y={result['landmarks'][8]['y']}, z={result['landmarks'][8]['z']}")
        print(f"   - Thumb Tip (lm[4]):       x={result['landmarks'][4]['x']}, y={result['landmarks'][4]['y']}, z={result['landmarks'][4]['z']}")

        print("\nSample Normalized Features (Wrist-relative & Scaled [-1, 1]):")
        print(f"   - Normalized Wrist:        x={result['normalized_landmarks'][0]['x']}, y={result['normalized_landmarks'][0]['y']}, z={result['normalized_landmarks'][0]['z']}")
        print(f"   - Normalized Index Tip:    x={result['normalized_landmarks'][8]['x']}, y={result['normalized_landmarks'][8]['y']}, z={result['normalized_landmarks'][8]['z']}")
        print(f"   - First 6 feature values:  {result['feature_vector'][:6]}")

        # Verification check
        assert result['landmarks_count'] == 21, "Landmark count must be exactly 21"
        assert result['feature_vector_size'] == 63, "Feature vector must be exactly 63 floats"
        print("\n[SUCCESS] ALL CHECKS PASSED: End-to-end hand detection and gesture classification verified!")

    detector.close()
    return result, prediction_label, confidence_score

def test_on_webcam():
    print("=" * 60)
    print("Starting Live Webcam Hand Detection & Classification Test")
    print("   Press 'q' or ESC in the video window to quit.")
    print("=" * 60)

    cap = cv2.VideoCapture(0)
    if not cap.isOpened():
        print("[ERROR] Could not open webcam device (index 0).")
        print("   Make sure your camera is connected and not in use by another program.")
        sys.exit(1)

    detector = MediaPipeHandDetector(static_image_mode=False, max_num_hands=1)
    classifier = get_gesture_classifier()

    try:
        while True:
            ret, frame = cap.read()
            if not ret:
                print("[ERROR] Failed to grab frame from camera.")
                break

            # Flip frame horizontally for natural selfie view
            frame = cv2.flip(frame, 1)

            # Process frame
            result = detector.process_image(frame)

            # Draw status on frame
            if result["hand_detected"]:
                pred_label, conf = classifier.predict(result["feature_vector"])
                status_text = f"Sign: {pred_label} ({conf*100:.1f}%)"
                color = (0, 255, 0)
                feat_text = f"Features: {result['feature_vector_size']} | Hand: {result['handedness']}"
                cv2.putText(frame, feat_text, (20, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
            else:
                status_text = "Hand: Looking for gesture..."
                color = (0, 0, 255)

            cv2.putText(frame, status_text, (20, 40), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2)

            cv2.imshow("ISL Translator - Live Classification Verification", frame)

            key = cv2.waitKey(1) & 0xFF
            if key == ord('q') or key == 27:
                break
    finally:
        cap.release()
        cv2.destroyAllWindows()
        detector.close()
        print("Webcam session ended.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify MediaPipe Hand Landmark Detection & Sign Classification")
    parser.add_argument("--image", type=str, default=None, help="Path to test image file")
    parser.add_argument("--webcam", action="store_true", help="Run interactive live webcam test")
    args = parser.parse_args()

    if args.webcam:
        test_on_webcam()
    else:
        sample_path = args.image or os.path.join(os.path.dirname(__file__), "tests", "sample_hand.jpg")
        test_on_image(sample_path)
