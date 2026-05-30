"""
Decision Microservice Mock.
Endpoint: /decision
Evaluates risk output from the Evaluation service and returns approval, rejection, or structural manual review statuses.
Supports custom failure overrides via HTTP Headers for simulation flexibility.
"""

from fastapi import APIRouter, HTTPException, Header, status
from datetime import datetime
from app.models.schemas import DecisionInput, DecisionResult
from app.utils.helpers import logger, simulate_delay_ms, evaluate_simulated_failure, generate_short_uuid

router = APIRouter(tags=["Decision Service"])


@router.post(
    "/decision",
    response_model=DecisionResult,
    status_code=status.HTTP_200_OK,
    summary="Make a lending decision based on evaluated risk data"
)
async def make_decision(
    payload: DecisionInput,
    x_simulate_failure_rate: float = Header(default=0.0, convert_underscores=True),
    x_simulate_delay: int = Header(default=100, convert_underscores=True)
):
    logger.info(f"Decision request started for applicant: {payload.applicant_id}")

    # 1. Simulate Latency / Sleep delay
    if x_simulate_delay > 0:
        await simulate_delay_ms(x_simulate_delay)

    # 2. Simulate Service Outages / Failures
    if evaluate_simulated_failure(x_simulate_failure_rate):
        logger.error(f"Simulating Service Failure: Decision service server crash.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Decision Core system failure (Simulated Breakdown)"
        )

    # 3. Decision Tree Logic matching business guidelines
    approval_status = "approved"
    reason = "Risk score and financial parameters reside perfectly within criteria range."

    if payload.risk_score == "high":
        approval_status = "rejected"
        reason = "Applicant rejected: Risk assessment criteria deemed high risk."
    elif payload.debt_to_income_ratio > 0.4:
        approval_status = "manual_review"
        reason = "Referred to manual credit desk review: Debt-to-income exceeds 40% rule."
    elif payload.credit_tier == "fair" and payload.risk_score == "medium":
        approval_status = "manual_review"
        reason = "Referred to manual desk: Fair credit combined with borderline medium risk rating."

    result = DecisionResult(
        applicant_id=payload.applicant_id,
        status=approval_status,
        assessed_by="DeciderCore-v1",
        reason=reason,
        timestamp=datetime.utcnow().isoformat() + "Z",
        decision_id=generate_short_uuid("DEC")
    )

    logger.info(f"Decision complete for applicant {payload.applicant_id}. Output: {approval_status.upper()}")
    return result
