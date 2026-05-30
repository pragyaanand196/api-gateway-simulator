"""
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

# Resolve target microservice URLs from environment configs
EVALUATION_SERVICE_URL = os.getenv("EVALUATION_SERVICE_URL", "http://localhost:8000/evaluation")
DECISION_SERVICE_URL = os.getenv("DECISION_SERVICE_URL", "http://localhost:8000/decision")
MONITORING_SERVICE_URL = os.getenv("MONITORING_SERVICE_URL", "http://localhost:8000/monitoring")


@router.post(
    "/simulate",
    response_model=SimulatedGatewayResponse,
    status_code=status.HTTP_200_OK,
    summary="Coordinate a full microservice verification simulation"
)
async def simulate_gateway_flow(
    payload: ApplicantPayload,
    x_simulate_failure_rate: float = Header(default=0.0, convert_underscores=True),
    x_simulate_delay: int = Header(default=150, convert_underscores=True)
):
    transaction_id = generate_short_uuid("TXN")
    logger.info(f"--- START GATEWAY TRANSACTION {transaction_id} ---")
    logger.info(f"Incoming payload: applicant_id={payload.applicant_id} name={payload.name}")

    start_time = time.time()
    
    # Standard custom client options to forward to downstreams to simulate failures
    custom_headers = {
        "x-request-id": transaction_id,
        "x-simulate-failure-rate": str(x_simulate_failure_rate),
        "x-simulate-delay": str(x_simulate_delay)
    }

    # Establish Async HTTP client for high-performance requests
    # Limit timeout to 3 seconds to guarantee robust edge-case timeout triggers if service hangs!
    limits = httpx.Limits(max_keepalive_connections=5, max_connections=10)
    async with httpx.AsyncClient(headers=custom_headers, timeout=3.0, limits=limits) as client:
        
        # --- STEP 1: Invoke Evaluation Microservice ---
        logger.info(f"Step 1: Outboxing applicant info to Evaluation Service at {EVALUATION_SERVICE_URL}")
        try:
            eval_response = await client.post(EVALUATION_SERVICE_URL, json=payload.model_dump())
            
            if eval_response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY:
                logger.warn(f"Evaluation service reported payload validation crash (422).")
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail=eval_response.json().get("detail", "Input parameter constraint failed in Evaluation service.")
                )
                
            if eval_response.status_code != status.HTTP_200_OK:
                logger.error(f"Evaluation returned error code: {eval_response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Bad Gateway: Evaluation Service returned status {eval_response.status_code}"
                )
                
            eval_data = eval_response.json()
            logger.info("Step 1 OK: Evaluation data captured successfully.")
            
        except httpx.TimeoutException:
            logger.error("Step 1 Link Timeout: Evaluation service failed to respond within 3.0s.")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Gateway Timeout: Evaluation service exceeded maximum threshold budget."
            )
        except httpx.RequestError as exc:
            logger.error(f"Step 1 Network Error: Connection refused to Evaluation service: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Bad Gateway: Could not resolve connection to Evaluation service."
            )

        # --- STEP 2: Invoke Decision Microservice ---
        logger.info(f"Step 2: Forwarding profile parameters to Decision Service at {DECISION_SERVICE_URL}")
        decision_payload = {
            "applicant_id": eval_data["applicant_id"],
            "credit_tier": eval_data["credit_tier"],
            "debt_to_income_ratio": eval_data["debt_to_income_ratio"],
            "risk_score": eval_data["risk_score"]
        }
        
        try:
            dec_response = await client.post(DECISION_SERVICE_URL, json=decision_payload)
            
            if dec_response.status_code != status.HTTP_200_OK:
                logger.error(f"Decision returned error code: {dec_response.status_code}")
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"Bad Gateway: Decision Service returned status {dec_response.status_code}"
                )
                
            decision_data = dec_response.json()
            logger.info("Step 2 OK: Lending decisions approved.")
            
        except httpx.TimeoutException:
            logger.error("Step 2 Link Timeout: Decision service crashed due to timeout limits.")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail="Gateway Timeout: Decision service exceeded maximum threshold budget."
            )
        except httpx.RequestError as exc:
            logger.error(f"Step 2 Network Error: Connection refused to Decision service: {exc}")
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Bad Gateway: Could not resolve connection to Decision service."
            )

        # --- STEP 3: Invoke Audit Log Monitoring Microservice ---
        logger.info(f"Step 3: Staging compliance log to Telemetry service at {MONITORING_SERVICE_URL}")
        monitoring_payload = {
            "tx_flow": "api_gateway_simulation",
            "result_status": decision_data["status"],
            "applicant_id": payload.applicant_id
        }
        
        # Note: API Gateway is structured with high availability. If the Monitoring service alone falls 
        # out of service, the Gateway returns a "degraded_success" state with business decisions intact,
        # rather than returning a 5xx bad crash to the applicant client!
        monitoring_logged = True
        correlation_id = None
        
        try:
            mon_response = await client.post(MONITORING_SERVICE_URL, json=monitoring_payload)
            if mon_response.status_code == status.HTTP_201_CREATED:
                mon_data = mon_response.json()
                correlation_id = mon_data["correlation_id"]
                logger.info(f"Step 3 OK: Compliance trace registered. Correlation: {correlation_id}")
            else:
                logger.warn(f"Step 3 Warning: Telemetry failed with status {mon_response.status_code}. Flow continuing in degraded mode.")
                monitoring_logged = False
        except Exception as exc:
            logger.warn(f"Step 3 Degradation Warning: Telemetry connection degraded: {exc}. Continuing flow.")
            monitoring_logged = False

    elapsed_time = round((time.time() - start_time) * 1000, 2)
    logger.info(f"--- COMPLETED GATEWAY TRANSACTION {transaction_id} IN {elapsed_time}ms ---")

    # Combine response conforming to expectations
    return SimulatedGatewayResponse(
        flow="simulated",
        status="success" if monitoring_logged else "degraded_success",
        transaction_id=transaction_id,
        evaluation={
            "result": "bad" if eval_data["risk_score"] == "high" else "good",
            "credit_tier": eval_data["credit_tier"],
            "risk_score": eval_data["risk_score"],
            "evaluation_id": eval_data["evaluation_id"]
        },
        decision={
            "status": decision_data["status"],
            "decision_id": decision_data["decision_id"],
            "reason": decision_data["reason"]
        },
        monitoring={
            "logged": monitoring_logged,
            "correlation_id": correlation_id
        }
    )
