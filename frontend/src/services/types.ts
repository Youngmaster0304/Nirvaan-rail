/**
 * Response shapes for the A-ABPS backend API.
 * Contract source: task_plan.md §2 — do not diverge without updating that file.
 */

/* ---------------- auth ---------------- */

export interface User {
  employee_id: string;
  name: string;
  role: string;
  department: string;
  zone: string;
  division?: string | null;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: User;
}

/* ---------------- tasks ---------------- */

export interface TaskItem {
  task_id: string;
  department: string;
  asset_type: string;
  section_id: string;
  corridor_id: string;
  defect_type: string;
  defect_severity: string;
  required_duration_min: number;
  safety_constraints?: string | string[] | null;
  weather_sensitivity?: string | boolean | null;
  status: string;
  priority_score?: number | null;
  shap_values?: Record<string, number> | null;
  created_at: string;
  updated_at: string;
  /* exposed by the DB model when the response model includes them */
  corridor_name?: string;
  days_overdue?: number;
  due_date?: string | null;
  assigned_block_id?: string | null;
  assigned_officer?: string | null;
  trains_affected?: number | null;
  form_no?: string;
  /* prioritisation extras */
  priority_rank?: number;
  shap_explanation?: Record<string, number>;
  policy_rules?: string[];
}

export interface TaskListResponse {
  items: TaskItem[];
  tasks?: TaskItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface TaskBulkActionResult {
  updated: number;
  message?: string;
}

export interface PrioritizeResponse {
  tasks: TaskItem[];
  total_count: number;
  model_version: string;
  timestamp: string;
}

export interface PrioritizeResultsResponse {
  items: TaskItem[];
  tasks?: TaskItem[];
  total_count?: number;
  model_version?: string;
  timestamp?: string;
}

export interface ShapContribution {
  feature: string;
  value: number;
  display: string;
}

export interface ShapExplanationResponse {
  task_id: string;
  base_value: number;
  score: number;
  contributions: ShapContribution[];
  model_version?: string;
  policy_rules?: string[];
  note?: string | null;
}

/* ---------------- optimisation ---------------- */

export interface PlanWindow {
  start: string;
  end: string;
  days: number;
}

export interface BlockPlanSummary {
  block_id: string;
  section: string;
  window: string;
  departments: string[];
  task_count: number;
  status: string;
  corridor_id?: string;
  corridor_name?: string;
  start_time?: string | null;
  end_time?: string | null;
  task_ids?: string[];
  impact_score?: number;
  trains_affected?: number;
  emergency?: boolean;
}

export interface WeeklyPlanResponse {
  plan_id: string;
  blocks: BlockPlanSummary[];
  total_blocks: number;
  total_tasks_scheduled: number;
  estimated_impact: string;
  window: PlanWindow;
  degraded?: boolean;
  based_on?: string | null;
  carried_over_tasks?: number;
  model_version?: string;
}

export type MonthlyPlanResponse = WeeklyPlanResponse;

/* ---------------- AI recommendations ---------------- */

export interface Recommendation {
  id: string;
  kind: 'MERGE' | 'DEFER' | 'ALERT' | 'OPT' | 'OPTIMIZE' | 'SCHEDULE';
  title: string;
  detail: string;
  status: string;
  ref: string;
  savings_label: string;
  savings_hours?: number;
  issued_at: string;
  actionable: boolean;
  source: string;
  impact?: string;
}

export interface RecommendationListResponse {
  items: Recommendation[];
  generated_at: string;
  model_version?: string;
}

export interface RecommendationDecisionResponse {
  id: string;
  status: string;
  audit_id: string;
  message: string;
}

export interface PlanListItem {
  plan_id: string;
  plan_type: string;
  window: PlanWindow;
  total_blocks: number;
  total_tasks_scheduled: number;
  estimated_impact: string;
  status: string;
  created_at: string;
  corridor_id?: string | null;
}

export interface PlanListResponse {
  items: PlanListItem[];
  plans?: PlanListItem[];
  total?: number;
}

export interface PlanDetailResponse {
  plan_id: string;
  plan_type: string;
  window: PlanWindow;
  blocks: BlockPlanSummary[];
  total_blocks: number;
  total_tasks_scheduled: number;
  estimated_impact: string;
  status: string;
  created_at: string;
  degraded?: boolean;
  total_trains_impacted?: number;
}

/* ---------------- simulation ---------------- */

export interface SimulationResult {
  plan_id: string;
  trains_affected: number;
  avg_delay_minutes: number;
  freight_throughput_impact_pct: number;
  corridor_capacity_pct: number;
  details?: Record<string, unknown>;
  with_ai: Record<string, number | string>;
  without_ai: Record<string, number | string>;
  scenario_name?: string;
  comparison?: Record<string, unknown>;
}

/* ---------------- audit ---------------- */

export interface AuditEntry {
  audit_id: string;
  user_id: string;
  user_name: string;
  action: string;
  entity_type: string;
  entity_id: string;
  details?: unknown;
  reason?: string | null;
  is_override?: boolean;
  timestamp: string;
  hash?: string;
}

export interface AuditListResponse {
  items: AuditEntry[];
  entries?: AuditEntry[];
  total: number;
  page?: number;
  page_size?: number;
}

export interface DecisionResponse {
  ok: boolean;
  audit_id: string;
  updated?: number;
  plan_id?: string;
}

/* ---------------- corridors ---------------- */

export interface Section {
  section_id: string;
  name: string;
  length_km: number;
  from_station_code?: string;
  to_station_code?: string;
}

export interface Corridor {
  corridor_id: string;
  name: string;
  zone?: string;
  from_station_name?: string;
  to_station_name?: string;
  total_sections?: number;
  sections: Section[];
}

export interface CorridorListResponse {
  items: Corridor[];
  total: number;
}

export interface CorridorKPI {
  corridor_id: string;
  name: string;
  punctuality: number;
  block_reliability: number;
  block_productivity: number;
  asset_failure_rate: number;
  composite_score: number;
  date?: string | null;
}

export interface CorridorKPIListResponse {
  items: CorridorKPI[];
  total?: number;
}

export interface CorridorTopology {
  nodes: Array<Record<string, unknown>>;
  edges: Array<Record<string, unknown>>;
}

/* ---------------- reports / chat / gov ---------------- */

export interface ReportResponse {
  report_id: string;
  report_type: string;
  summary: string;
  download_url: string;
  generated_at: string;
  data: Record<string, unknown>;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatResponse {
  reply: string;
  source: 'db' | 'llm' | 'rules';
  data?: Record<string, unknown> | null;
}

export interface SuggestedPrompts {
  prompts?: string[];
  items?: string[];
}

export interface GovLiveResponse {
  source: string;
  dataset: string;
  fetched_at: string;
  records: Array<Record<string, unknown>>;
  cached: boolean;
  note?: string | null;
}

export interface GovDataset {
  key: string;
  title: string;
  description: string;
  source: string;
}

export interface GovDatasetListResponse {
  items: GovDataset[];
  keys: string[];
  total: number;
}

export interface HealthResponse {
  status: string;
  model?: string;
  tasks?: number;
  version?: string;
}
