"""
Pydantic schemas for the API Gateway Simulator.
These schemas strictly enforce data validation, field ranges, and typing constraints on incoming/outgoing data packets.
"""

from pydantic import BaseModel, Field, field_validator
from typing import Optional, Dict, Any


class ApplicantPayload(BaseModel):
    applicant_id: str = Field(description="Unique system-wide UUID or tracking ID for the applicant.")
    name: str = Field(min_length=2, description="Legal full name of the applicant.")
    credit_score: int = Field(ge=300, le=850, description="Applicant credit ranking score (FICO ranges).")
    annual_income: float = Field(ge=0, description="Annual verifiable income in USD.")
    requested_amount: float = Field(ge=0, description="Sought funding/credit amount in USD.")
    age: int = Field(ge=18, description="Age of applicant. Required legal adulthood constraint.")

    @field_validator("credit_score")
    @classmethod
    def validate_credit_score_range(cls, value: int) -> int:
        if value < 300 or value > 850:
            raise ValueError("Credit score must fall between legal FICO boundaries (300 to 850).")
        return value

    @field_validator("age")
    @classmethod
    def validate_legal_age(cls, value: int) -> int:
        if value < 18:
            raise ValueError("Applicant must be a legal adult aged 18 or above.")
        return value


class EvaluationResult(BaseModel):
    applicant_id: str
    credit_tier: str = Field(description="FICO credit tier: 'excellent', 'good', 'fair', 'poor'.")
    debt_to_income_ratio: float = Field(description="Calculated ratio of requested loans against yearly intake.")
    risk_score: str = Field(description="Aggregate risk evaluation tier: 'low', 'medium', 'high'.")
    evaluated_at: str
    evaluation_id: str
    status: str = "evaluated"


class DecisionInput(BaseModel):
    applicant_id: str
    credit_tier: str
    debt_to_income_ratio: float
    risk_score: str


class DecisionResult(BaseModel):
    applicant_id: str
    status: str = Field(description="Gateway decision outcomes: 'approved', 'rejected', 'manual_review'.")
    assessed_by: str = "DeciderCore-v1"
    reason: str = Field(description="Written decisioning rationale or criteria failure descriptions.")
    timestamp: str
    decision_id: str


class MonitoringPayload(BaseModel):
    tx_flow: str = "simulated_flow"
    result_status: str
    applicant_id: str


class MonitoringResult(BaseModel):
    logged: bool
    correlation_id: str
    applicant_id: str
    captured: Dict[str, str]
    system_status: str = "GREEN"
    metrics_received_at: str


class SimulatedGatewayResponse(BaseModel):
    flow: str = "simulated"
    status: str = Field(description="'success' or 'degraded_success' on monitoring dropouts.")
    transaction_id: str
    evaluation: Dict[str, Any]
    decision: Dict[str, Any]
    monitoring: Dict[str, Any]
