import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.metrics import accuracy_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split
from xgboost import XGBClassifier

BASE_DIR = Path(__file__).resolve().parent
DATASET_PATH = BASE_DIR / "data" / "UAVIDS-2025.csv"
MODEL_DIR = BASE_DIR / "models"
MODEL_DIR.mkdir(exist_ok=True)
MODEL_PATH = MODEL_DIR / "xgboost_tuned_model.joblib"
METADATA_PATH = MODEL_DIR / "xgboost_tuned_model_meta.json"


def build_feature_frame(df: pd.DataFrame) -> pd.DataFrame:
    working = df.copy()

    for col in ["Protocol"]:
        if col in working.columns:
            working[col] = working[col].astype(str).str.strip()
            unique_values = sorted({value for value in working[col].dropna().tolist()})
            mapping = {value: index for index, value in enumerate(unique_values)}
            working[col] = working[col].map(mapping).fillna(-1)

    feature_columns = [
        col
        for col in working.columns
        if col not in {"label", "Label", "flow_id", "FlowID", "SrcAddr", "DstAddr", "SrcPort", "DstPort"}
    ]

    features = working[feature_columns].copy()
    features = features.apply(pd.to_numeric, errors="coerce").fillna(0)
    return features


def train_xgboost_tuned_model(dataset_path: Path = DATASET_PATH):
    df = pd.read_csv(dataset_path)

    if "label" not in df.columns and "Label" in df.columns:
        df = df.rename(columns={"Label": "label"})

    if "label" not in df.columns:
        raise ValueError("Dataset must contain a label column")

    features = build_feature_frame(df)
    labels = df["label"].astype(str)

    X_train, X_test, y_train, y_test = train_test_split(
        features,
        labels,
        test_size=0.2,
        stratify=labels,
        random_state=42,
    )

    model = XGBClassifier(
        objective="multi:softprob",
        eval_metric="mlogloss",
        n_estimators=220,
        max_depth=8,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        gamma=0.1,
        min_child_weight=3,
        random_state=42,
        n_jobs=-1,
        tree_method="hist",
    )

    model.fit(X_train, y_train)
    predictions = model.predict(X_test)

    metrics = {
        "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
        "precision": round(float(precision_score(y_test, predictions, average="weighted", zero_division=0)), 4),
        "recall": round(float(recall_score(y_test, predictions, average="weighted", zero_division=0)), 4),
        "f1": round(float(f1_score(y_test, predictions, average="weighted", zero_division=0)), 4),
    }

    bundle = {
        "model": model,
        "feature_columns": list(features.columns),
        "metrics": metrics,
    }
    joblib.dump(bundle, MODEL_PATH)
    METADATA_PATH.write_text(json.dumps(metrics, indent=2), encoding="utf-8")
    return bundle


if __name__ == "__main__":
    train_xgboost_tuned_model()
    print(f"Trained model saved to {MODEL_PATH}")
