import { ApplicantPreset } from "./types";

export const APPLICANT_PRESETS: ApplicantPreset[] = [
  {
    id: "preset-excellent",
    label: "Excellent Credit (Approved)",
    description: "FICO score of 800 with healthy debt-to-income margin. Approved instantly.",
    payload: {
      applicant_id: "APP-EXC-001",
      name: "Marcus Aurelius",
      credit_score: 800,
      annual_income: 154000,
      requested_amount: 15000,
      age: 43,
    },
  },
  {
    id: "preset-borderline",
    label: "Fair Credit & High Debt (Manual Review)",
    description: "FICO 610 with borderline debt ratios, forwarding request to Manual Review queue.",
    payload: {
      applicant_id: "APP-REV-204",
      name: "Galen of Pergamum",
      credit_score: 610,
      annual_income: 75000,
      requested_amount: 28000,
      age: 29,
    },
  },
  {
    id: "preset-highrisk",
    label: "Poor Credit (Rejected)",
    description: "FICO under 500 automatically flags as High Risk profile, trigger failure output.",
    payload: {
      applicant_id: "APP-REJ-903",
      name: "Commodus Caesar",
      credit_score: 410,
      annual_income: 60000,
      requested_amount: 45000,
      age: 31,
    },
  },
  {
    id: "preset-underage",
    label: "Underage Applicant (Pydantic Fail)",
    description: "Age 15 fails Pydantic validator constraint rule (min age 18) returning HTTP 422.",
    payload: {
      applicant_id: "APP-MIN-512",
      name: "Tommy Underwood",
      credit_score: 720,
      annual_income: 30000,
      requested_amount: 5000,
      age: 15,
    },
  },
  {
    id: "preset-badfico",
    label: "Invalid FICO Score (Pydantic Fail)",
    description: "FICO score of 200 is outside legal boundaries (300-850), triggering HTTP 422.",
    payload: {
      applicant_id: "APP-FIC-808",
      name: "Lucius Verus",
      credit_score: 200,
      annual_income: 110000,
      requested_amount: 20000,
      age: 35,
    },
  },
];


export const PYTHON_CODE_FILES = [
  {
    path: "api-gateway-simulator/app/main.py",
    language: "python",
    description: "FastAPI server entrypoint establishing logging, CORS, API routers, and global exception handlers.",
    code: `"""
Primary FastAPI Application Entrypoint.
Wires up the decentralized routers into a unified testing server, Configures CORS, 
OpenAPI Swagger schema descriptions, and centralized error middleware.
"""

import time
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import ValidationError

from app.services import evaluation, decision, monitoring
from app.gateway import routes
from app.utils.helpers import logger

app = FastAPI(
    title="API Gateway Simulator",
    description="An enterprise-grade, beginner-friendly simulation and sandboxed microservice orchestra...",
    version="1.0.0",
    docs_url="/docs"
)

# Host setup for Cross-Origin resource sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Unified Transaction performance profiling and logging middleware
@app.middleware("http")
async def log_transaction_speeds(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration = time.time() - start_time
    logger.info(
        f"API Profile: {request.method} {request.url.path} Completed status {response.status_code} path duration: {round(duration * 1000, 2)}ms"
    )
    return response

# Centralized exception handling middleware for robustness
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "Simulator runtime error detected: " + str(exc), "status_code": 500}
    )

# Integrate subservices routers under standard routes
app.include_router(evaluation.router)
app.include_router(decision.router)
app.include_router(monitoring.router)
app.include_router(routes.router)`
  },
  {
    path: "api-gateway-simulator/app/gateway/routes.py",
    language: "python",
    description: "Central orchestrator which takes incoming payloads, schedules asyncio connections, and handles downstream exceptions.",
    code: `"""
API Gateway Simulator Router.
Endpoint: /simulate
Coordinates requests across nested microservices (Evaluation -> Decision -> Monitoring), 
handling timeouts, standard errors, and fallback sequences gracefully.
"""

import os
import time
import httpx
from fastapi import APIRouter, HTTPException, Header, status
from app.models.schemas import ApplicantPayload, SimulatedGatewayResponse
from app.utils.helpers import logger, generate_short_uuid

router = APIRouter(tags=["API Gateway Router"])

EVALUATION_SERVICE_URL = os.getenv("EVALUATION_SERVICE_URL")
DECISION_SERVICE_URL = os.getenv("DECISION_SERVICE_URL")
MONITORING_SERVICE_URL = os.getenv("MONITORING_SERVICE_URL")

@router.post("/simulate", response_model=SimulatedGatewayResponse)
async def simulate_gateway_flow(payload: ApplicantPayload, x_simulate_failure_rate: float = Header(default=0.0)):
    transaction_id = generate_short_uuid("TXN")
    logger.info(f"--- START GATEWAY TRANSACTION {transaction_id} ---")
    
    async with httpx.AsyncClient(timeout=3.0) as client:
        # Step 1: Call Evaluation Service
        try:
            eval_resp = await client.post(EVALUATION_SERVICE_URL, json=payload.model_dump())
            eval_data = eval_resp.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail="Bad Gateway: Evaluation Service connection refused.")
            
        # Step 2: Call Decision Service
        try:
            dec_resp = await client.post(DECISION_SERVICE_URL, json=eval_data)
            decision_data = dec_resp.json()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=502, detail="Bad Gateway: Decision core system failure.")

        # Step 3: Call Monitoring Service
        monitoring_logged = True
        try:
            await client.post(MONITORING_SERVICE_URL, json={"tx_flow": "simulated", "result_status": decision_data["status"]})
        except Exception:
            monitoring_logged = False # Swallowed exception to maintain degraded transaction availability

    return SimulatedGatewayResponse(
        flow="simulated",
        status="success" if monitoring_logged else "degraded_success",
        transaction_id=transaction_id,
        evaluation=eval_data,
        decision=decision_data,
        monitoring={"logged": monitoring_logged}
    )`
  },
  {
    path: "api-gateway-simulator/app/services/evaluation.py",
    language: "python",
    description: "Evaluation service vetting age limits, calculating debt-to-income and rating FICO risk score profiles.",
    code: `"""
Evaluation Microservice Mock.
Endpoint: /evaluation
Performs initial vetting, credit checks, debt estimations, and risk score assignments.
"""

from fastapi import APIRouter, HTTPException, Header, status
from datetime import datetime
from app.models.schemas import ApplicantPayload, EvaluationResult
from app.utils.helpers logger, simulate_delay_ms, evaluate_simulated_failure, generate_short_uuid

router = APIRouter(tags=["Evaluation Service"])

@router.post("/evaluation", response_model=EvaluationResult)
async def evaluate_applicant(payload: ApplicantPayload, x_simulate_delay: int = Header(default=150)):
    # 1. Simulate Latency
    await simulate_delay_ms(x_simulate_delay)

    # 2. Handle Business Evaluation Criteria
    credit_score = payload.credit_score
    credit_tier = "poor"
    if credit_score >= 720: credit_tier = "excellent"
    elif credit_score >= 650: credit_tier = "good"
    elif credit_score >= 580: credit_tier = "fair"

    dti_ratio = payload.requested_amount / payload.annual_income if payload.annual_income > 0 else 0.0

    risk_score = "low"
    if credit_tier == "poor" or dti_ratio > 0.5: risk_score = "high"
    elif credit_tier == "fair" or dti_ratio > 0.25: risk_score = "medium"

    return EvaluationResult(
        applicant_id=payload.applicant_id,
        credit_tier=credit_tier,
        debt_to_income_ratio=round(dti_ratio, 3),
        risk_score=risk_score,
        evaluated_at=datetime.utcnow().isoformat() + "Z",
        evaluation_id=generate_short_uuid("EVL")
    )`
  },
  {
    path: "api-gateway-simulator/app/models/schemas.py",
    language: "python",
    description: "Strict Pydantic type validators and range verifications ensuring data sanctity before ingestion.",
    code: `from pydantic import BaseModel, Field, field_validator

class ApplicantPayload(BaseModel):
    applicant_id: str = Field(description="Unique system-wide UUID or tracking ID")
    name: str = Field(min_length=2, description="Legal full name")
    credit_score: int = Field(ge=300, le=850, description="Applicant credit score")
    annual_income: float = Field(ge=0, description="Annual income")
    requested_amount: float = Field(ge=0, description="Sought funding size")
    age: int = Field(ge=18, description="Adulthood age check")

    @field_validator("credit_score")
    @classmethod
    Def validate_credit_score(cls, value: int) -> int:
        if value < 300 or value > 850:
            raise ValueError("Credit score must fall between FICO limits 300 to 850.")
        return value

    @field_validator("age")
    @classmethod
    Def validate_age(cls, value: int) -> int:
        if value < 18:
            raise ValueError("Applicant must be a legal adult aged 18 or above.")
        return value`
  }
];
