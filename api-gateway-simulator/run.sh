#!/bin/bash

# --- API GATEWAY SIMULATOR LOCAL RUNNER SCRIPT ---
# This script handles automated virtualenv creation, dependency sync, and boots Uvicorn.
# Suitable for execution in Mac, Linux, or VS Code integrated terminals.

echo "===================================================="
echo "      API Gateway Simulator Bootloader Initializing  "
echo "===================================================="

# Step 1: Detect Python 3
if ! command -v python3 &> /dev/null
then
    echo "ERROR: python3 could not be found."
    echo "Please download and install Python 3.11+ before running."
    exit 1
fi

# Step 2: Establish Virtual Environment
if [ ! -d "venv" ]; then
    echo "[1/3] Creating virtual environment (.venv)..."
    python3 -m venv venv
else
    echo "[1/3] Virtual environment (.venv) already exists."
fi

# Activate virtual environment
source venv/bin/activate

# Step 3: Sync dependencies
echo "[2/3] Checking & Installing dependencies from requirements.txt..."
pip install --upgrade pip
pip install -r requirements.txt

# Step 4: Boot FastAPI Application with Uvicorn
echo "[3/3] Launching Uvicorn Server on http://localhost:8000 ..."
echo "Interactive Swagger Docs will be available at: http://localhost:8000/docs"
echo "Press Ctrl+C to terminate the simulation server."
echo "===================================================="

# Export python path to recognize app folder correctly
export PYTHONPATH=$PYTHONPATH:.

uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
