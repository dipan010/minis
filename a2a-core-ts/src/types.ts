// ── A2A Message Parts ────────────────────────────────────────────────────────

export interface TextPart {
  type: "text";
  text: string;
  metadata?: Record<string, unknown>;
}

export interface FilePart {
  type: "file";
  file: {
    name?: string;
    mimeType?: string;
    bytes?: string; // base64-encoded
    uri?: string;
  };
  metadata?: Record<string, unknown>;
}

export interface DataPart {
  type: "data";
  data: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export type Part = TextPart | FilePart | DataPart;

// ── A2A Messages & Artifacts ─────────────────────────────────────────────────

export interface Message {
  role: "user" | "agent";
  parts: Part[];
  metadata?: Record<string, unknown>;
}

export interface Artifact {
  name?: string;
  description?: string;
  parts: Part[];
  index?: number;
  metadata?: Record<string, unknown>;
}

// ── A2A Task ─────────────────────────────────────────────────────────────────

export type TaskStatus = "submitted" | "working" | "completed" | "failed" | "canceled";

export interface TaskState {
  status: TaskStatus;
  message?: Message;
  timestamp?: string;
}

export interface Task {
  id: string;
  sessionId?: string;
  status: TaskState;
  messages: Message[];
  artifacts: Artifact[];
  metadata?: Record<string, unknown>;
}

// ── A2A Agent Card ───────────────────────────────────────────────────────────

export interface AgentSkill {
  id: string;
  name: string;
  description: string;
  tags?: string[];
  examples?: string[];
  inputModes?: string[];
  outputModes?: string[];
}

export interface AgentCapabilities {
  streaming?: boolean;
  pushNotifications?: boolean;
  stateTransitionHistory?: boolean;
}

export interface AgentAuthentication {
  schemes?: string[];
  credentials?: string;
}

export interface AgentCard {
  name: string;
  description: string;
  url: string;
  version: string;
  capabilities?: AgentCapabilities;
  skills: AgentSkill[];
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
  authentication?: AgentAuthentication;
}

// ── JSON-RPC 2.0 ─────────────────────────────────────────────────────────────

export interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

export interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number;
  result?: unknown;
  error?: JsonRpcErrorObject;
}

export interface JsonRpcErrorObject {
  code: number;
  message: string;
  data?: unknown;
}

// ── A2A Task Send/Get Params ─────────────────────────────────────────────────

export interface TaskSendParams {
  id: string;
  sessionId?: string;
  message: Message;
  skill?: string;
  metadata?: Record<string, unknown>;
}

export interface TaskGetParams {
  id: string;
}

export interface TaskCancelParams {
  id: string;
}
