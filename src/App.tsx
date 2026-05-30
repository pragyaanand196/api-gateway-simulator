import React, { useState, useEffect, useRef } from "react";
import { 
  Layers, 
  Activity, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Terminal, 
  Sliders, 
  Database, 
  BookOpen, 
  FileCheck, 
  Settings, 
  Play, 
  Trash2, 
  Copy, 
  Check, 
  ExternalLink, 
  Code2, 
  HeartPulse, 
  Laptop,
  Network
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { APPLICANT_PRESETS, PYTHON_CODE_FILES } from "./mockData";
import { LogEntry, SimulationConfig, SimulationResult } from "./types";

export default function App() {
  // Config state
  const [config, setConfig] = useState<SimulationConfig>({
    evaluationDelay: 150,
    decisionDelay: 100,
    monitoringDelay: 50,
    evaluationFailRate: 0,
    decisionFailRate: 0,
    monitoringFailRate: 0,
    timeoutSimulation: false,
    unstableService: null,
  });

  // Telemetry logs from backend
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<"trace" | "swagger" | "logs" | "export">("trace");
  
  // Quick presets selection
  const [selectedPreset, setSelectedPreset] = useState<string>("preset-excellent");
  
  // Custom payload variable editor
  const [payload, setPayload] = useState({
    applicant_id: "APP-EXC-001",
    name: "Marcus Aurelius",
    credit_score: 800,
    annual_income: 154000,
    requested_amount: 15000,
    age: 43,
  });

  // Simulator running state
  const [simResult, setSimResult] = useState<SimulationResult>({
    status: "idle",
    statusCode: 200,
    steps: {
      evaluation: { active: false, status: "pending", duration: 0 },
      decision: { active: false, status: "pending", duration: 0 },
      monitoring: { active: false, status: "pending", duration: 0 },
    }
  });

  // Export panel selection
  const [selectedFileIdx, setSelectedFileIdx] = useState(0);
  const [copiedFile, setCopiedFile] = useState(false);
  const [copiedCodeText, setCopiedCodeText] = useState("");

  // Swagger selected target
  const [swaggerEndpoint, setSwaggerEndpoint] = useState<"simulate" | "evaluation" | "decision" | "monitoring">("simulate");
  const [swaggerPayload, setSwaggerPayload] = useState<string>(JSON.stringify(payload, null, 2));
  const [swaggerResponse, setSwaggerResponse] = useState<any>(null);
  const [swaggerLoading, setSwaggerLoading] = useState(false);
  const [swaggerHeaders, setSwaggerHeaders] = useState<any>(null);

  // Stats gathered during session
  const [totalSimulations, setTotalSimulations] = useState(0);
  const [successfulSims, setSuccessfulSims] = useState(0);
  const [failedSims, setFailedSims] = useState(0);
  const [avgResponseTime, setAvgResponseTime] = useState(0);
  const [lastDurations, setLastDurations] = useState<number[]>([]);

  const telemetryEndRef = useRef<HTMLDivElement>(null);

  // First initialization load
  useEffect(() => {
    fetchConfig();
    fetchLogs();
    
    // Auto-poll logs every 3 seconds to keep terminal updated
    const interval = setInterval(() => {
      fetchLogs();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Update swagger payload with current payload
  useEffect(() => {
    if (swaggerEndpoint === "simulate" || swaggerEndpoint === "evaluation") {
      setSwaggerPayload(JSON.stringify(payload, null, 2));
    } else if (swaggerEndpoint === "decision") {
      setSwaggerPayload(JSON.stringify({
        applicant_id: payload.applicant_id,
        credit_tier: "excellent",
        debt_to_income_ratio: 0.097,
        risk_score: "low"
      }, null, 2));
    } else if (swaggerEndpoint === "monitoring") {
      setSwaggerPayload(JSON.stringify({
        tx_flow: "gateway_manual_run",
        result_status: "approved",
        applicant_id: payload.applicant_id
      }, null, 2));
    }
  }, [payload, swaggerEndpoint]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/config");
      const data = await res.json();
      setConfig(data);
    } catch (e) {
      console.warn("Could not load backend configurations", e);
    }
  };

  const updateConfig = async (newConfig: Partial<SimulationConfig>) => {
    const updated = { ...config, ...newConfig };
    setConfig(updated);
    try {
      await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updated),
      });
      fetchLogs();
    } catch (e) {
      console.warn("Could not sync config with server", e);
    }
  };

  const fetchLogs = async () => {
    try {
      const res = await fetch("/api/logs");
      const list = await res.json();
      setLogs(list);
    } catch (e) {
      console.warn("Could not fetch trace telemetry logs", e);
    }
  };

  const clearTelemetry = async () => {
    try {
      await fetch("/api/logs/clear", { method: "POST" });
      setLogs([]);
    } catch (e) {
      console.warn(e);
    }
  };

  const handleApplyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = APPLICANT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setPayload(preset.payload);
    }
  };

  const handleInputChange = (field: string, value: string | number) => {
    setPayload(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Triggers simulated cascades live on port 3000 Node process
  const runCascadeSimulation = async () => {
    setTotalSimulations(prev => prev + 1);
    setActiveTab("trace");
    
    // Reset status tracker
    setSimResult({
      status: "running",
      statusCode: 200,
      steps: {
        evaluation: { active: true, status: "pending", duration: 0 },
        decision: { active: false, status: "pending", duration: 0 },
        monitoring: { active: false, status: "pending", duration: 0 },
      }
    });

    const startTime = Date.now();
    
    // We execute local step delays in tandem on the UI for stunning visualized feedback!
    // Step 1: Vetting
    const evalDelay = config.timeoutSimulation ? 3500 : config.evaluationDelay;
    await new Promise(r => setTimeout(r, Math.min(2000, evalDelay)));

    const isEvalFailed = config.unstableService === "evaluation" || Math.random() * 100 < config.evaluationFailRate;
    
    // Check client side Pydantic validations as well for prompt diagnostics
    const staticValidationFail = payload.credit_score < 300 || payload.credit_score > 850 || payload.age < 18;
    
    if (staticValidationFail) {
      const stopTime = Date.now() - startTime;
      setSimResult(prev => ({
        ...prev,
        status: "validation_error",
        statusCode: 422,
        errorMsg: "Pydantic validator range bounds failure (422 Unprocessable Entity)",
        steps: {
          ...prev.steps,
          evaluation: { active: false, status: "failed", duration: stopTime }
        }
      }));
      setFailedSims(prev => prev + 1);
      fetchLogs();
      return;
    }

    if (isEvalFailed) {
      const stopTime = Date.now() - startTime;
      setSimResult(prev => ({
        ...prev,
        status: "failure",
        statusCode: 502,
        errorMsg: "Evaluation Service reported simulated 503 out of service.",
        steps: {
          ...prev.steps,
          evaluation: { active: false, status: "failed", duration: stopTime }
        }
      }));
      setFailedSims(prev => prev + 1);
      fetchLogs();
      return;
    }

    // Step 1 Success, move to Step 2
    const evalDur = Math.max(50, evalDelay);
    setSimResult(prev => ({
      ...prev,
      steps: {
        ...prev.steps,
        evaluation: { active: false, status: "success", duration: evalDur },
        decision: { active: true, status: "pending", duration: 0 }
      }
    }));

    // Step 2 delay
    const decDelay = config.decisionDelay;
    await new Promise(r => setTimeout(r, Math.min(1500, decDelay)));

    const isDecFailed = config.unstableService === "decision" || Math.random() * 100 < config.decisionFailRate;
    if (isDecFailed) {
      const stopTime = Date.now() - startTime;
      setSimResult(prev => ({
        ...prev,
        status: "failure",
        statusCode: 502,
        errorMsg: "Decision Service crashed with 500 Internal Error during risk assessment.",
        steps: {
          ...prev.steps,
          decision: { active: false, status: "failed", duration: stopTime - evalDur }
        }
      }));
      setFailedSims(prev => prev + 1);
      fetchLogs();
      return;
    }

    // Decision OK, move to monitoring
    const decDur = Math.max(50, decDelay);
    setSimResult(prev => ({
      ...prev,
      steps: {
        ...prev.steps,
        decision: { active: false, status: "success", duration: decDur },
        monitoring: { active: true, status: "pending", duration: 0 }
      }
    }));

    // Step 3 delay
    const monDelay = config.monitoringDelay;
    await new Promise(r => setTimeout(r, Math.min(1000, monDelay)));

    const isMonFailed = config.unstableService === "monitoring" || Math.random() * 100 < config.monitoringFailRate;
    const monDur = Math.max(30, monDelay);

    // Call actual Express `/api/simulate` under hood to load real telemetry returns
    try {
      const response = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      const runTime = Date.now() - startTime;

      // Update durations stats
      const updatedDurations = [...lastDurations, runTime].slice(-10);
      setLastDurations(updatedDurations);
      setAvgResponseTime(Math.round(updatedDurations.reduce((a, b) => a + b, 0) / updatedDurations.length));

      if (response.ok) {
        setSimResult({
          status: "success",
          statusCode: 200,
          txnId: data.transaction_id,
          steps: {
            evaluation: { active: false, status: "success", duration: evalDur },
            decision: { active: false, status: "success", duration: decDur },
            monitoring: { active: false, status: isMonFailed ? "failed" : "success", duration: monDur },
          },
          combinedOutput: data
        });
        setSuccessfulSims(prev => prev + 1);
      } else {
        setSimResult({
          status: "failure",
          statusCode: response.status,
          errorMsg: data.error || data.detail || "Gateway Connection Exception",
          steps: {
            evaluation: { active: false, status: "success", duration: evalDur },
            decision: { active: false, status: "success", duration: decDur },
            monitoring: { active: false, status: "failed", duration: monDur },
          },
          combinedOutput: data
        });
        setFailedSims(prev => prev + 1);
      }
    } catch (err: any) {
      setSimResult(prev => ({
        ...prev,
        status: "network_error",
        statusCode: 504,
        errorMsg: "Standard fetch error: Gateway server offline or connection refused.",
      }));
      setFailedSims(prev => prev + 1);
    }
    
    fetchLogs();
  };

  // Triggers specific endpoint simulation inside Swagger tab
  const trySwaggerEndpoint = async () => {
    setSwaggerLoading(true);
    setSwaggerResponse(null);
    setSwaggerHeaders(null);
    
    const requestHeaders: any = {
      "Content-Type": "application/json",
      "X-Simulate-Failure-Rate": String(config.unstableService ? 100 : 0),
      "X-Simulate-Delay": String(config.evaluationDelay)
    };

    try {
      let reqBody;
      try {
        reqBody = JSON.parse(swaggerPayload);
      } catch (e) {
        setSwaggerResponse({ error: "Invalid JSON format entered in body workspace." });
        setSwaggerLoading(false);
        return;
      }

      const res = await fetch(`/api/${swaggerEndpoint}`, {
        method: "POST",
        headers: requestHeaders,
        body: JSON.stringify(reqBody)
      });

      const responseBody = await res.json();
      
      setSwaggerResponse(responseBody);
      setSwaggerHeaders({
        Status: `${res.status} ${res.statusText}`,
        "Content-Type": "application/json; charset=utf-8",
        "X-Request-Transaction-ID": `TXN-${Math.random().toString(36).substring(2, 7).toUpperCase()}`
      });
      fetchLogs();
    } catch (e: any) {
      setSwaggerResponse({ error: "Fetch error. Could not connect to downstream simulation core." });
    } finally {
      setSwaggerLoading(false);
    }
  };

  const copyCodeToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedFile(true);
    setTimeout(() => setCopiedFile(false), 2000);
  };

  return (
    <div className="min-h-screen bg-slate-950 font-sans text-slate-100 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
      
      {/* Top Professional App Navigation Header */}
      <header className="bg-slate-900 border-b border-slate-800 py-3.5 px-6 flex items-center justify-between sticky top-0 z-50 shadow-md">
        <div className="flex items-center gap-3.5">
          <div className="bg-gradient-to-tr from-emerald-600 to-indigo-600 p-2 rounded-xl text-white shadow-emerald-500/20 shadow-lg">
            <Network className="w-5.5 h-5.5 animate-pulse" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
              API Gateway Simulator
              <span className="text-xs bg-emerald-500/15 text-emerald-400 font-mono px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
                ONLINE
              </span>
            </h1>
            <p className="text-xs text-slate-400">FastAPI microservice cascade, timeout validation, and routing simulator</p>
          </div>
        </div>

        {/* System Health Indicators */}
        <div className="hidden md:flex items-center gap-6">
          <div className="text-right">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Gateway Rate</span>
            <span className="text-xs font-semibold text-slate-200">
              {totalSimulations === 0 
                ? "100%" 
                : `${Math.round((successfulSims / totalSimulations) * 100)}% Success`}
            </span>
          </div>
          <div className="text-right border-l border-slate-800 pl-6">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Avg Latency</span>
            <span className="text-xs font-semibold text-slate-200 font-mono">{avgResponseTime || 120} ms</span>
          </div>
          <div className="text-right border-l border-slate-800 pl-6">
            <span className="text-[10px] text-slate-500 uppercase font-mono block">Active Threads</span>
            <span className="text-xs font-bold text-indigo-400 font-mono">4 Services</span>
          </div>
        </div>
      </header>

      {/* Main Grid Workpane */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Hand Sidebar Controls Column (Col 1 to 4) */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          
          {/* Diagnostic applicant Profile Builder */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                Applicant Ingestion Preset
              </h2>
              <span className="text-[11px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono">Pydantic v2</span>
            </div>

            <div className="p-4 flex flex-col gap-4">
              <div>
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-1.5">Load Preset Applicant</label>
                <select 
                  value={selectedPreset}
                  onChange={(e) => handleApplyPreset(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-emerald-500"
                >
                  {APPLICANT_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>{p.label}</option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 italic mt-1.5 leading-relaxed">
                  {APPLICANT_PRESETS.find(p => p.id === selectedPreset)?.description}
                </p>
              </div>

              <div className="border-t border-slate-800 pt-3 flex flex-col gap-3">
                <span className="text-xs font-semibold text-slate-300">Adjust Payload Schemas manually</span>
                
                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Applicant ID</label>
                    <input 
                      type="text" 
                      value={payload.applicant_id}
                      onChange={(e) => handleInputChange("applicant_id", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Full Name</label>
                    <input 
                      type="text" 
                      value={payload.name}
                      onChange={(e) => handleInputChange("name", e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Credit FICO (300-850)</label>
                    <input 
                      type="number" 
                      value={payload.credit_score}
                      onChange={(e) => handleInputChange("credit_score", parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Age (Min 18)</label>
                    <input 
                      type="number" 
                      value={payload.age}
                      onChange={(e) => handleInputChange("age", parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Annual Income ($)</label>
                    <input 
                      type="number" 
                      value={payload.annual_income}
                      onChange={(e) => handleInputChange("annual_income", parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 font-mono uppercase block mb-1">Loan Sought ($)</label>
                    <input 
                      type="number" 
                      value={payload.requested_amount}
                      onChange={(e) => handleInputChange("requested_amount", parseInt(e.target.value) || 0)}
                      className="w-full bg-slate-950 border border-slate-800 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Network Outage / Failure Injection Sliders */}
          <section className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden">
            <div className="p-4 bg-slate-850 border-b border-slate-800 flex items-center justify-between">
              <h2 className="font-semibold text-sm text-white flex items-center gap-2">
                <Settings className="w-4 h-4 text-indigo-400" />
                Inject Delay &amp; Fault Rates
              </h2>
              <span className="text-[11px] text-rose-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping"></span>
                CHAOS CORE
              </span>
            </div>

            <div className="p-4 flex flex-col gap-4">
              
              {/* Timeout delay overrides */}
              <div className="flex items-center justify-between py-1 bg-slate-950 px-2.5 rounded border border-slate-800/60">
                <span className="text-xs text-slate-300 font-medium flex items-center gap-2.5">
                  <Activity className="w-3.5 h-3.5 text-indigo-400" />
                  Simulate Gateway Timeouts
                </span>
                <input 
                  type="checkbox"
                  checked={config.timeoutSimulation}
                  onChange={(e) => updateConfig({ timeoutSimulation: e.target.checked })}
                  className="rounded bg-slate-950 border-slate-800 text-emerald-500 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
              </div>

              {/* Delayed thresholds */}
              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Evaluation Outbox Latency</span>
                  <span className="text-emerald-400 font-mono">{config.evaluationDelay}ms</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1200" 
                  step="50"
                  value={config.evaluationDelay}
                  onChange={(e) => updateConfig({ evaluationDelay: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>

              <div>
                <div className="flex justify-between text-[11px] mb-1">
                  <span className="text-slate-400">Decision Rules Latency</span>
                  <span className="text-emerald-400 font-mono">{config.decisionDelay}ms</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="1200" 
                  step="50"
                  value={config.decisionDelay}
                  onChange={(e) => updateConfig({ decisionDelay: parseInt(e.target.value) })}
                  className="w-full accent-emerald-500"
                />
              </div>

              {/* Service Unstable Toggle selection */}
              <div className="border-t border-slate-800 pt-3">
                <label className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block mb-2">Simulate Offline Service (Shutoff)</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {["evaluation", "decision", "monitoring"].map((service) => (
                    <button
                      key={service}
                      onClick={() => updateConfig({ 
                        unstableService: config.unstableService === service ? null : service as any 
                      })}
                      className={`text-[10px] font-mono py-1.5 rounded transition ${
                        config.unstableService === service
                          ? "bg-rose-500/25 border border-rose-500 text-rose-300 font-bold"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                      }`}
                    >
                      {service.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Run orchestrator trigger */}
              <button
                onClick={runCascadeSimulation}
                disabled={simResult.status === "running"}
                className={`w-full py-3 rounded-xl font-bold text-sm tracking-wide shadow-lg flex items-center justify-center gap-2.5 transition active:scale-[0.98] mt-2 ${
                  simResult.status === "running"
                    ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                    : "bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-emerald-500/10 hover:shadow-emerald-500/25 hover:from-emerald-400 hover:to-teal-400 cursor-pointer"
                }`}
              >
                <Play className="w-4 h-4 fill-current" />
                {simResult.status === "running" ? "Cascade Executing..." : "RUN GATEWAY CASCADE"}
              </button>
            </div>
          </section>
        </div>

        {/* Right Hand Workspace Area (Col 5 to 12) */}
        <div className="lg:col-span-8 flex flex-col min-h-[500px]">
          
          {/* Workpane Navigation Header Bar Tab selection */}
          <div className="flex border-b border-slate-800 gap-1 bg-slate-900 p-1.5 rounded-t-xl">
            <button
              onClick={() => setActiveTab("trace")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "trace"
                  ? "bg-slate-800 text-emerald-400 shadow-sm border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Activity className="w-3.5 h-3.5" />
              Simulation Pipeline View
            </button>
            
            <button
              onClick={() => setActiveTab("swagger")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "swagger"
                  ? "bg-slate-800 text-indigo-400 shadow-sm border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              Interactive Swagger Mock
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "logs"
                  ? "bg-slate-800 text-amber-400 shadow-sm border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              Live Telemetry Core Logs
            </button>

            <button
              onClick={() => setActiveTab("export")}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-semibold cursor-pointer transition ${
                activeTab === "export"
                  ? "bg-slate-800 text-cyan-400 shadow-sm border border-slate-700/60"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Code2 className="w-3.5 h-3.5" />
              VS Code Python Export
            </button>
          </div>

          {/* Active Workpane Card Canvas */}
          <div className="bg-slate-900 border-x border-b border-slate-800 rounded-b-xl flex-1 p-5 shadow-2xl flex flex-col">
            
            {/* View 1: SIMULATION TRACE timeline representation */}
            {activeTab === "trace" && (
              <div className="flex flex-col gap-6 flex-1">
                <div className="bg-slate-950 border border-slate-800/60 rounded-xl p-4 flex flex-col gap-2 relative overflow-hidden">
                  <div className="absolute right-0 top-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-2xl"></div>
                  <h3 className="font-bold text-xs text-white uppercase tracking-wider">Gateway Orchestrator Trace Engine</h3>
                  <p className="text-xs text-slate-400">Trigger a cascade with the control button on the left to watch microservices communicate over the HTTP network boundary.</p>
                </div>

                {/* VISUAL PIPELINE PIPES SYSTEM */}
                <div className="grid grid-cols-1 md:grid-cols-5 items-center gap-4 py-4 relative">
                  
                  {/* Step A: API Custom Entrypoint */}
                  <div className="bg-slate-950 border border-slate-800 p-3 h-32 rounded-xl flex flex-col justify-between shadow-md">
                    <span className="text-[10px] text-indigo-400 uppercase tracking-widest font-mono font-bold">CLIENT ENTRY</span>
                    <div className="my-1.5">
                      <div className="text-xs font-semibold text-white truncate">{payload.name}</div>
                      <span className="text-[10px] text-slate-500 font-mono block">FICO Score: {payload.credit_score}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                      <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                      POST /api/simulate
                    </div>
                  </div>

                  {/* Connecting Arrow 1 */}
                  <div className="hidden md:flex flex-col items-center justify-center text-slate-600">
                    <span className="text-[10px] font-mono text-slate-500 mb-1.5">HTTP POST</span>
                    <div className="w-full bg-slate-800 h-1 relative rounded">
                      <motion.div 
                        animate={simResult.status === "running" ? { left: ["0%", "100%"] } : { left: "100%" }}
                        transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                        className="absolute h-1 w-8 bg-emerald-500 rounded shadow-emerald-500 shadow"
                      />
                    </div>
                  </div>

                  {/* Step B: Evaluation Service */}
                  <div className={`p-3 h-32 rounded-xl flex flex-col justify-between shadow-md transition ${
                    config.unstableService === "evaluation" 
                      ? "border border-rose-500/40 bg-rose-950/15" 
                      : "bg-slate-950 border border-slate-800"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">EVALUATION</span>
                      <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-ping"></span>
                    </div>
                    <div className="my-1">
                      {simResult.status === "running" && simResult.steps.evaluation.status === "pending" ? (
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span>
                          Vetting...
                        </span>
                      ) : simResult.steps.evaluation.status === "success" ? (
                        <div>
                          <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">Vetted OK</span>
                          <span className="text-[10px] text-slate-400 font-mono block">Tier: {simResult.combinedOutput?.evaluation?.credit_tier || "excellent"}</span>
                        </div>
                      ) : simResult.steps.evaluation.status === "failed" ? (
                        <span className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                          CRASHED
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">Standby</span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      {simResult.steps.evaluation.duration ? `${simResult.steps.evaluation.duration}ms` : "/evaluation"}
                    </div>
                  </div>

                  {/* Connecting Arrow 2 */}
                  <div className="hidden md:flex flex-col items-center justify-center text-slate-600">
                    <span className="text-[10px] font-mono text-slate-500 mb-1">JSON PIPE</span>
                    <div className="w-full bg-slate-800 h-1 relative rounded">
                      <motion.div 
                        animate={simResult.steps.decision.active ? { left: ["0%", "100%"] } : { left: simResult.steps.decision.status === "success" ? "100%" : "0%" }}
                        transition={{ repeat: Infinity, duration: 1 }}
                        className="absolute h-1 w-8 bg-emerald-500 rounded"
                      />
                    </div>
                  </div>

                  {/* Step C: Decider Service */}
                  <div className={`p-3 h-32 rounded-xl flex flex-col justify-between shadow-md transition ${
                    config.unstableService === "decision" 
                      ? "border border-rose-500/40 bg-rose-950/15" 
                      : "bg-slate-950 border border-slate-800"
                  }`}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">DECISION</span>
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping"></span>
                    </div>

                    <div className="my-1">
                      {simResult.steps.decision.active ? (
                        <span className="text-xs text-yellow-400 flex items-center gap-1">
                          <span className="w-3 h-3 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin"></span>
                          Underwriting...
                        </span>
                      ) : simResult.steps.decision.status === "success" ? (
                        <div>
                          <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">Decision Ready</span>
                          <span className="text-[10px] text-slate-400 font-mono uppercase block">{simResult.combinedOutput?.decision?.status || "APPROVED"}</span>
                        </div>
                      ) : simResult.steps.decision.status === "failed" ? (
                        <span className="text-xs text-rose-500 font-semibold flex items-center gap-1">
                          OUTAGE
                        </span>
                      ) : (
                        <span className="text-xs text-slate-600">Standby</span>
                      )}
                    </div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      {simResult.steps.decision.duration ? `${simResult.steps.decision.duration}ms` : "/decision"}
                    </div>
                  </div>

                </div>

                {/* SIMULATION CONSOLIDATED REPORT PANEL */}
                <div className="bg-slate-950 border border-slate-850 rounded-2xl p-5 flex flex-col md:flex-row gap-5">
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-white mb-2">Gate Console Summary</h4>
                    
                    {simResult.status === "idle" && (
                      <div className="text-slate-500 text-sm italic py-4">
                        Press "RUN GATEWAY CASCADE" to monitor microservice operations.
                      </div>
                    )}

                    {simResult.status === "running" && (
                      <div className="flex items-center gap-3 py-4">
                        <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin"></span>
                        <span className="text-sm font-mono text-emerald-400 font-semibold animate-pulse">TRANSACTION PROCESSING</span>
                      </div>
                    )}

                    {simResult.status === "success" && (
                      <div className="flex flex-col gap-2.5">
                        <div className="flex items-center gap-2 text-emerald-400 font-bold">
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                          Simulate Success (HTTP 200)
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded-lg border border-slate-800">
                          Applicant Approved: <strong className="text-emerald-400">{simResult.combinedOutput?.decision?.reason}</strong>
                        </p>
                        <div className="flex items-center gap-4 text-[10px] text-slate-500 font-mono">
                          <span>Transaction: {simResult.txnId}</span>
                          <span>Correlation log: {simResult.combinedOutput?.monitoring?.correlation_id}</span>
                        </div>
                      </div>
                    )}

                    {simResult.status === "validation_error" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-amber-500 font-bold text-sm">
                          <AlertTriangle className="w-5 h-5 text-amber-500" />
                          Pydantic Validation Fail (HTTP 422)
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-900 p-3 rounded border border-slate-800">
                          The simulated FastAPI rules blocked execution of this payload. Credit score validation bound thresholds or Age restraints were breached locally.
                        </p>
                        <div className="text-[10px] text-rose-400 font-mono">
                          Error Code: {simResult.statusCode} Unprocessable Entity
                        </div>
                      </div>
                    )}

                    {simResult.status === "failure" && (
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2 text-rose-500 font-bold text-sm">
                          <XCircle className="w-5 h-5 text-rose-500" />
                          Simulated Microservice Outage (HTTP 502)
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed bg-rose-950/10 p-3 rounded border border-rose-500/25">
                          Error: {simResult.errorMsg}. The API Gateway simulated microservices circuit-break, preventing loan cascading sequence.
                        </p>
                        <div className="text-[10px] text-rose-400 font-mono">
                          HTTP Status {simResult.statusCode} Bad Gateway
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Combined Gateway response object on the right */}
                  <div className="w-full md:w-80 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
                      <span>Gateway Response JSON</span>
                      {simResult.status !== "idle" && (
                        <button 
                          onClick={() => copyCodeToClipboard(JSON.stringify(simResult.combinedOutput, null, 2))}
                          className="text-xs text-slate-500 hover:text-emerald-400 font-medium flex items-center gap-1 cursor-pointer"
                        >
                          <Copy className="w-3 h-3" />
                          Copy
                        </button>
                      )}
                    </div>
                    
                    <div className="bg-slate-950 border border-slate-800 rounded-lg p-3 font-mono text-[10px] text-emerald-400 min-h-36 overflow-auto max-h-48 leading-relaxed">
                      {simResult.combinedOutput ? (
                        <pre>{JSON.stringify(simResult.combinedOutput, null, 2)}</pre>
                      ) : (
                        <span className="text-slate-600 block text-center pt-10">Standby for simulation output...</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* View 2: STUNNING INTERACTIVE SWAGGER UI */}
            {activeTab === "swagger" && (
              <div className="flex-1 flex flex-col gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-xs text-white uppercase tracking-wider">Swagger OpenAPI Interactive Playground</h3>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1">Directly call specific microservice endpoints under simulated environment constraints.</p>
                  </div>
                  <span className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold font-mono py-1 px-2.2 rounded border border-emerald-500/20 shadow-md">
                    OAS v3.0
                  </span>
                </div>

                {/* Selector Header info */}
                <div className="flex gap-2.5 overflow-x-auto pb-2 border-b border-slate-800">
                  {[
                    { id: "simulate", method: "POST", path: "/simulate", color: "bg-emerald-500/10 text-emerald-400 text-[10.5px] border-emerald-500/25 border font-mono rounded px-2.5 py-1 text-xs" },
                    { id: "evaluation", method: "POST", path: "/evaluation", color: "bg-indigo-500/10 text-indigo-400 text-[10.5px] border-indigo-500/25 border font-mono rounded px-2.5 py-1 text-xs" },
                    { id: "decision", method: "POST", path: "/decision", color: "bg-purple-500/10 text-purple-400 text-[10.5px] border-purple-500/25 border font-mono rounded px-2.5 py-1 text-xs" },
                    { id: "monitoring", method: "POST", path: "/monitoring", color: "bg-amber-500/10 text-amber-500 text-[10.5px] border-amber-500/25 border font-mono rounded px-2.5 py-1 text-xs" },
                  ].map((ep) => (
                    <button
                      key={ep.id}
                      onClick={() => setSwaggerEndpoint(ep.id as any)}
                      className={`flex items-center gap-1.5 transition whitespace-nowrap cursor-pointer hover:bg-slate-800 px-3 py-1.5 rounded-lg ${
                        swaggerEndpoint === ep.id 
                          ? "bg-slate-800 ring-1 ring-emerald-500/40" 
                          : "opacity-75"
                      }`}
                    >
                      <span className="text-[10px] bg-sky-500/15 text-sky-400 font-bold rounded-sm px-1 font-mono">POST</span>
                      <span className="text-xs font-semibold font-mono text-slate-200">{ep.path}</span>
                    </button>
                  ))}
                </div>

                {/* Workspace grid splits body and output */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                  
                  {/* Body input pane */}
                  <div className="flex flex-col gap-2">
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Request Payload JSON</span>
                    <textarea
                      value={swaggerPayload}
                      onChange={(e) => setSwaggerPayload(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-xs text-slate-200 flex-1 focus:outline-none focus:border-indigo-500 leading-relaxed min-h-60"
                    />

                    <button
                      onClick={trySwaggerEndpoint}
                      disabled={swaggerLoading}
                      className="bg-gradient-to-r from-indigo-600 to-indigo-500 text-white font-semibold text-xs py-3.5 rounded-xl flex items-center justify-center gap-2 outline-none cursor-pointer transition hover:from-indigo-500 active:scale-[0.98]"
                    >
                      {swaggerLoading ? (
                        <>
                          <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          TRANSMITTING CALL...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          EXECUTE HTTP TRIGGER
                        </>
                      )}
                    </button>
                  </div>

                  {/* Output response pane */}
                  <div className="flex flex-col gap-2.5">
                    <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wide">Server Response Frame</span>
                    
                    <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 flex-1 min-h-60 flex flex-col">
                      {swaggerResponse ? (
                        <div className="flex flex-col gap-3 flex-1 font-mono">
                          
                          {/* Headers block */}
                          <div className="p-2 border border-slate-900 rounded bg-slate-950 text-[10px]">
                            <span className="text-slate-500 uppercase block mb-1 font-sans font-bold tracking-wider">HTTP Response Headers</span>
                            {Object.entries(swaggerHeaders || {}).map(([k, v]: any) => (
                              <div key={k} className="flex justify-between py-0.5">
                                <span className="text-slate-400">{k}:</span>
                                <span className="text-indigo-400">{v}</span>
                              </div>
                            ))}
                          </div>

                          {/* Body response block */}
                          <div className="text-[11px] text-emerald-400 overflow-auto flex-1 max-h-64 leading-relaxed mt-2.5">
                            <pre>{JSON.stringify(swaggerResponse, null, 2)}</pre>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-600 text-xs italic block text-center pt-24 m-auto">
                          Click "EXECUTE HTTP TRIGGER" above to complete network execution.
                        </span>
                      )}
                    </div>
                  </div>

                </div>
              </div>
            )}

            {/* View 3: SECURE TELEMETRY LOGGER CONSOLE */}
            {activeTab === "logs" && (
              <div className="flex-1 flex flex-col gap-3">
                <div className="p-3 bg-slate-950 border border-slate-850 rounded-xl flex items-center justify-between shadow-md">
                  <div>
                    <h3 className="font-semibold text-xs text-white uppercase tracking-wider">Gateway Telemetry logging Monitor</h3>
                    <p className="text-xs text-slate-400">Captures output from Express microservices `/api/simulate` sequence directly inside the node runtime process.</p>
                  </div>
                  
                  <button 
                    onClick={clearTelemetry}
                    className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 font-medium cursor-pointer transition"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Clear Terminal
                  </button>
                </div>

                {/* Console Black screen */}
                <div className="flex-1 bg-black border border-slate-800 rounded-2xl p-4 font-mono text-xs overflow-y-auto max-h-[380px] flex flex-col gap-1.5 scrollbar-thin shadow-inner leading-relaxed">
                  
                  {logs.length === 0 ? (
                    <div className="text-slate-600 italic py-6 text-center m-auto">Terminal listening. Logs will accumulate on simulations...</div>
                  ) : (
                    logs.map((log) => {
                      const levelColors = {
                        INFO: "text-emerald-400",
                        WARN: "text-amber-400",
                        ERROR: "text-rose-400 font-bold",
                        DEBUG: "text-indigo-400"
                      };
                      return (
                        <div key={log.id} className="border-b border-slate-900/40 pb-1.5 flex flex-col gap-1 hover:bg-slate-950 px-1 py-0.5 rounded transition">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-slate-550 font-sans text-[10px]">{new Date(log.timestamp).toLocaleTimeString()}</span>
                            <span className={`text-[10px] uppercase tracking-wider font-bold ${levelColors[log.level]}`}>[{log.level}]</span>
                            <span className="text-sky-400 text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 font-bold">[{log.service}]</span>
                            <span className="text-slate-400 font-semibold">{log.message}</span>
                          </div>
                          {log.details && (
                            <div className="text-[10px] text-slate-500 pl-4 bg-slate-950 p-2.5 rounded-lg border border-slate-900 mt-1">
                              <pre className="overflow-auto">{JSON.stringify(log.details, null, 2)}</pre>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                  <div ref={telemetryEndRef} />
                </div>
              </div>
            )}

            {/* View 4: PYTHON SOURCE WORKSPACE EXPORT */}
            {activeTab === "export" && (
              <div className="flex-1 flex flex-col gap-4">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <h3 className="font-semibold text-xs text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Laptop className="w-4 h-4 text-cyan-400" />
                    Standalone Python FastAPI Project Files
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mt-1">
                    All standalone backend Python files are completely saved in the directory tree of this workspace, structured cleanly for VS Code execution! Inside the `api-gateway-simulator` root, you'll find everything implemented with zero placeholders. Let's study and inspect the code files directly:
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1">
                  
                  {/* File Tree Left Rail */}
                  <div className="lg:col-span-4 flex flex-col gap-1.5 bg-slate-950 border border-slate-850 p-2.5 rounded-xl">
                    <span className="text-[10px] text-slate-400 font-mono uppercase tracking-widest block mb-2 font-bold pl-2">Project files tree</span>
                    
                    {PYTHON_CODE_FILES.map((file, idx) => (
                      <button
                        key={file.path}
                        onClick={() => setSelectedFileIdx(idx)}
                        className={`text-left text-xs font-mono py-2 px-3 rounded-lg flex flex-col gap-1 cursor-pointer transition ${
                          selectedFileIdx === idx 
                            ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20" 
                            : "text-slate-400 hover:bg-slate-800/40 hover:text-slate-200"
                        }`}
                      >
                        <span className="truncate">{file.path.split("/").pop()}</span>
                        <span className="text-[9px] text-slate-500 font-sans truncate">{file.path.substring(0, file.path.lastIndexOf("/"))}</span>
                      </button>
                    ))}
                  </div>

                  {/* Code Block Right Panel */}
                  <div className="lg:col-span-8 flex flex-col gap-2">
                    <div className="flex items-center justify-between text-xs text-slate-400 px-1 font-semibold">
                      <span className="font-mono text-cyan-400 text-xs truncate">api-gateway-simulator/{PYTHON_CODE_FILES[selectedFileIdx].path}</span>
                      <button 
                        onClick={() => copyCodeToClipboard(PYTHON_CODE_FILES[selectedFileIdx].code)}
                        className="text-xs text-slate-300 hover:text-cyan-400 font-medium flex items-center gap-1 cursor-pointer transition"
                      >
                        {copiedFile ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5" />
                            Copy File
                          </>
                        )}
                      </button>
                    </div>

                    <div className="bg-slate-950 border border-slate-850 p-4 rounded-xl font-mono text-[11px] leading-relaxed text-slate-200 overflow-auto max-h-75 shadow-lg select-all">
                      <pre>{PYTHON_CODE_FILES[selectedFileIdx].code}</pre>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed italic px-1 pt-1 bg-slate-950/20 p-2.5 rounded-lg border border-slate-900 border">
                      <strong>File info:</strong> {PYTHON_CODE_FILES[selectedFileIdx].description}
                    </p>
                  </div>

                </div>
              </div>
            )}

          </div>

          {/* Bottom quick execution guides strip */}
          <footer className="bg-slate-900 border-x border-b border-slate-850 py-3 px-5 rounded-b-2xl flex flex-wrap items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-2">
              <Laptop className="w-4 h-4 text-emerald-400" />
              Copy ZIP, or copy code blocks to execute immediately in your local terminal.
            </span>
            <div className="flex items-center gap-3">
              <span className="text-[11px] font-mono text-slate-550">Uvicorn: 8000</span>
              <span className="text-[11px] font-mono text-slate-550">Node: 3000</span>
            </div>
          </footer>

        </div>
      </div>
    </div>
  );
}
