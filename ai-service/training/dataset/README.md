# ISL Alphabet Dataset Directory

This directory houses the raw image dataset and processed landmark feature splits.

---

## 📁 Expected Local Directory Structure

Place your ISL alphabet dataset inside the `raw/` directory:

```text
ai-service/training/dataset/
├── raw/
│   ├── A/
│   │   ├── img_001.jpg
│   │   ├── img_002.jpg
│   │   └── ...
│   ├── B/
│   ├── C/
│   └── ... through Z/
└── processed/               # Generated automatically by prepare_dataset.py
    ├── train.csv            # 70% of samples (label, f0..f62)
    ├── val.csv              # 15% of samples
    ├── test.csv             # 15% of samples
    ├── dataset_splits.npz   # Compressed NumPy archive
    └── metadata.json        # Class counts and extraction statistics
```

---

## ⚙️ How to Process the Dataset

1. Place your extracted alphabet folders (`A` through `Z`) into `training/dataset/raw/`.
2. Activate the Python virtual environment:
   ```powershell
   cd ai-service
   .\.venv\Scripts\activate
   ```
3. Run the dataset preparation script:
   ```powershell
   python training/prepare_dataset.py
   ```
   *Custom input path:*
   ```powershell
   python training/prepare_dataset.py --input-dir "D:/path/to/your/dataset"
   ```

---

## 🧠 How to Train the Model

Once `prepare_dataset.py` has generated the processed files:

```powershell
# Inspect dataset status:
python training/train_model.py

# Train the RandomForestClassifier:
python training/train_model.py --train
```
Trained model artifacts (`isl_model.pkl` and `labels.json`) will be saved into `app/ml/model_data/`.
