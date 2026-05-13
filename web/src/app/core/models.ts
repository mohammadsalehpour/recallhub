export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export type JsonRecord = Record<string, JsonValue | undefined>;

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
};

export type Role =
  | 'admin'
  | 'owner'
  | 'project_owner'
  | 'architect'
  | 'developer'
  | 'reviewer'
  | 'operator'
  | 'ops'
  | 'viewer';

export type Permission = {
  id: string;
  code: string;
  description?: string | null;
};

export type UserRole = {
  id: string;
  code: Role | string;
  name: string;
  description?: string | null;
};

export type CurrentUser = {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  mobile: string;
  username: string;
  email: string;
  avatar_url?: string | null;
  status: string;
  roles: UserRole[];
  permissions: Permission[];
  created_at?: string;
  updated_at?: string;
  last_login_at?: string | null;
};

export type AuthResponse = {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  user: CurrentUser;
};

export type ManagedRole = UserRole & {
  system: boolean;
  permissions: Permission[];
};

export type Project = {
  id: string;
  projectCode?: string;
  project_code?: string;
  name: string;
  description: string;
  businessDomain?: string | null;
  business_domain?: string | null;
  status: string;
  primaryFrameworkName?: string;
  primaryFrameworkVersion?: string;
  primary_framework_name?: string;
  primary_framework_version?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type TechStackItem = {
  id?: string;
  technology_id?: string;
  technologyId?: string;
  category: string;
  name: string;
  version?: string;
  source: 'declared' | 'detected' | 'imported';
  status?: 'active' | 'suggested' | 'rejected' | 'deprecated';
  confidence?: number;
  notes?: string;
};

export type TechnologyAlias = {
  id: string;
  alias: string;
};

export type TechnologyVersion = {
  id: string;
  technologyId?: string;
  technology_id?: string;
  version: string;
  isDefault?: boolean;
  is_default?: boolean;
  isDeprecated?: boolean;
  is_deprecated?: boolean;
};

export type TechnologyCatalogItem = {
  id: string;
  slug: string;
  canonicalName?: string;
  canonical_name?: string;
  kind: string;
  ecosystem?: string | null;
  description?: string | null;
  latestVersion?: string | null;
  latest_version?: string | null;
  source: string;
  status: string;
  aliases?: TechnologyAlias[];
  versions?: TechnologyVersion[];
};

export function technologyNameOf(item: TechnologyCatalogItem | null | undefined): string {
  return item?.canonicalName ?? item?.canonical_name ?? '';
}

export function technologyLatestVersionOf(item: TechnologyCatalogItem | null | undefined): string {
  return item?.latestVersion ?? item?.latest_version ?? '';
}

export type Repository = {
  id: string;
  repoName?: string;
  repo_name?: string;
  locatorType?: string;
  locator_type?: string;
  repoRoot?: string;
  repo_root?: string;
  defaultBranch?: string | null;
  status: string;
  isPrimary?: boolean;
  validationErrorsJson?: JsonValue;
};

export type ProjectPath = {
  id: string;
  path: string;
  pathType?: string;
  path_type?: string;
  label?: string | null;
  scanPolicy?: string;
  scan_policy?: string;
  ownership: string;
};

export type ConfigFile = {
  id: string;
  relativePath?: string;
  relative_path?: string;
  configType?: string;
  config_type?: string;
  required?: boolean;
  containsSecrets?: string;
  contains_secrets?: string;
  scanPolicy?: string;
  scan_policy?: string;
};

export type WorkItem = {
  id: string;
  projectId: string;
  title: string;
  originalRequest?: string;
  original_request?: string;
  requestType?: string;
  request_type?: string;
  status: string;
  riskLevel?: string;
  risk_level?: string;
  priority?: string;
  openQuestionsJson?: JsonValue;
  createdAt?: string;
  updatedAt?: string;
};

export type WorkflowDefinition = {
  id: string;
  code: string;
  name: string;
  executor: string;
  active: boolean;
};

export type WorkflowRun = {
  id: string;
  status: string;
  workflowDefinition?: WorkflowDefinition;
  workflow_definition?: WorkflowDefinition;
  projectId?: string | null;
  workItemId?: string | null;
  inputJson?: JsonValue;
  outputJson?: JsonValue;
  errorJson?: JsonValue;
  createdAt?: string;
  updatedAt?: string;
  finishedAt?: string | null;
};

export type WorkflowEvent = {
  id: string;
  workflowRunId?: string;
  eventType?: string;
  event_type?: string;
  payloadJson?: JsonValue;
  createdAt?: string;
};

export type StabilitySnapshot = {
  projects: number;
  workflow_runs_by_status: { status: string; count: number }[];
  stale_workflow_runs: number;
};

export type AuditLog = {
  id: string;
  projectId?: string | null;
  action: string;
  resourceType?: string;
  resourceId?: string;
  outcome?: string;
  reason?: string | null;
  createdAt?: string;
};

export function projectCodeOf(project: Project | null | undefined): string {
  return (project?.projectCode ?? project?.project_code ?? '').toUpperCase();
}

export function compactRecord(record: Record<string, unknown>): JsonRecord {
  return Object.fromEntries(
    Object.entries(record).filter(([, value]) => value !== undefined && value !== ''),
  ) as JsonRecord;
}
