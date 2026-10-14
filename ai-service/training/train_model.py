"""
Model Training Scaffold for Indian Sign Language (ISL) Gesture Classification.

Implements a Scikit-learn RandomForestClassifier trained on 63-dimensional normalized
MediaPipe hand landmarks to classify ISL alphabet gestures (A-Z).

Usage:
    # Inspect dataset status & scaffold configuration (does not start training):
    python train_model.py

    # Train model once dataset is prepared:
    python train_model.py --train

    # Custom data and output paths:
    python train_model.py --data-dir "dataset/processed" --output-dir "../app/ml/model_data"
"""

import sys
import os
import json
import argparse
from pathlib import Path
from typing import Tuple, Dict, Any, Optional
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix

# Safe stdout encoding for Windows console
if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

CURRENT_DIR = Path(__file__).resolve().parent
AI_SERVICE_ROOT = CURRENT_DIR.parent

# ==============================================================================
# Configuration Defaults (can be overridden via CLI args or environment vars)
# ==============================================================================
DEFAULT_PROCESSED_DATA_DIR = os.getenv(
    "ISL_PROCESSED_DATASET_DIR",
    str(CURRENT_DIR / "dataset" / "processed")
)
DEFAULT_MODEL_OUTPUT_DIR = os.getenv(
    "ISL_MODEL_OUTPUT_DIR",
    str(AI_SERVICE_ROOT / "app" / "ml" / "model_data")
)
DEFAULT_N_ESTIMATORS = 100
DEFAULT_MAX_DEPTH = None
DEFAULT_RANDOM_STATE = 42


def load_data_from_csv_or_npz(data_dir: str) -> Optional[Dict[str, Any]]:
    """
    Loads train, val, and test splits from either dataset_splits.npz or CSV files.
    """
    dir_path = Path(data_dir)
    npz_path = dir_path / "dataset_splits.npz"
    train_csv = dir_path / "train.csv"
    val_csv = dir_path / "val.csv"
    test_csv = dir_path / "test.csv"

    # Prefer compressed .npz if available
    if npz_path.exists():
        data = np.load(npz_path, allow_pickle=True)
        return {
            "X_train": data["X_train"],
            "y_train": data["y_train"],
            "X_val": data["X_val"],
            "y_val": data["y_val"],
            "X_test": data["X_test"],
            "y_test": data["y_test"],
            "classes": data["classes"].tolist(),
        }

    # Fallback to reading CSVs
    if train_csv.exists() and val_csv.exists() and test_csv.exists():
        import csv

        def read_csv(path: Path):
            features, labels = [], []
            with open(path, mode="r", encoding="utf-8") as f:
                reader = csv.reader(f)
                header = next(reader)
                for row in reader:
                    labels.append(row[0])
                    features.append([float(val) for val in row[1:]])
            return np.array(features, dtype=np.float32), np.array(labels)

        X_train, y_train = read_csv(train_csv)
        X_val, y_val = read_csv(val_csv)
        X_test, y_test = read_csv(test_csv)
        classes = sorted(list(set(y_train)))

        return {
            "X_train": X_train,
            "y_train": y_train,
            "X_val": X_val,
            "y_val": y_val,
            "X_test": X_test,
            "y_test": y_test,
            "classes": classes,
        }

    return None


def build_classifier(
    n_estimators: int = DEFAULT_N_ESTIMATORS,
    max_depth: Optional[int] = DEFAULT_MAX_DEPTH,
    random_state: int = DEFAULT_RANDOM_STATE
) -> RandomForestClassifier:
    """
    Constructs and returns the Scikit-learn RandomForestClassifier.
    Configured with balanced class weighting and multi-core parallelism.
    """
    return RandomForestClassifier(
        n_estimators=n_estimators,
        max_depth=max_depth,
        random_state=random_state,
        class_weight="balanced",
        n_jobs=-1
    )


def train_model(
    data: Dict[str, Any],
    output_dir: str = DEFAULT_MODEL_OUTPUT_DIR,
    n_estimators: int = DEFAULT_N_ESTIMATORS,
    random_state: int = DEFAULT_RANDOM_STATE
):
    """
    Executes model training, evaluation across validation and test sets,
    and serializes model artifacts to app/ml/model_data/.
    """
    print("=" * 60)
    print("Training ISL Gesture Classifier (Random Forest)")
    print("=" * 60)

    # Encode string labels into integer indices
    label_encoder = LabelEncoder()
    y_train_enc = label_encoder.fit_transform(data["y_train"])
    y_val_enc = label_encoder.transform(data["y_val"])
    y_test_enc = label_encoder.transform(data["y_test"])

    clf = build_classifier(n_estimators=n_estimators, random_state=random_state)

    print(f"Training on {len(data['X_train'])} samples across {len(label_encoder.classes_)} classes...")
    clf.fit(data["X_train"], y_train_enc)

    # Validation Set Evaluation
    val_preds = clf.predict(data["X_val"])
    val_acc = accuracy_score(y_val_enc, val_preds)
    print(f"Validation Accuracy: {val_acc * 100:.2f}%")

    # Test Set Evaluation
    test_preds = clf.predict(data["X_test"])
    test_acc = accuracy_score(y_test_enc, test_preds)
    print(f"Test Accuracy:       {test_acc * 100:.2f}%")

    print("\nClassification Report (Test Set):")
    print(classification_report(y_test_enc, test_preds, target_names=label_encoder.classes_))

    # Save artifacts
    out_path = Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    model_file = out_path / "isl_model.pkl"
    joblib.dump(clf, model_file)
    print(f"[OK] Trained model saved to: {model_file.resolve()}")

    labels_file = out_path / "labels.json"
    label_map = {int(idx): str(label) for idx, label in enumerate(label_encoder.classes_)}
    with open(labels_file, "w", encoding="utf-8") as f:
        json.dump(label_map, f, indent=2)
    print(f"[OK] Class labels saved to: {labels_file.resolve()}")

    summary_file = out_path / "model_metadata.json"
    summary = {
        "model_type": "RandomForestClassifier",
        "n_estimators": n_estimators,
        "feature_dim": data["X_train"].shape[1],
        "classes": label_encoder.classes_.tolist(),
        "num_classes": len(label_encoder.classes_),
        "val_accuracy": float(val_acc),
        "test_accuracy": float(test_acc),
        "train_samples": len(data["X_train"]),
        "test_samples": len(data["X_test"]),
    }
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)
    print(f"[OK] Model metadata saved to: {summary_file.resolve()}")


def print_scaffold_status(data_dir: str, output_dir: str):
    """
    Displays current dataset and model scaffold status without initiating training.
    """
    print("=" * 60)
    print("ISL Gesture Classifier Training Scaffold (Scikit-learn)")
    print("=" * 60)
    print(f"Configured Processed Dataset Path: {os.path.abspath(data_dir)}")
    print(f"Configured Model Output Path:      {os.path.abspath(output_dir)}")

    data = load_data_from_csv_or_npz(data_dir)

    if data is None:
        print("\n[STATUS] No processed dataset found at configured location.")
        print("\nTo prepare the dataset:")
        print("  1. Place your raw alphabet image folders in:")
        print(f"     {os.path.abspath(Path(data_dir).parent / 'raw')}")
        print("     Structure:")
        print("       raw/")
        print("       ├── A/ (*.jpg, *.png)")
        print("       ├── B/")
        print("       └── ... through Z/")
        print("\n  2. Run the preparation script:")
        print("     python prepare_dataset.py")
        print("\n  3. Then train the model:")
        print("     python train_model.py --train")
    else:
        print("\n[STATUS] Processed dataset found and verified!")
        print(f"  • Training samples:   {data['X_train'].shape[0]}")
        print(f"  • Validation samples: {data['X_val'].shape[0]}")
        print(f"  • Test samples:       {data['X_test'].shape[0]}")
        print(f"  • Feature dimension:  {data['X_train'].shape[1]} (expected 63)")
        print(f"  • Number of classes:  {len(data['classes'])}")
        print(f"  • Classes:            {', '.join(data['classes'][:10])}{'...' if len(data['classes']) > 10 else ''}")
        print("\nTo begin training the RandomForestClassifier, run:")
        print("  python train_model.py --train")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="ISL Gesture Classifier Scaffold")
    parser.add_argument("--data-dir", type=str, default=DEFAULT_PROCESSED_DATA_DIR, help="Path to processed dataset directory")
    parser.add_argument("--output-dir", type=str, default=DEFAULT_MODEL_OUTPUT_DIR, help="Path to save trained model artifacts")
    parser.add_argument("--train", action="store_true", help="Execute model training (do not use until data is ready)")
    parser.add_argument("--n-estimators", type=int, default=DEFAULT_N_ESTIMATORS, help="Number of trees in Random Forest")

    args = parser.parse_args()

    if args.train:
        dataset = load_data_from_csv_or_npz(args.data_dir)
        if dataset is None:
            print(f"[ERROR] Cannot train: no processed dataset found in '{args.data_dir}'.")
            print("Please run prepare_dataset.py first.")
            sys.exit(1)
        train_model(dataset, output_dir=args.output_dir, n_estimators=args.n_estimators)
    else:
        print_scaffold_status(args.data_dir, args.output_dir)
