# ⚙️ Setup and Run Instructions

## Prerequisites

Before running the project, ensure the following are installed:

- Python 3.11 or higher
- Node.js (v18+ recommended)
- npm
- Git
- Visual Studio Code

Verify installations:

```bash
python --version
node --version
npm --version
git --version
```

---

# 📥 Clone Repository

```bash
git clone https://github.com/pragyaanand196/api-gateway-simulator.git
cd api-gateway-simulator
```

---

# 🖥️ Frontend Setup (Vite + TypeScript)

Install dependencies:

```bash
npm install
```

Start development server:

```bash
npm run dev
```

Expected Output:

```text
VITE vX.X.X ready

➜ Local: http://localhost:5173/
```

Open browser:

```text
http://localhost:5173
```

---

# 🐍 Backend Setup (FastAPI)

Navigate to backend directory:

```bash
cd api-gateway-simulator
```

Create virtual environment:

### Windows PowerShell

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

---

# 📦 Install Python Dependencies

```bash
pip install --upgrade pip
pip install -r requirements.txt
```

---

# 🚀 Run FastAPI Server

### Windows PowerShell

```powershell
$env:PYTHONPATH="."
uvicorn app.main:app --reload --port 8000
```

### Linux / macOS

```bash
export PYTHONPATH=.
uvicorn app.main:app --reload --port 8000
```

Expected Output:

```text
INFO: Uvicorn running on http://127.0.0.1:8000
INFO: Started reloader process
INFO: Application startup complete
```

---

# 📚 API Documentation

Swagger UI:

```text
http://localhost:8000/docs
```

ReDoc:

```text
http://localhost:8000/redoc
```

---

# 🧪 Running Tests

Execute:

```bash
pytest
```

Expected Output:

```text
=========================
7 passed
=========================
```

---

# 🔍 Troubleshooting

## ModuleNotFoundError: No module named 'app'

Windows:

```powershell
$env:PYTHONPATH="."
uvicorn app.main:app --reload
```

Linux/macOS:

```bash
export PYTHONPATH=.
uvicorn app.main:app --reload
```

---

## Port Already In Use

Run on a different port:

```bash
uvicorn app.main:app --reload --port 8005
```

Access:

```text
http://localhost:8005/docs
```

---

## Virtual Environment Activation Error

Windows PowerShell:

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

Then:

```powershell
.\venv\Scripts\Activate.ps1
```

---

# 📊 Example Workflow

1. Open the frontend dashboard.
2. Select an applicant preset.
3. Modify applicant details if needed.
4. Configure latency or fault injection.
5. Click **Run Gateway Cascade**.
6. Observe:
   - Evaluation Service
   - Decision Service
   - Monitoring Service
   - Gateway Response JSON
   - Telemetry Logs
7. Review the final aggregated response.

---

# ✅ Successful Execution

A successful workflow returns:

```json
{
  "flow": "simulated",
  "status": "success",
  "evaluation": {
    "risk": "LOW"
  },
  "decision": {
    "status": "APPROVED"
  },
  "monitoring": {
    "logged": true
  }
}
```
