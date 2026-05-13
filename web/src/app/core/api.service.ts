import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiEnvelope,
  AuthResponse,
  AuditLog,
  ConfigFile,
  CurrentUser,
  JsonRecord,
  ManagedRole,
  Permission,
  Project,
  ProjectPath,
  Repository,
  StabilitySnapshot,
  TechStackItem,
  TechnologyCatalogItem,
  WorkItem,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowRun,
} from './models';
import { AppStateService } from './app-state.service';
import { I18nService } from './i18n.service';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly state = inject(AppStateService);
  private readonly i18n = inject(I18nService);

  health() {
    return this.request<{ name: string; status: string; timestamp: string }>('GET', '');
  }

  register(body: JsonRecord) {
    return this.request<AuthResponse>('POST', '/auth/register', body, {}, false);
  }

  login(body: JsonRecord) {
    return this.request<AuthResponse>('POST', '/auth/login', body, {}, false);
  }

  forgotPassword(body: JsonRecord) {
    return this.request<{ requested: boolean; message: string }>(
      'POST',
      '/auth/forgot-password',
      body,
      {},
      false,
    );
  }

  me() {
    return this.request<CurrentUser>('GET', '/auth/me');
  }

  updateProfile(body: JsonRecord) {
    return this.request<CurrentUser>('PATCH', '/auth/profile', body);
  }

  changePassword(body: JsonRecord) {
    return this.request<{ changed: boolean }>('POST', '/auth/change-password', body);
  }

  users() {
    return this.request<CurrentUser[]>('GET', '/admin/users');
  }

  updateUser(userId: string, body: JsonRecord) {
    return this.request<CurrentUser>('PATCH', `/admin/users/${userId}`, body);
  }

  assignUserRole(userId: string, roleId: string) {
    return this.request<CurrentUser>('POST', `/admin/users/${userId}/roles`, {
      role_id: roleId,
    });
  }

  removeUserRole(userId: string, roleId: string) {
    return this.request<CurrentUser>(
      'DELETE',
      `/admin/users/${userId}/roles/${roleId}`,
    );
  }

  roles() {
    return this.request<ManagedRole[]>('GET', '/admin/roles');
  }

  createRole(body: JsonRecord) {
    return this.request<ManagedRole>('POST', '/admin/roles', body);
  }

  updateRole(roleId: string, body: JsonRecord) {
    return this.request<ManagedRole>('PATCH', `/admin/roles/${roleId}`, body);
  }

  permissions() {
    return this.request<Permission[]>('GET', '/admin/permissions');
  }

  assignRolePermission(roleId: string, permissionId: string) {
    return this.request<ManagedRole>('POST', `/admin/roles/${roleId}/permissions`, {
      permission_id: permissionId,
    });
  }

  removeRolePermission(roleId: string, permissionId: string) {
    return this.request<ManagedRole>(
      'DELETE',
      `/admin/roles/${roleId}/permissions/${permissionId}`,
    );
  }

  projects() {
    return this.request<Project[]>('GET', '/projects');
  }

  createProject(body: JsonRecord) {
    return this.request<Project>('POST', '/projects', body);
  }

  getProject(code: string) {
    return this.request<Project>('GET', `/projects/${encodeURIComponent(code)}`);
  }

  technologyCatalog(params: { query?: string; kind?: string; ecosystem?: string; limit?: number } = {}) {
    const search = new URLSearchParams();
    if (params.query) search.set('query', params.query);
    if (params.kind) search.set('kind', params.kind);
    if (params.ecosystem) search.set('ecosystem', params.ecosystem);
    if (params.limit) search.set('limit', String(params.limit));
    const query = search.toString();
    return this.request<TechnologyCatalogItem[]>('GET', `/technology-catalog${query ? `?${query}` : ''}`);
  }

  techStack(code: string) {
    return this.request<TechStackItem[]>('GET', `/projects/${encodeURIComponent(code)}/tech-stack`);
  }

  repositories(code: string) {
    return this.request<Repository[]>('GET', `/projects/${encodeURIComponent(code)}/repositories`);
  }

  createRepository(code: string, body: JsonRecord) {
    return this.request<Repository>('POST', `/projects/${encodeURIComponent(code)}/repositories`, body);
  }

  validateRepository(code: string, repoId: string) {
    return this.request<Repository>('POST', `/projects/${encodeURIComponent(code)}/repositories/${repoId}/validate`);
  }

  paths(code: string) {
    return this.request<ProjectPath[]>('GET', `/projects/${encodeURIComponent(code)}/paths`);
  }

  createPath(code: string, body: JsonRecord) {
    return this.request<ProjectPath>('POST', `/projects/${encodeURIComponent(code)}/paths`, body);
  }

  configFiles(code: string) {
    return this.request<ConfigFile[]>('GET', `/projects/${encodeURIComponent(code)}/config-files`);
  }

  createConfigFile(code: string, body: JsonRecord) {
    return this.request<ConfigFile>('POST', `/projects/${encodeURIComponent(code)}/config-files`, body);
  }

  syncProject(code: string, idempotencyKey: string) {
    return this.request<unknown>('POST', `/projects/${encodeURIComponent(code)}/sync`, undefined, {
      'idempotency-key': idempotencyKey,
    });
  }

  modules(code: string) {
    return this.request<JsonRecord[]>('GET', `/projects/${encodeURIComponent(code)}/modules`);
  }

  files(code: string) {
    return this.request<JsonRecord[]>('GET', `/projects/${encodeURIComponent(code)}/files`);
  }

  memoryChunks(code: string) {
    return this.request<JsonRecord[]>('GET', `/projects/${encodeURIComponent(code)}/memory-chunks`);
  }

  memoryEvents(code: string) {
    return this.request<JsonRecord[]>('GET', `/projects/${encodeURIComponent(code)}/memory-events`);
  }

  memoryCommits(code: string) {
    return this.request<JsonRecord[]>('GET', `/projects/${encodeURIComponent(code)}/memory-commits`);
  }

  workItems(code: string) {
    return this.request<WorkItem[]>('GET', `/projects/${encodeURIComponent(code)}/work-items`);
  }

  createWorkItem(code: string, body: JsonRecord) {
    return this.request<WorkItem>('POST', `/projects/${encodeURIComponent(code)}/work-items`, body);
  }

  contextPacket(workItemId: string) {
    return this.request<JsonRecord>('GET', `/work-items/${workItemId}/context-packet`);
  }

  artifacts(workItemId: string) {
    return this.request<JsonRecord[]>('GET', `/work-items/${workItemId}/artifacts`);
  }

  startWorkItemAction(workItemId: string, action: string, body: JsonRecord) {
    return this.request<JsonRecord>('POST', `/work-items/${workItemId}/${action}`, body);
  }

  humanApproval(workItemId: string, body: JsonRecord) {
    return this.request<WorkItem>('POST', `/work-items/${workItemId}/human-approval`, body);
  }

  memoryCommit(workItemId: string, body: JsonRecord) {
    return this.request<JsonRecord>('POST', `/work-items/${workItemId}/memory-commit`, body);
  }

  workflows() {
    return this.request<WorkflowDefinition[]>('GET', '/workflows');
  }

  workflowRuns() {
    return this.request<WorkflowRun[]>('GET', '/workflow-runs');
  }

  workflowRun(runId: string) {
    return this.request<WorkflowRun>('GET', `/workflow-runs/${runId}`);
  }

  workflowEvents(runId: string) {
    return this.request<WorkflowEvent[]>('GET', `/workflow-runs/${runId}/events`);
  }

  runWorkflow(code: string, body: JsonRecord) {
    return this.request<WorkflowRun>('POST', `/workflows/${encodeURIComponent(code)}/run`, body);
  }

  retryRun(runId: string) {
    return this.request<JsonRecord>('POST', `/workflow-runs/${runId}/retry`);
  }

  cancelRun(runId: string) {
    return this.request<JsonRecord>('POST', `/workflow-runs/${runId}/cancel`);
  }

  stability() {
    return this.request<StabilitySnapshot>('GET', '/health/stability');
  }

  reconcile(staleMinutes: number) {
    return this.request<JsonRecord>('POST', `/admin/reconcile/workflow-runs?stale_minutes=${staleMinutes}`);
  }

  auditLogs(projectId?: string, limit = 300) {
    const params = new URLSearchParams({ limit: String(limit) });
    if (projectId) params.set('projectId', projectId);
    return this.request<AuditLog[]>('GET', `/audit/logs?${params.toString()}`);
  }

  private async request<T>(
    method: HttpMethod,
    path: string,
    body?: unknown,
    extraHeaders: Record<string, string> = {},
    authenticate = true,
  ): Promise<T> {
    const token = this.state.token();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'x-recallhub-locale': this.i18n.locale(),
      ...(authenticate && token ? { Authorization: `Bearer ${token}` } : {}),
      ...extraHeaders,
    });

    const response = await firstValueFrom(
      this.http.request<unknown>(method, `${this.state.apiBaseUrl()}${path}`, {
        body,
        headers,
      }),
    );
    return this.unwrap<T>(response);
  }

  private unwrap<T>(response: unknown): T {
    if (this.isEnvelope<T>(response)) {
      return response.data;
    }
    return response as T;
  }

  private isEnvelope<T>(value: unknown): value is ApiEnvelope<T> {
    return (
      typeof value === 'object' &&
      value !== null &&
      'success' in value &&
      'data' in value
    );
  }
}

export function messageFromError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error as { message?: unknown; error?: { message?: unknown }; code?: unknown };
    const message = body?.message ?? body?.error?.message ?? body?.code;
    if (typeof message === 'string') return message;
    return `HTTP ${error.status}`;
  }
  if (error instanceof Error) return error.message;
  return 'Unexpected error';
}
