"""
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
    description=(
        "An enterprise-grade, beginner-friendly simulation and sandboxed microservice orchestra "
        "modelling full-cascaded backend flows, timeouts, failures, and routing rules."
    ),
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Host setup for Cross-Origin resource sharing (CORS) or Web dashboards
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
        f"API Call Profile: {request.method} {request.url.path} "
        f"| Completed Status: {response.status_code} | Duration: {round(duration * 1000, 2)}ms"
    )
    return response


# Centralized exception handling middleware for robustness
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Centralized Crash Catch: Unresolved system exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": "Simulator runtime error detected: " + str(exc),
            "status_code": 500,
            "error_type": exc.__class__.__name__
        }
    )


# Centralized validation constraint override for custom Pydantic failures
@app.exception_handler(ValidationError)
async def pydantic_validation_handler(request: Request, exc: ValidationError):
    logger.warn(f"Pydantic Validation exception handler triggered.")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": exc.errors(),
            "status_code": 422,
            "message": "Pydantic validator constraints on applicant payload failed basic range checks."
        }
    )


# Integrate subservices routers under standard routes
app.include_router(evaluation.router)
app.include_router(decision.router)
app.include_router(monitoring.router)
app.include_router(routes.router)


@app.get("/", tags=["Dashboard UI"])
async def root_index():
    """
    Simulated landing overview
    """
    return {
        "project": "API Gateway Simulator",
        "description": "FastAPI simulator representing distributed backend workflows",
        "interactive_docs": "/docs",
        "endpoints": {
            "evaluation_service": "/evaluation",
            "decision_service": "/decision",
            "monitoring_service": "/monitoring",
            "gateway_orchestrator": "/simulate"
        },
        "system_status": "ONLINE"
    }
