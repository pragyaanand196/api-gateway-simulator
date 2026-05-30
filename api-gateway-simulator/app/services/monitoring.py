"""
Monitoring/Telemetry Microservice Mock.
Endpoint: /monitoring
Receives transaction summaries and archives auditing payloads safely in database structures.
"""

from fastapi import APIRouter, HTTPException, Header, status
from datetime import datetime
from app.models.schemas import MonitoringPayload, MonitoringResult
from app.utils.helpers import logger, simulate_delay_ms, evaluate_simulated_failure, generate_short_uuid

router = APIRouter(tags=["Monitoring Service"])


@router.post(
    "/monitoring",
    response_model=MonitoringResult,
    status_code=status.HTTP_201_CREATED,
    summary="Record compliance and monitoring transaction log"
)
async def monitor_transaction(
    payload: MonitoringPayload,
    x_simulate_failure_rate: float = Header(default=0.0, convert_underscores=True),
    x_simulate_delay: int = Header(default=50, convert_underscores=True)
):
    logger.info(f"Monitoring log registration started for applicant: {payload.applicant_id}")

    # 1. Simulate Latency / Sleep delay
    if x_simulate_delay > 0:
        await simulate_delay_ms(x_simulate_delay)

    # 2. Simulate Service failures
    if evaluate_simulated_failure(x_simulate_failure_rate):
        logger.error(f"Simulating Service Failure: Log database transaction lock failure.")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Auditing DB layer failure (Simulated Database Lock error)"
        )

    # 3. Form compliance capture response
    result = MonitoringResult(
        logged=True,
        correlation_id=generate_short_uuid("COR"),
        applicant_id=payload.applicant_id,
        captured={
            "flow": payload.tx_flow,
            "status": payload.result_status
        },
        system_status="GREEN",
        metrics_received_at=datetime.utcnow().isoformat() + "Z"
    )

    logger.info(f"Monitoring log registry completed under correlation: {result.correlation_id}")
    return result
