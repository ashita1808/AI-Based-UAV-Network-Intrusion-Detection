# AI-UAV-IDS

## Overview
AI-UAV-IDS is a simple machine-learning project for detecting suspicious or malicious activity in UAV network traffic. The repository is structured to support data exploration, model training, and a lightweight application interface.

## Project Goals
- Analyze UAV network traffic data
- Build and train an intrusion detection model
- Provide a simple app interface for inference
- Document the workflow for experimentation and future improvement

## Repository Structure
- `app.py` - Application entry point for the project
- `train_model.py` - Script for training the detection model
- `requirements.txt` - Python dependencies
- `data/UAVIDS-2025.csv` - Dataset used for analysis and training
- `notebooks/analysis.ipynb` - Jupyter notebook for exploratory data analysis

## Setup
1. Create and activate a Python environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Open the notebook in `notebooks/analysis.ipynb` to inspect the data.

## Usage
### Train the model
```bash
python train_model.py
```

### Run the app
```bash
python app.py
```

## Dataset
The dataset is stored in `data/UAVIDS-2025.csv` and is intended for intrusion detection experiments on UAV network data.

g