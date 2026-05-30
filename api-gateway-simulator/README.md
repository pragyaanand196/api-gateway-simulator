# API Gateway Simulator (FastAPI Backend Integration)

An enterprise-grade, beginner-friendly API Gateway Simulator designed to demonstrate routing, cascade microservice coordination, Pydantic validation, mock testing pipelines, and network failure patterns.

---

## 📖 Table of Contents
1. [Overview](#-overview)
2. [Architecture Diagram](#%EF%B8%8F-architecture-diagram)
3. [Folder Structure](#-folder-structure)
4. [Aesthetic Themes & Guidelines](#-aesthetic-themes--guidelines)
5. [Prerequisites](#-prerequisites)
6. [Local Installation Setup](#%EF%B8%8F-local-installation-setup)
7. [Running the Application](#-running-the-application)
8. [API Endpoint Explanations](#-api-endpoint-explanations)
9. [Manual Testing (cURL & Postman)](#-manual-testing-curl--postman)
10. [Automated Testing with Pytest](#-automated-testing-with-pytest)
11. [Troubleshooting Common Errors](#-troubleshooting-common-errors)

---

## 🌟 Overview
In enterprise-level banking, insurance, and medical SaaS infrastructures, individual divisions develop backends independently. Before actual microservices undergo real deployment, engineers build **Gateway Simulators** containing mock services. 

This project simulates a **Microservice Loan & Credit Approvals Pipeline**:
1. **API Gateway Service** receives details at `/simulate`.
2. **Evaluation Service** checks the applicant’s credit score and debt margins.
3. **Decision Service** renders an approval decision using rules.
4. **Monitoring Service** logs the transaction status and issues a correlation audit tracer.

---

## 🗺️ Architecture Diagram
```
              [ CLIENT REQUEST ]
                      │
                      ▼
             ┌─────────────────┐
             │   API Gateway   │ (Central Orchestrator)
             └────────┬────────┘
                      │
     ┌────────────────┼────────────────┐
     ▼                ▼                ▼
┌──────────┐     ┌──────────┐     ┌──────────┐
│Evaluation│     │ Decision │     │Monitoring│
│ Service  │     │ Service  │     │ Service  │
│          │     │          │     │          │
│ /eval    │     │ /decision│     │ /monitor │
└──────────┘     └──────────┘     └──────────┘
```

---

## 📂 Folder Structure
The codebase follows standard clean FastAPI architectural layouts:
```
api-gateway-simulator/
│
├── app/
│   ├── __init__.py
│   ├── main.py                # Primary FastAPI application entry point, middleware & CORS
│   ├── gateway/
│   │   ├── __init__.py
│   │   └── routes.py          # Central Gateway Router invoking cascading HTTP calls
│   ├── services/
│   │   ├── __init__.py
│   │   ├── evaluation.py      # Microservice Mock 1: Vetting applicant constraints
│   │   ├── decision.py        # Microservice Mock 2: Approvals underwriting rules
│   │   └── monitoring.py      # Microservice Mock 3: Logs auditer & metrics captured
│   ├── models/
│   │   ├── __init__.py
│   │   └── schemas.py         # Strictly validated Pydantic models for request bodies
│   └── utils/
│       ├── __init__.py
│       └── helpers.py         # Shared latency sleeps, UUID codes, and random failures
│
├── tests/
│   └── test_gateway.py        # Complete Pytest assertion & integration suite
│
├── requirements.txt           # Standard module dependencies
├── README.md                  # Comprehensive beginners manual
├── .env                       # Local environment variables
└── run.sh                     # Automated startup execution script for Mac/Linux
```

---

## ⚡ Prerequisites
- Python installed (Version **3.11** or **3.12** is recommended).
- Git, VS Code (or your preferred IDE), and terminal access.

---

## ⚙️ Local Installation Setup

### 1. Close/Open Folder in VS Code
Open VS Code, press **Ctrl+O** (or **Cmd+O** on Mac), and navigate into the `api-gateway-simulator` root directory.

### 2. Configure Virtual Environment

**On macOS / Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**On Windows (PowerShell):**
```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### 3. Install Dependencies
Ensure you upgraded pip and then install imports:
```bash
pip install -r requirements.txt
```

---

## 🚀 Running the Application

### Option A: Using the Automatic Shell Script (Mac / Linux / WSL)
Grant execution rights to the script, then launch:
```bash
chmod +x run.sh
./run.sh
```

### Option B: Manual Command (Any Platform)
Activate your virtual environment and run Uvicorn manually:
```bash
export PYTHONPATH=.
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```
*(On Windows cmd, run `set PYTHONPATH=.` before running uvicorn)*

Once booted, explore:
- **Root Overview JSON**: `http://localhost:8000/`
- **Interactive OpenAPI/Swagger Interface**: `http://localhost:8000/docs`
- **Alternative ReDoc UI**: `http://localhost:8000/redoc`

---

## 🔌 API Endpoint Explanations

### 1. `POST /simulate`
- **Purpose**: Unified API Gateway entrypoint. Calls downstream Evaluation, Decision, and Monitoring microservices sequentially.
- **Payload Shape**: `ApplicantPayload`
- **Response**: Combined summary of calculations, decisions, and monitoring states.

### 2. `POST /evaluation`
- **Purpose**: Calculates Credit Tiers ("excellent", "good") and debt ratio indexes.
- **Pydantic Criteria Validation**:
  - `credit_score`: bound integers between `300` and `850`.
  - `age`: integer minimum `18`. Underage applicants trigger validation exceptions.

### 3. `POST /decision`
- **Purpose**: Direct risk assessment. Approves, Rejects, or channels to Manual Review.

### 4. `POST /monitoring`
- **Purpose**: Logs transactions in the logging database and outputs correlation IDs.

---

## 🧪 Manual Testing (cURL & Postman)

### 1. Success Cascade Simulation
Submit a robust loan application profile to the Gateway Orchestration Endpoint (`/simulate`):
```bash
curl -X 'POST' \
  'http://localhost:8000/simulate' \
  -H 'accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
  "applicant_id": "APP-USR-77",
  "name": "Marcus Aurelius",
  "credit_score": 790,
  "annual_income": 160000.0,
  "requested_amount": 20000.0,
  "age": 42
}'
```
**Expected Output (HTTP 200 OK):**
```json
{
  "flow": "simulated",
  "status": "success",
  "transaction_id": "TXN-83F9C7D4",
  "evaluation": {
    "result": "good",
    "credit_tier": "excellent",
    "risk_score": "low",
    "evaluation_id": "EVL-DF831A"
  },
  "decision": {
    "status": "approved",
    "decision_id": "DEC-C738FE2",
    "reason": "Risk score and financial parameters reside perfectly within criteria range."
  },
  "monitoring": {
    "logged": true,
    "correlation_id": "COR-73AB890"
  }
}
```

### 2. Triggering Pydantic Validation Errors
Submit a profile with an invalid underage parameter (`age=16`), causing a failure:
```bash
curl -X 'POST' \
  'http://localhost:8000/simulate' \
  -H 'Content-Type: application/json' \
  -d '{
  "applicant_id": "APP-MINOR-02",
  "name": "Tommy Underwood",
  "credit_score": 750,
  "annual_income": 50000.0,
  "requested_amount": 10000.0,
  "age": 16
}'
```
**Expected Output (HTTP 422 Unprocessable Entity):**
```json
{
  "detail": [
    {
      "loc": ["body", "age"],
      "msg": "Input should be greater than or equal to 18",
      "type": "greater_than_equal"
    }
  ],
  "status_code": 422,
  "message": "Pydantic validator constraints on applicant payload failed basic range checks."
}
```

### 3. Simulated Downstream Outage Testing (5xx Propagation)
Simulate network failure rates by passing custom `X-Simulate-Failure-Rate` Headers! This forces the Evaluation Service to simulate a 503 Outage:
```bash
curl -X 'POST' \
  'http://localhost:8000/simulate' \
  -H 'Content-Type: application/json' \
  -H 'X-Simulate-Failure-Rate: 100.0' \
  -d '{
  "applicant_id": "APP-USR-18",
  "name": "Lucius Vetus",
  "credit_score": 700,
  "annual_income": 90000.0,
  "requested_amount": 15000.0,
  "age": 30
}'
```
**Expected Output (HTTP 502 Bad Gateway):**
```json
{
  "detail": "Bad Gateway: Could not resolve connection to Evaluation service."
}
```

---

## 🛠️ Automated Testing with Pytest
Automated testing is highly critical for microservice developers. We run tests using `pytest` inside the root:
```bash
# Run all unit and integration test assertions
pytest -v
```

---

## 🔎 Troubleshooting Common Errors

### 1. `ModuleNotFoundError: No module named 'app'`
This occurs when the terminal shell doesn't recognize the current execution path in its registry. 
- **Fix**: Run `export PYTHONPATH=.` on Mac/Linux or `set PYTHONPATH=.` on Windows cmd prior to running Uvicorn. Alternatively, execute using `run.sh` which exports this automatically!

### 2. `Address already in use` (Port conflict)
Another server is occupying Port `8000`.
- **Fix**: Direct Uvicorn to run on an alternative free port like `8001`:
  ```bash
  uvicorn app.main:app --port 8001 --reload
  ```

---
**API Gateway Simulator is production-ready for developer evaluations! Happy simulation hacking!**
