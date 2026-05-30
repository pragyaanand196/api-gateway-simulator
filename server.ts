import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

interface SimulationConfig {
  evaluationDelay: number;
  decisionDelay: number;
  monitoringDelay: number;
  evaluationFailRate: number; // 0 to 100
  decisionFailRate: number;     // 0 to 100
  monitoringFailRate: number;   // 0 to 100
  timeoutSimulation: boolean;   // if true, mocks huge latency on requests
  unstableService: string | null; // which service is down or lagging
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  service: "GATEWAY" | "EVALUATION" | "DECISION" | "MONITORING" | "SYSTEM";
  message: string;
  details?: any;
}

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory simulation states and logs
let config: SimulationConfig = {
  evaluationDelay: 150,
  decisionDelay: 100,
  monitoringDelay: 50,
  evaluationFailRate: 0,
  decisionFailRate: 0,
  monitoringFailRate: 0,
  timeoutSimulation: false,
  unstableService: null,
};

let logs: LogEntry[] = [];

function generateId(): string {
  return Math.random().toString(36).substring(2, 11).toUpperCase();
}

function addLog(
  level: "INFO" | "WARN" | "ERROR" | "DEBUG",
  service: "GATEWAY" | "EVALUATION" | "DECISION" | "MONITORING" | "SYSTEM",
  message: string,
  details?: any
) {
  const log: LogEntry = {
    id: `TX-${generateId()}`,
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    details,
  };
  logs.unshift(log); // newest first
  if (logs.length > 200) {
    logs.pop();
  }
  console.log(`[${log.timestamp}] [${level}] [${service}] ${message}`);
}

addLog("INFO", "SYSTEM", "API Gateway Simulator Engine initialized.");

// Helper function to simulate mock delay
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Endpoints for Managing gateway configs and viewing logs
app.get("/api/config", (req, res) => {
  res.json(config);
});

app.post("/api/config", (req, res) => {
  config = { ...config, ...req.body };
  addLog("INFO", "SYSTEM", `Simulation configurations updated.`, config);
  res.json({ status: "success", config });
});

app.get("/api/logs", (req, res) => {
  res.json(logs);
});

app.post("/api/logs/clear", (req, res) => {
  logs = [];
  addLog("INFO", "SYSTEM", "Telemetry logs cleared.");
  res.json({ status: "success" });
});

// Mock Microservice 1: Evaluation Service
// Endpoint: /api/evaluation
app.post("/api/evaluation", async (req, res) => {
  const reqId = req.headers["x-request-id"] || `REQ-${generateId()}`;
  addLog("INFO", "EVALUATION", `Received evaluation request. ID: ${reqId}`, req.body);

  // Apply configs
  const serviceDelay = config.timeoutSimulation ? 6000 : config.evaluationDelay;
  if (serviceDelay > 0) {
    await sleep(serviceDelay);
  }

  // Handle timeout simulation block
  if (config.timeoutSimulation) {
    addLog("WARN", "EVALUATION", `Timeout simulation active. Service delayed by ${serviceDelay}ms`, { reqId });
  }

  // Random failure or unstable service simulation
  const isFailed = config.unstableService === "evaluation" || Math.random() * 100 < config.evaluationFailRate;
  if (isFailed) {
    addLog("ERROR", "EVALUATION", `Service Failure Simulation: Evaluation Service unavailable.`, { reqId });
    return res.status(503).json({
      detail: "Evaluation Service temporarily unavailable (Simulated 503 Service Unavailable)",
      status_code: 503
    });
  }

  const { applicant_id, name, credit_score, annual_income, requested_amount, age } = req.body;

  // Simulate Pydantic validation rules
  const validationErrors: string[] = [];
  if (!applicant_id) validationErrors.push("Field 'applicant_id' is required");
  if (!name) validationErrors.push("Field 'name' is required");
  if (credit_score === undefined) {
    validationErrors.push("Field 'credit_score' is required");
  } else if (credit_score < 300 || credit_score > 850) {
    validationErrors.push("Field 'credit_score' must be between 300 and 850. Received: " + credit_score);
  }
  if (annual_income === undefined) {
    validationErrors.push("Field 'annual_income' is required");
  } else if (annual_income < 0) {
    validationErrors.push("Field 'annual_income' must be positive");
  }
  if (requested_amount === undefined) {
    validationErrors.push("Field 'requested_amount' is required");
  } else if (requested_amount < 0) {
    validationErrors.push("Field 'requested_amount' must be positive");
  }
  if (age === undefined) {
    validationErrors.push("Field 'age' is required");
  } else if (age < 18) {
    validationErrors.push("Field 'age' must be at least 18 representing legal adult entry");
  }

  if (validationErrors.length > 0) {
    addLog("WARN", "EVALUATION", `Validation failure (422 Unprocessable Entity)`, { reqId, validationErrors });
    return res.status(422).json({
      detail: validationErrors.map((msg) => ({ loc: ["body", msg.split("'")[1] || "field"], msg, type: "value_error" })),
      status_code: 422
    });
  }

  // Calculate simulated business criteria
  // Excellent credit: > 720, Good credit: 650-719, Fair credit: 580-649, Poor credit: < 580
  let creditTier = "poor";
  if (credit_score >= 720) creditTier = "excellent";
  else if (credit_score >= 650) creditTier = "good";
  else if (credit_score >= 580) creditTier = "fair";

  // Debt to income simulation
  const requestedRatio = requested_amount / Math.max(1, annual_income);
  let riskLevel = "low";
  if (creditTier === "poor" || requestedRatio > 0.5) {
    riskLevel = "high";
  } else if (creditTier === "fair" || requestedRatio > 0.25) {
    riskLevel = "medium";
  }

  const evaluationResult = {
    applicant_id,
    credit_tier: creditTier,
    debt_to_income_ratio: parseFloat(requestedRatio.toFixed(3)),
    risk_score: riskLevel,
    evaluated_at: new Date().toISOString(),
    evaluation_id: `EVL-${generateId()}`,
    status: "evaluated",
  };

  addLog("INFO", "EVALUATION", `Evaluation completed successfully. Risk: ${riskLevel.toUpperCase()}`, evaluationResult);
  res.json(evaluationResult);
});

// Mock Microservice 2: Decision Service
// Endpoint: /api/decision
app.post("/api/decision", async (req, res) => {
  const reqId = req.headers["x-request-id"] || `REQ-${generateId()}`;
  addLog("INFO", "DECISION", `Received decision assessment. ID: ${reqId}`, req.body);

  const serviceDelay = config.decisionDelay;
  if (serviceDelay > 0) {
    await sleep(serviceDelay);
  }

  // Failure Simulation
  const isFailed = config.unstableService === "decision" || Math.random() * 100 < config.decisionFailRate;
  if (isFailed) {
    addLog("ERROR", "DECISION", `Service Failure Simulation: Decision Service internal crash.`, { reqId });
    return res.status(500).json({
      detail: "Decision core server crash (Simulated 500 Internal Server Error)",
      status_code: 500
    });
  }

  // Expect evaluation payload validation
  const { credit_tier, debt_to_income_ratio, risk_score, applicant_id } = req.body;
  if (!risk_score || !credit_tier) {
    addLog("WARN", "DECISION", `Decision input missing evaluation criteria.`, req.body);
    return res.status(400).json({
      detail: "Bad Request: Evaluation metrics 'risk_score' and 'credit_tier' are required",
      status_code: 400
    });
  }

  let approvalStatus = "approved";
  let reason = "Risk parameters within acceptable tolerances.";

  if (risk_score === "high") {
    approvalStatus = "rejected";
    reason = "Risk score estimated high. applicant failed initial gateway metrics.";
  } else if (debt_to_income_ratio > 0.4) {
    approvalStatus = "manual_review";
    reason = "Debt-to-income ratio too high (exceeds 40%). Requires manual intervention.";
  } else if (credit_tier === "fair" && risk_score === "medium") {
    approvalStatus = "manual_review";
    reason = "Fair credit tier coupled with medium risk rating. High borderline.";
  }

  const decisionResponse = {
    applicant_id,
    status: approvalStatus,
    assessed_by: "DeciderCore-v1",
    reason,
    timestamp: new Date().toISOString(),
    decision_id: `DEC-${generateId()}`,
  };

  addLog("INFO", "DECISION", `Decision accomplished. Status: ${approvalStatus.toUpperCase()}`, decisionResponse);
  res.json(decisionResponse);
});

// Mock Microservice 3: Monitoring Service
// Endpoint: /api/monitoring
app.post("/api/monitoring", async (req, res) => {
  const reqId = req.headers["x-request-id"] || `REQ-${generateId()}`;
  addLog("INFO", "MONITORING", `Securing audit logging request. ID: ${reqId}`, req.body);

  const serviceDelay = config.monitoringDelay;
  if (serviceDelay > 0) {
    await sleep(serviceDelay);
  }

  // Support failure simulation
  const isFailed = config.unstableService === "monitoring" || Math.random() * 100 < config.monitoringFailRate;
  if (isFailed) {
    addLog("ERROR", "MONITORING", `Service Failure Simulation: Log database lock failure.`, { reqId });
    return res.status(500).json({
      detail: "Database transaction deadlocked (Simulated 500 Internal Server Error)",
      status_code: 500
    });
  }

  const { tx_flow, result_status, applicant_id } = req.body;

  const monitorResponse = {
    logged: true,
    correlation_id: `COR-${generateId()}`,
    applicant_id,
    captured: {
      flow: tx_flow || "simulated_flow",
      status: result_status || "unknown"
    },
    system_status: "GREEN",
    metrics_received_at: new Date().toISOString(),
  };

  addLog("INFO", "MONITORING", `Audit log persist completed. correlation_id: ${monitorResponse.correlation_id}`);
  res.json(monitorResponse);
});

// Central API Gateway Endpoint: /api/simulate
// Acts as central orchestrator, internally invoking evaluation, decision, and monitoring
app.post("/api/simulate", async (req, res) => {
  const transactionId = `TXN-${generateId()}`;
  addLog("INFO", "GATEWAY", `Gateway simulated execution started. TxnId: ${transactionId}`, req.body);

  const { applicant_id, name, credit_score, annual_income, requested_amount, age } = req.body;

  const stepLogs = {
    evaluation: null as any,
    decision: null as any,
    monitoring: null as any,
    errors: [] as string[],
  };

  // Step 1: Call Evaluation Service
  addLog("DEBUG", "GATEWAY", `Initiating internally: Call /api/evaluation`, { transactionId });
  let evaluationResponse;
  try {
    // Generate evaluation results. Since it's local in process, we invoke our handler logic directly
    // to secure precise transaction tracking and failure boundaries!
    
    // Simulate latency of calling the module
    const evalDelay = config.timeoutSimulation ? 6000 : config.evaluationDelay;
    if (evalDelay > 0) await sleep(evalDelay);

    if (config.unstableService === "evaluation" || Math.random() * 100 < config.evaluationFailRate) {
      throw new Error("Evaluation Service simulated 503 error");
    }

    // Body validation for evaluation
    if (!applicant_id || !name || credit_score === undefined || annual_income === undefined || requested_amount === undefined || age === undefined) {
      // simulate 422 trigger
      return res.status(422).json({
        flow: "simulated",
        status: "validation_error",
        transaction_id: transactionId,
        error: "Unprocessable Entity (Pydantic style validations failed)",
        detail: "Validation errors on payload variables"
      });
    }

    if (credit_score < 300 || credit_score > 850 || age < 18) {
      return res.status(422).json({
        flow: "simulated",
        status: "validation_error",
        transaction_id: transactionId,
        error: `Value constraint failure: Credit score (${credit_score}) or Age (${age}) is invalid.`,
        detail: "Input rules violation"
      });
    }

    // Successful mock logic
    let creditTier = "poor";
    if (credit_score >= 720) creditTier = "excellent";
    else if (credit_score >= 650) creditTier = "good";
    else if (credit_score >= 580) creditTier = "fair";

    const requestedRatio = requested_amount / Math.max(1, annual_income);
    let riskLevel = "low";
    if (creditTier === "poor" || requestedRatio > 0.5) riskLevel = "high";
    else if (creditTier === "fair" || requestedRatio > 0.25) riskLevel = "medium";

    evaluationResponse = {
      applicant_id,
      credit_tier: creditTier,
      debt_to_income_ratio: parseFloat(requestedRatio.toFixed(3)),
      risk_score: riskLevel,
      evaluated_at: new Date().toISOString(),
      evaluation_id: `EVL-${generateId()}`,
      status: "evaluated"
    };

    stepLogs.evaluation = evaluationResponse;
    addLog("INFO", "GATEWAY", `Step 1 (Evaluation) OK. Risk: ${riskLevel.toUpperCase()}`, evaluationResponse);

  } catch (err: any) {
    addLog("ERROR", "GATEWAY", `Step 1 (Evaluation) Failed. Error: ${err.message}`);
    stepLogs.errors.push(`Evaluation Service Error: ${err.message}`);
    
    // Gateway error mapping: Return 502 Bad Gateway to clients
    return res.status(502).json({
      flow: "simulated",
      status: "failure",
      transaction_id: transactionId,
      error: "Bad Gateway: Evaluation Microservice unavailable",
      step_logs: stepLogs
    });
  }

  // Step 2: Call Decision Service
  addLog("DEBUG", "GATEWAY", `Initiating internally: Call /api/decision`, { transactionId });
  let decisionResponse;
  try {
    const decDelay = config.decisionDelay;
    if (decDelay > 0) await sleep(decDelay);

    if (config.unstableService === "decision" || Math.random() * 100 < config.decisionFailRate) {
      throw new Error("Decision Service simulated 500 crash");
    }

    // Logic representing decisioning
    let approvalStatus = "approved";
    let reason = "Risk parameters within acceptable tolerances.";

    if (evaluationResponse.risk_score === "high") {
      approvalStatus = "rejected";
      reason = "Risk score estimated high. applicant failed initial gateway metrics.";
    } else if (evaluationResponse.debt_to_income_ratio > 0.4) {
      approvalStatus = "manual_review";
      reason = "Debt-to-income ratio too high (exceeds 40%). Requires manual intervention.";
    } else if (evaluationResponse.credit_tier === "fair" && evaluationResponse.risk_score === "medium") {
      approvalStatus = "manual_review";
      reason = "Fair credit tier coupled with medium risk rating. High borderline.";
    }

    decisionResponse = {
      applicant_id,
      status: approvalStatus,
      assessed_by: "DeciderCore-v1",
      reason,
      timestamp: new Date().toISOString(),
      decision_id: `DEC-${generateId()}`,
    };

    stepLogs.decision = decisionResponse;
    addLog("INFO", "GATEWAY", `Step 2 (Decision) OK. Result: ${approvalStatus.toUpperCase()}`, decisionResponse);

  } catch (err: any) {
    addLog("ERROR", "GATEWAY", `Step 2 (Decision) Failed. Error: ${err.message}`);
    stepLogs.errors.push(`Decision Service Error: ${err.message}`);
    
    return res.status(502).json({
      flow: "simulated",
      status: "failure",
      transaction_id: transactionId,
      error: "Bad Gateway: Decision Microservice crashed during operation step",
      step_logs: stepLogs
    });
  }

  // Step 3: Call Monitoring Service
  addLog("DEBUG", "GATEWAY", `Initiating internally: Call /api/monitoring`, { transactionId });
  let monitoringResponse;
  try {
    const monDelay = config.monitoringDelay;
    if (monDelay > 0) await sleep(monDelay);

    if (config.unstableService === "monitoring" || Math.random() * 100 < config.monitoringFailRate) {
      throw new Error("Monitoring Service simulated 500 deadlock");
    }

    monitoringResponse = {
      logged: true,
      correlation_id: `COR-${generateId()}`,
      applicant_id,
      captured: {
        flow: "simulated",
        status: decisionResponse.status
      },
      system_status: "GREEN",
      metrics_received_at: new Date().toISOString(),
    };

    stepLogs.monitoring = monitoringResponse;
    addLog("INFO", "GATEWAY", `Step 3 (Monitoring) OK. Logged with ID: ${monitoringResponse.correlation_id}`);

  } catch (err: any) {
    // Gateway is robust: If monitoring logging fails, we might still complete the financial flow
    // but flag a "degraded" state warning. This is a very professional backend mitigation pattern!
    addLog("WARN", "GATEWAY", `Step 3 (Monitoring) FAILED. Swallowing and flagging degraded. Error: ${err.message}`);
    stepLogs.monitoring = {
      logged: false,
      error: `Monitoring service failed: ${err.message}`,
      status: "degraded_state"
    };
  }

  // Construct standard combined final gateway return format requested
  const finalResponse = {
    flow: "simulated",
    status: stepLogs.monitoring.logged === false ? "degraded_success" : "success",
    transaction_id: transactionId,
    evaluation: {
      result: evaluationResponse.risk_score === "high" ? "bad" : "good",
      credit_tier: evaluationResponse.credit_tier,
      risk_score: evaluationResponse.risk_score,
      evaluation_id: evaluationResponse.evaluation_id
    },
    decision: {
      status: decisionResponse.status,
      decision_id: decisionResponse.decision_id,
      reason: decisionResponse.reason
    },
    monitoring: {
      logged: stepLogs.monitoring.logged,
      correlation_id: stepLogs.monitoring.correlation_id || null
    }
  };

  addLog("INFO", "GATEWAY", `Simulate Cascade COMPLETE. TxnID: ${transactionId} Output: SUCCESS`, finalResponse);
  res.json(finalResponse);
});


// Hook Vite for local app static serving
async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server started. Listening on http://localhost:${PORT}`);
  });
}

start();
