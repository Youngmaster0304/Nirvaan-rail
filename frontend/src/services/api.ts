import axios, { AxiosError } from 'axios';
import type {
  AuditEntry,
  AuditListResponse,
  ChatMessage,
  ChatResponse,
  Corridor,
  CorridorKPIListResponse,
  CorridorListResponse,
  CorridorTopology,
  DecisionResponse,
  GovDatasetListResponse,
  GovLiveResponse,
  HealthResponse,
  LoginResponse,
  MonthlyPlanResponse,
  PlanDetailResponse,
  PlanListResponse,
  PrioritizeResponse,
  PrioritizeResultsResponse,
  RecommendationDecisionResponse,
  RecommendationListResponse,
  ReportResponse,
  ShapExplanationResponse,
  SimulationResult,
  SuggestedPrompts,
  TaskBulkActionResult,
  TaskListResponse,
  User,
  WeeklyPlanResponse,
} from './types';

export type * from './types';

/**
 * Absolute backend origin for deployed builds (e.g. https://a-abps.onrender.com).
 * Left empty in local dev and Docker, where Vite/nginx proxy `/api` to the backend.
 */
export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('cris_api_base_url');
    if (custom) return custom.trim().replace(/\/+$/, '');
  }
  const raw = (import.meta.env.VITE_API_URL as string | undefined) ?? '';
  return raw.trim().replace(/\/+$/, '');
}

export function setApiBaseUrl(url: string): void {
  if (typeof window !== 'undefined') {
    if (url && url.trim()) {
      localStorage.setItem('cris_api_base_url', url.trim().replace(/\/+$/, ''));
    } else {
      localStorage.removeItem('cris_api_base_url');
    }
  }
}

export const apiClient = axios.create({
  baseURL: getApiBaseUrl() ? `${getApiBaseUrl()}/api` : '/api',
  timeout: 30000,
});

/* ------------------------------------------------------------------
 * Auth token + 401 handling.
 * The handler is registered by the auth store so that api.ts and
 * authStore.ts stay free of a circular import.
 * ------------------------------------------------------------------ */

const TOKEN_KEY = 'auth-token';

let onUnauthorized: (() => void) | null = null;

export function setUnauthorizedHandler(handler: () => void) {
  onUnauthorized = handler;
}

apiClient.interceptors.request.use((config) => {
  const base = getApiBaseUrl();
  if (base) {
    config.baseURL = `${base}/api`;
  }
  const token = localStorage.getItem(TOKEN_KEY);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      onUnauthorized?.();
    }
    return Promise.reject(error);
  },
);

/** Pull a human-readable message out of a FastAPI / axios error. */
export function apiErrorMessage(error: unknown, fallback = 'Request failed'): string {
  if (axios.isAxiosError(error)) {
    const detail = error.response?.data as { detail?: unknown; message?: string } | undefined;
    if (typeof detail?.detail === 'string') return detail.detail;
    if (Array.isArray(detail?.detail)) {
      const first = detail.detail[0] as { msg?: string; loc?: unknown } | undefined;
      if (first?.msg) return first.msg;
    }
    if (typeof detail?.message === 'string') return detail.message;
    if (!error.response) return 'Backend unreachable. Start the API server on port 8000 and retry.';
    if (error.response.status === 401) return 'Session expired or credentials rejected. Please sign in again.';
    if (error.response.status === 403) return 'You do not have permission for this action.';
    if (error.response.status === 404) return 'The requested record was not found.';
    if (error.response.status >= 500) return 'The server returned an error. Check the API logs and retry.';
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

async function call<T>(request: Promise<{ data: T }>): Promise<T> {
  const res = await request;
  return res.data;
}

/* ---------------- auth ---------------- */

export const authApi = {
  login: (employee_id: string, password: string) =>
    call<LoginResponse>(apiClient.post('/auth/login', { employee_id, password })),
  me: () => call<User>(apiClient.get('/auth/me')),
};

/* ---------------- tasks ---------------- */

export interface TaskQuery {
  department?: string;
  severity?: string;
  status?: string;
  corridor_id?: string;
  page?: number;
  page_size?: number;
}

export const tasksApi = {
  list: (params: TaskQuery = {}) =>
    call<TaskListResponse>(apiClient.get('/tasks', { params: prune(params) })),
  get: (taskId: string) => call<TaskListResponse['items'][number]>(apiClient.get(`/tasks/${taskId}`)),
  bulkAction: (task_ids: string[], action: 'APPROVE' | 'REJECT', reason?: string) =>
    call<TaskBulkActionResult>(apiClient.post('/tasks/bulk-action', prune({ task_ids, action, reason }))),
};

/* ---------------- prioritisation ---------------- */

export const prioritizeApi = {
  run: (task_ids: string[] = []) =>
    call<PrioritizeResponse>(apiClient.post('/prioritize', { task_ids })),
  results: (limit = 100) =>
    call<PrioritizeResultsResponse>(apiClient.get('/prioritize/results', { params: { limit } })),
  shap: (taskId: string) => call<ShapExplanationResponse>(apiClient.get(`/prioritize/shap/${taskId}`)),
};

/* ---------------- optimisation ---------------- */

export interface PlanRequest {
  start_date?: string;
  horizon_days?: number;
  corridor_id?: string;
}

export const optimizeApi = {
  weekly: (req: PlanRequest = {}) =>
    call<WeeklyPlanResponse>(apiClient.post('/optimize/weekly', prune(req))),
  monthly: (req: PlanRequest = {}) =>
    call<MonthlyPlanResponse>(apiClient.post('/optimize/monthly', prune(req))),
  plans: (horizon?: string) =>
    call<PlanListResponse>(apiClient.get('/optimize/plans', { params: horizon ? { horizon } : {} })),
  plan: (id: string) => call<PlanDetailResponse>(apiClient.get(`/optimize/plans/${id}`)),
};

/* ---------------- simulation ---------------- */

export const simulateApi = {
  run: (plan_id: string, scenario_name?: string) =>
    call<SimulationResult>(apiClient.post('/simulate', prune({ plan_id, scenario_name }))),
  results: (plan_id: string) => call<SimulationResult>(apiClient.get(`/simulate/results/${plan_id}`)),
};

/* ---------------- audit ---------------- */

export interface AuditQuery {
  page?: number;
  page_size?: number;
  action?: string;
  entity_type?: string;
  date_from?: string;
  date_to?: string;
}

export const auditApi = {
  list: (params: AuditQuery = {}) =>
    call<AuditListResponse>(apiClient.get('/audit', { params: prune(params) })),
  approve: (plan_id: string, note?: string) =>
    call<DecisionResponse>(apiClient.post('/approve', prune({ plan_id, note }))),
  reject: (plan_id: string, note?: string) =>
    call<DecisionResponse>(apiClient.post('/reject', prune({ plan_id, note }))),
};

/* ---------------- corridors ---------------- */

export const corridorsApi = {
  list: () => call<CorridorListResponse>(apiClient.get('/corridors')),
  kpis: (days?: number) =>
    call<CorridorKPIListResponse>(apiClient.get('/corridors/kpis', { params: days ? { days } : {} })),
  topology: (corridorId: string) => call<CorridorTopology>(apiClient.get(`/corridors/${corridorId}/topology`)),
};

/* ---------------- reports ---------------- */

export const reportsApi = {
  generate: (type: string, plan_id?: string) =>
    call<ReportResponse>(apiClient.post('/reports/generate', prune({ type, plan_id }))),
};

/* ---------------- AI recommendations ---------------- */

export const recommendationsApi = {
  list: () => call<RecommendationListResponse>(apiClient.get('/recommendations')),
  decide: (id: string, action: 'APPROVE' | 'DISMISS', reason?: string) =>
    call<RecommendationDecisionResponse>(
      apiClient.post(`/recommendations/${encodeURIComponent(id)}/decision`, prune({ action, reason })),
    ),
};

/* ---------------- chatbot ---------------- */

export const chatApi = {
  suggestions: () => call<SuggestedPrompts>(apiClient.get('/chat')),
  post: (message: string, history: ChatMessage[], session_id?: string) =>
    call<ChatResponse>(apiClient.post('/chat', prune({ message, history, session_id }))),
};

/* ---------------- government open data ---------------- */

export const govApi = {
  datasets: () => call<GovDatasetListResponse>(apiClient.get('/gov/datasets')),
  railwayLive: (dataset?: string) =>
    call<GovLiveResponse>(apiClient.get('/gov/railway-live', { params: dataset ? { dataset } : {} })),
};

/* ---------------- health ---------------- */

export const healthApi = {
  get: () => call<HealthResponse>(apiClient.get('/health')),
};

/* ---------------- legacy namespace (kept so existing imports compile) ---------------- */

export const api = {
  auth: authApi,
  tasks: tasksApi,
  prioritize: prioritizeApi,
  optimize: optimizeApi,
  simulate: simulateApi,
  audit: auditApi,
  corridors: corridorsApi,
  reports: reportsApi,
  chat: chatApi,
  recommendations: recommendationsApi,
  gov: govApi,
  health: healthApi,
};

export type { AuditEntry, Corridor };

/** Drop undefined / empty-string values so optional query params stay optional. */
function prune<T extends object>(params: T): Partial<T> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    out[key] = value;
  }
  return out as Partial<T>;
}
