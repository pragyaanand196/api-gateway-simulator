## ⚙️ Local Setup

### 1. Clone Repository
git clone https://github.com/pragyaanand196/api-gateway-simulator.git

cd api-gateway-simulator

### 2. Create Virtual Environment
python -m venv venv

### 3. Activate Environment

Windows:
.\venv\Scripts\activate

Mac/Linux:
source venv/bin/activate

### 4. Install Dependencies
pip install -r requirements.txt

### 5. Run Backend
uvicorn app.main:app --reload

### 6. Open API Docs
http://127.0.0.1:8000/docs
