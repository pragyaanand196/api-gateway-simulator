"""
Evaluation Microservice Mock.
Endpoint: /evaluation
Performs initial vetting, credit checks, debt estimations, and risk score assignments.
Supports custom failure overrides via HTTP Headers for simulation flexibility.
"""

from fastapi import APIRouter, HTTPException, Header, status
from datetime import datetime
from app.models.schemas import ApplicantPayload, EvaluationResult
from app.utils.helpers import logger, simulate_delay_ms, evaluate_simulated_failure, generate_short_uuid

router = APIRouter(tags=["Evaluation Service"])


@router.post(
    "/evaluation",
    response_model=EvaluationResult,
    status_code=status.HTTP_200_OK,
    summary="Evaluate applicant credit and health risk profile"
)
async def evaluate_applicant(
    payload: ApplicantPayload,
    x_simulate_failure_rate: float = Header(default=0.0, convert_underscores=True),
    x_simulate_delay: int = Header(default=150, convert_underscores=True)
):
    logger.info(f"Evaluation request started for applicant: {payload.applicant_id}")

    # 1. Simulate Latency / Sleep delay
    if x_simulate_delay > 0:
        await simulate_delay_ms(x_simulate_delay)

    # 2. Simulate Service Outages / Failures
    if evaluate_simulated_failure(x_simulate_failure_rate):
        logger.error(f"Simulating Service Failure: Evaluation service is down.")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Evaluation Service temporarily unavailable (Simulated Outage)"
        )

    # 3. Handle Business Evaluation Criteria
    # Excellent (>=720), Good (650-719), Fair (580-649), Poor (<580)
    credit_score = payload.credit_score
    credit_tier = "poor"
    if credit_score >= 720:
        credit_tier = "excellent"
    elif credit_score >= 650:
        credit_tier = "good"
    elif credit_score >= 580:
        credit_tier = "fair"

    # Debt-to-income calculated as loan size / yearly income
    dti_ratio = 0.0
    if payload.annual_income > 0:
        dti_ratio = payload.requested_amount / payload.annual_income

    # Assess overall credit/amount risk
    risk_score = "low"
    if credit_tier == "poor" or dti_ratio > 0.5:
        risk_score = "high"
    elif credit_tier == "fair" or dti_ratio > 0.25:
        risk_score = "medium"

    result = EvaluationResult(
        applicant_id=payload.applicant_id,
        credit_tier=credit_tier,
        debt_to_income_ratio=round(dti_ratio, 3),
        risk_score=risk_score,
        evaluated_at=datetime.utcnow().isoformat() + "Z",
        evaluation_id=generate_short_uuid("EVL"),
        status="evaluated"
    )

    logger.info(f"Evaluation complete for applicant {payload.applicant_id}. Risk assessed as '{risk_score.upper()}'.")
    return result
