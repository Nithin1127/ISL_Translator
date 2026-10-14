"""
Dataset Preparation & Landmark Feature Extraction Pipeline for ISL Alphabet Dataset.

Supports both:
  1. Pre-split dataset structures (e.g. RealSign: raw/Training/A-Z, raw/Validation/A-Z, raw/Testing/A-Z)
     Preserves official splits exactly without random resplitting.
  2. Unsplit fallback structure (raw/A-Z)
     Performs stratified 70/15/15 train/val/test splitting.

Reuses the MediaPipeHandDetector from app.ml.mediapipe_engine for 21 3D landmarks
and 63-dimensional wrist-normalized feature vectors.

Usage:
    # Test on a small subset (e.g. 2 images per class per split):
    python prepare_dataset.py --max-per-class 2

    # Run full dataset extraction:
    python prepare_dataset.py

    # Custom paths:
    python prepare_dataset.py --input-dir "path/to/raw" --output-dir "path/to/processed"
"""

import sys
import os
import csv
import json
import argparse
from pathlib import Path
from typing import List, Dict, Tuple, Optional, Any
import cv2
import numpy as np
from sklearn.model_selection import train_test_split

# Safe stdout encoding for Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

# Ensure ai-service root is in sys.path so app.ml imports resolve cleanly
CURRENT_DIR = Path(__file__).resolve().parent
AI_SERVICE_ROOT = CURRENT_DIR.parent
if str(AI_SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(AI_SERVICE_ROOT))

# Reuse existing MediaPipe detector & normalizer
from app.ml.mediapipe_engine import MediaPipeHandDetector

# ==============================================================================
# Configuration Defaults
# ==============================================================================
DEFAULT_INPUT_DIR = os.getenv(
    "ISL_RAW_DATASET_DIR",
    str(CURRENT_DIR / "dataset" / "raw")
)
DEFAULT_OUTPUT_DIR = os.getenv(
    "ISL_PROCESSED_DATASET_DIR",
    str(CURRENT_DIR / "dataset" / "processed")
)
DEFAULT_TRAIN_RATIO = 0.70
DEFAULT_VAL_RATIO = 0.15
DEFAULT_TEST_RATIO = 0.15
RANDOM_STATE = 42
VALID_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}

# Auxiliary directories/files to ignore from class discovery
IGNORED_FOLDER_NAMES = {"letters", "__pycache__", ".git", "dataset.zip"}


def detect_dataset_structure(input_path: Path) -> Tuple[bool, Dict[str, Optional[Path]]]:
    """
    Analyzes input directory to determine whether dataset is pre-split
    (Training/Validation/Testing) or a single flat folder of classes (A-Z).

    Returns:
        is_presplit: bool
        split_paths: dict with keys 'train', 'val', 'test' mapping to Path or None
    """
    subdirs = [d for d in input_path.iterdir() if d.is_dir() and not d.name.startswith(".")]

    split_paths: Dict[str, Optional[Path]] = {"train": None, "val": None, "test": None}

    for d in subdirs:
        name_lower = d.name.lower()
        if name_lower in ("training", "train"):
            split_paths["train"] = d
        elif name_lower in ("validation", "val", "valid"):
            split_paths["val"] = d
        elif name_lower in ("testing", "test"):
            split_paths["test"] = d

    # If at least train directory is found, treat as pre-split
    is_presplit = split_paths["train"] is not None

    return is_presplit, split_paths


def discover_classes_in_dir(directory: Path) -> List[Tuple[str, Path]]:
    """
    Finds class subdirectories (A-Z) inside a given directory, ignoring auxiliary folders.
    """
    if not directory.exists():
        return []

    subdirs = [
        d for d in directory.iterdir()
        if d.is_dir() and not d.name.startswith(".") and d.name.lower() not in IGNORED_FOLDER_NAMES
    ]
    return [(d.name.upper(), d) for d in sorted(subdirs, key=lambda x: x.name.upper())]


def extract_features_for_classes(
    class_folders: List[Tuple[str, Path]],
    detector: MediaPipeHandDetector,
    split_name: str = "Dataset",
    max_per_class: Optional[int] = None
) -> Tuple[List[List[float]], List[str], Dict[str, Any]]:
    """
    Iterates through class folders, extracts MediaPipe landmarks and 63-dimensional
    normalized feature vectors using MediaPipeHandDetector.
    """
    X: List[List[float]] = []
    y: List[str] = []

    class_stats: Dict[str, Dict[str, int]] = {}
    total_scanned = 0
    total_detected = 0
    total_missed = 0

    print(f"\n--- Processing {split_name.upper()} Split ({len(class_folders)} classes) ---")

    for class_name, folder_path in class_folders:
        image_files = [
            f for f in folder_path.iterdir()
            if f.is_file() and f.suffix.lower() in VALID_EXTENSIONS
        ]
        # Sort for reproducible ordering
        image_files.sort(key=lambda x: x.name)

        if max_per_class and max_per_class > 0:
            image_files = image_files[:max_per_class]

        scanned = len(image_files)
        detected = 0
        missed = 0

        for img_file in image_files:
            img = cv2.imread(str(img_file))
            if img is None:
                missed += 1
                continue

            result = detector.process_image(img)
            if result["hand_detected"] and result["feature_vector"]:
                X.append(result["feature_vector"])
                y.append(class_name)
                detected += 1
            else:
                missed += 1

        total_scanned += scanned
        total_detected += detected
        total_missed += missed

        class_stats[class_name] = {
            "scanned": scanned,
            "detected": detected,
            "missed": missed,
            "detection_rate_pct": round((detected / scanned * 100), 1) if scanned > 0 else 0.0
        }

        det_rate = (detected / scanned * 100) if scanned > 0 else 0
        print(f"  [{split_name}] Class '{class_name}': {detected}/{scanned} hands detected ({det_rate:.1f}%)")

    overall_rate = (total_detected / total_scanned * 100) if total_scanned > 0 else 0.0
    print(f"[{split_name} Summary] Scanned: {total_scanned} | Detected: {total_detected} | Missed: {total_missed} ({overall_rate:.1f}% success)")

    split_summary = {
        "images_scanned": total_scanned,
        "hands_detected": total_detected,
        "hands_missed": total_missed,
        "detection_rate_pct": round(overall_rate, 2),
        "class_counts": class_stats,
    }

    return X, y, split_summary


def save_split_csv(file_path: Path, X_data: List[List[float]], y_data: List[str]):
    """
    Saves feature vectors and labels to CSV with header [label, f0, f1, ..., f62].
    """
    file_path.parent.mkdir(parents=True, exist_ok=True)
    with open(file_path, mode="w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        header = ["label"] + [f"f{i}" for i in range(63)]
        writer.writerow(header)
        for label, features in zip(y_data, X_data):
            writer.writerow([label] + features)


def run_pipeline(
    input_dir: str = DEFAULT_INPUT_DIR,
    output_dir: str = DEFAULT_OUTPUT_DIR,
    max_per_class: Optional[int] = None
) -> bool:
    input_path = Path(input_dir)
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    print("=" * 60)
    print("ISL Alphabet Dataset Extraction & Preparation Pipeline")
    print("=" * 60)
    print(f"Source raw directory:    {input_path.resolve()}")
    print(f"Target output directory: {out_path.resolve()}")
    if max_per_class:
        print(f"Sample cap per class:    {max_per_class} (quick test mode)")

    if not input_path.exists():
        print(f"\n[ERROR] Source directory does not exist: {input_path.resolve()}")
        return False

    is_presplit, split_dirs = detect_dataset_structure(input_path)

    # Initialize shared MediaPipe detector
    detector = MediaPipeHandDetector(
        static_image_mode=True,
        max_num_hands=1,
        min_detection_confidence=0.5
    )

    try:
        if is_presplit:
            print("\n[STRUCTURE DETECTED] Pre-split dataset structure (RealSign)")
            print(f"  • Training dir:   {split_dirs['train']}")
            print(f"  • Validation dir: {split_dirs['val']}")
            print(f"  • Testing dir:    {split_dirs['test']}")
            print("[INFO] Preserving official splits exactly without random resplitting.")

            metadata_splits: Dict[str, Any] = {}

            # Process Training Split
            train_classes = discover_classes_in_dir(split_dirs["train"])
            X_train, y_train, train_stats = extract_features_for_classes(
                train_classes, detector, split_name="Training", max_per_class=max_per_class
            )
            save_split_csv(out_path / "train.csv", X_train, y_train)
            metadata_splits["train"] = train_stats

            # Process Validation Split
            if split_dirs["val"] and split_dirs["val"].exists():
                val_classes = discover_classes_in_dir(split_dirs["val"])
                X_val, y_val, val_stats = extract_features_for_classes(
                    val_classes, detector, split_name="Validation", max_per_class=max_per_class
                )
                save_split_csv(out_path / "val.csv", X_val, y_val)
                metadata_splits["val"] = val_stats
            else:
                X_val, y_val = [], []
                metadata_splits["val"] = {}

            # Process Testing Split
            if split_dirs["test"] and split_dirs["test"].exists():
                test_classes = discover_classes_in_dir(split_dirs["test"])
                X_test, y_test, test_stats = extract_features_for_classes(
                    test_classes, detector, split_name="Testing", max_per_class=max_per_class
                )
                save_split_csv(out_path / "test.csv", X_test, y_test)
                metadata_splits["test"] = test_stats
            else:
                X_test, y_test = [], []
                metadata_splits["test"] = {}

            all_labels = sorted(list(set(y_train + y_val + y_test)))

            # Save NumPy archive (.npz)
            npz_path = out_path / "dataset_splits.npz"
            np.savez_compressed(
                npz_path,
                X_train=np.array(X_train, dtype=np.float32) if X_train else np.empty((0, 63), dtype=np.float32),
                y_train=np.array(y_train) if y_train else np.empty((0,), dtype=str),
                X_val=np.array(X_val, dtype=np.float32) if X_val else np.empty((0, 63), dtype=np.float32),
                y_val=np.array(y_val) if y_val else np.empty((0,), dtype=str),
                X_test=np.array(X_test, dtype=np.float32) if X_test else np.empty((0, 63), dtype=np.float32),
                y_test=np.array(y_test) if y_test else np.empty((0,), dtype=str),
                classes=np.array(all_labels),
            )

            total_scanned = sum(s.get("images_scanned", 0) for s in metadata_splits.values())
            total_detected = sum(s.get("hands_detected", 0) for s in metadata_splits.values())
            total_missed = sum(s.get("hands_missed", 0) for s in metadata_splits.values())
            overall_rate = (total_detected / total_scanned * 100) if total_scanned > 0 else 0.0

            # Save metadata
            meta_path = out_path / "metadata.json"
            metadata = {
                "dataset_type": "pre_split (RealSign)",
                "preserved_splits": True,
                "feature_vector_size": 63,
                "classes": all_labels,
                "total_classes": len(all_labels),
                "splits": {
                    "train_samples": len(X_train),
                    "val_samples": len(X_val),
                    "test_samples": len(X_test),
                    "total_samples": len(X_train) + len(X_val) + len(X_test),
                },
                "split_details": metadata_splits,
                "overall_summary": {
                    "total_scanned": total_scanned,
                    "total_detected": total_detected,
                    "total_missed": total_missed,
                    "overall_detection_rate_pct": round(overall_rate, 2),
                }
            }
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)

            print("\n" + "=" * 60)
            print("[SUCCESS] Pre-split Dataset Extraction Completed!")
            print("=" * 60)
            print(f"Output directory: {out_path.resolve()}")
            print(f"  • Training samples:   {len(X_train):>5}  -> train.csv")
            print(f"  • Validation samples: {len(X_val):>5}  -> val.csv")
            print(f"  • Testing samples:    {len(X_test):>5}  -> test.csv")
            print(f"  • NumPy Archive:      {npz_path.name}")
            print(f"  • Metadata Info:      {meta_path.name}")
            print(f"  • Overall Detection:  {total_detected}/{total_scanned} ({overall_rate:.1f}%)")
            print(f"  • Total Classes:      {len(all_labels)}")
            return True

        else:
            # Fallback: Unsplit dataset (raw/A, raw/B, ...)
            print("\n[STRUCTURE DETECTED] Unsplit flat dataset structure")
            class_folders = discover_classes_in_dir(input_path)

            if not class_folders:
                print(f"\n[WARNING] No alphabet class folders found in: {input_path.resolve()}")
                print("Expected: raw/Training/A-Z, or raw/A-Z")
                return False

            print(f"Found {len(class_folders)} classes: {', '.join([c[0] for c in class_folders])}")
            X, y, stats = extract_features_for_classes(
                class_folders, detector, split_name="Unsplit", max_per_class=max_per_class
            )

            if len(X) == 0:
                print("\n[ERROR] No hand landmarks could be extracted.")
                return False

            # Stratified split
            val_test_ratio = DEFAULT_VAL_RATIO + DEFAULT_TEST_RATIO
            X_train, X_temp, y_train, y_temp = train_test_split(
                X, y, test_size=val_test_ratio, random_state=RANDOM_STATE, stratify=y
            )
            relative_test_ratio = DEFAULT_TEST_RATIO / val_test_ratio
            X_val, X_test, y_val, y_test = train_test_split(
                X_temp, y_temp, test_size=relative_test_ratio, random_state=RANDOM_STATE, stratify=y_temp
            )

            save_split_csv(out_path / "train.csv", X_train, y_train)
            save_split_csv(out_path / "val.csv", X_val, y_val)
            save_split_csv(out_path / "test.csv", X_test, y_test)

            classes_list = sorted(list(set(y)))
            npz_path = out_path / "dataset_splits.npz"
            np.savez_compressed(
                npz_path,
                X_train=np.array(X_train, dtype=np.float32),
                y_train=np.array(y_train),
                X_val=np.array(X_val, dtype=np.float32),
                y_val=np.array(y_val),
                X_test=np.array(X_test, dtype=np.float32),
                y_test=np.array(y_test),
                classes=np.array(classes_list),
            )

            meta_path = out_path / "metadata.json"
            metadata = {
                "dataset_type": "unsplit_stratified",
                "preserved_splits": False,
                "feature_vector_size": 63,
                "classes": classes_list,
                "total_classes": len(classes_list),
                "splits": {
                    "train_samples": len(X_train),
                    "val_samples": len(X_val),
                    "test_samples": len(X_test),
                    "total_samples": len(X),
                },
                "extraction_stats": stats,
            }
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(metadata, f, indent=2)

            print("\n" + "=" * 60)
            print("[SUCCESS] Stratified Dataset Splitting Completed!")
            print("=" * 60)
            print(f"Output directory: {out_path.resolve()}")
            print(f"  • Train split:      {len(X_train):>5} samples  -> train.csv")
            print(f"  • Validation split: {len(X_val):>5} samples  -> val.csv")
            print(f"  • Test split:       {len(X_test):>5} samples  -> test.csv")
            print(f"  • NumPy Archive:    {npz_path.name}")
            return True

    finally:
        detector.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Prepare ISL Alphabet Landmark Dataset")
    parser.add_argument("--input-dir", type=str, default=DEFAULT_INPUT_DIR, help="Path to raw dataset folder")
    parser.add_argument("--output-dir", type=str, default=DEFAULT_OUTPUT_DIR, help="Directory to save processed train/val/test CSVs and NPZ")
    parser.add_argument("--max-per-class", type=int, default=None, help="Cap on images processed per class (for quick testing)")

    args = parser.parse_args()
    run_pipeline(args.input_dir, args.output_dir, args.max_per_class)
