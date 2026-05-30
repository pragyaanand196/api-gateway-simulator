"""
Integration and Unit Tests for API Gateway Simulator.
Uses pytest and FastAPI TestClient to verify the response schema, Pydantic bounds, and gateway fallback states.
"""

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_root_index():
    """
    Ensure landing metadata is online and reachable.
    """
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["project"] == "API Gateway Simulator"
    assert data["system_status"] == "ONLINE"


def test_evaluation_success():
    """
    Verify valid applicant details calculate correct credit tiers and risk assessments.
    """
    payload = {
        "applicant_id": "APP-TEST-99",
        "name": "Jane Miller",
        "credit_score": 750,
        "annual_income": 120000.0,
        "requested_amount": 30000.0,
        "age": 32
    }
    response = client.post("/evaluation", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["credit_tier"] == "excellent"
    assert data["debt_to_income_ratio"] == 0.25
    assert data["risk_score"] == "low"


def test_evaluation_pydantic_unauthorized_age():
    """
    Check that Pydantic rules block underage applicants (under 18) with a 422 error.
    """
    payload = {
        "applicant_id": "APP_MINOR",
        "name": "Billy Kid",
        "credit_score": 600,
        "annual_income": 50000.0,
        "requested_amount": 10000.0,
        "age": 16 # Trigger underage violation
    }
    response = client.post("/evaluation", json=payload)
    assert response.status_code == 422
    assert "detail" in response.json()


def test_decision_logic():
    """
    Vett lending decider outputs.
    """
    payload = {
        "applicant_id": "APP-TEST-01",
        "credit_tier": "good",
        "debt_to_income_ratio": 0.20,
        "risk_score": "low"
    }
    response = client.post("/decision", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "approved"


def test_monitoring_logging():
    """
    Confirm auditing service successfully stores transactions.
    """
    payload = {
        "tx_flow": "unit_test_flow",
        "result_status": "approved",
        "applicant_id": "APP-TEST-99"
    }
    response = client.post("/monitoring", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["logged"] is True
    assert "correlation_id" in data


@pytest.fixture
def mock_service_endpoints(monkeypatch):
    """
    Forces internal URLs to route locally during testing inside TestClient context
    """
    monkeypatch.setenv("EVALUATION_SERVICE_URL", "http://testserver/evaluation")
    monkeypatch.setenv("DECISION_SERVICE_URL", "http://testserver/decision")
    monkeypatch.setenv("MONITORING_SERVICE_URL", "http://testserver/monitoring")


def test_gateway_composite_flow_success(mock_service_endpoints):
    """
    Audits full unified Cascade loop (/simulate) through mockup endpoints.
    """
    payload = {
        "applicant_id": "APP-INTEG-1",
        "name": "Alice Sterling",
        "credit_score": 800,
        "annual_income": 150000.0,
        "requested_amount": 20000.0,
        "age": 45
    }
    # Call gateway directly
    response = client.post("/simulate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["flow"] == "simulated"
    assert data["status"] == "success"
    assert data["evaluation"]["result"] == "good"
    assert data["decision"]["status"] == "approved"
    assert data["monitoring"]["logged"] is True


def test_gateway_composite_underage_block(mock_service_endpoints):
    """
    Confirm Gateway properly relays downstream HTTP 422 ValidationError exceptions.
    """
    payload = {
        "applicant_id": "APP-INTEG-FAIL",
        "name": "Tommy Underwood",
        "credit_score": 800,
        "annual_income": 150000.0,
        "requested_amount": 20000.0,
        "age": 15 # Underage -> should evoke 422 error
    }
    response = client.post("/simulate", json=payload)
    assert response.status_code == 422
