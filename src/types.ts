export interface SimulationConfig {
  evaluationDelay: number;
  decisionDelay: number;
  monitoringDelay: number;
  evaluationFailRate: number;
  decisionFailRate: number;
  monitoringFailRate: number;
  timeoutSimulation: boolean;
  unstableService: "evaluation" | "decision" | "monitoring" | null;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: "INFO" | "WARN" | "ERROR" | "DEBUG";
  service: "GATEWAY" | "EVALUATION" | "DECISION" | "MONITORING" | "SYSTEM";
  message: string;
  details?: any;
}

export interface ApplicantPreset {
  id: string;
  label: string;
  description: string;
  payload: {
    applicant_id: string;
    name: string;
    credit_score: number;
    annual_income: number;
    requested_amount: number;
    age: number;
  };
}

export interface SimulationResult {
  status: "idle" | "running" | "success" | "validation_error" | "failure" | "network_error";
  statusCode: number;
  txnId?: string;
  errorMsg?: string;
  steps: {
    evaluation: { active: boolean; status: "pending" | "success" | "failed"; duration: number; response?: any };
    decision: { active: boolean; status: "pending" | "success" | "failed"; duration: number; response?: any };
    monitoring: { active: boolean; status: "pending" | "success" | "failed"; duration: number; response?: any };
  };
  combinedOutput?: any;
}
