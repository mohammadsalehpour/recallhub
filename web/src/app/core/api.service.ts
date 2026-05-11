import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  ApiEnvelope,
  AuditLog,
  ConfigFile,
  JsonRecord,
  Project,
  ProjectPath,
  Repository,
  StabilitySnapshot,
  TechStackItem,
  WorkItem,
  WorkflowDefinition,
  WorkflowEvent,
  WorkflowRun,
} from './models';
import { AppStateService } from './app-state.service';

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly state = inject(AppStateService);

  health() {
    return this.request<{ name: string; status: string; timestamp: string }>('GET', '');
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
  ): Promise<T> {
    const token = this.state.token();
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}`, 'x-recallhub-api-key': token } : {}),
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
