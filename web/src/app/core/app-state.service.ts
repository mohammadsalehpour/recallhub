import { Injectable, computed, signal } from '@angular/core';
import { Role } from './models';

const storage = globalThis.localStorage;

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly token = signal(storage?.getItem('recallhub.token') ?? '');
  readonly apiBaseUrl = signal(
    storage?.getItem('recallhub.apiBaseUrl') ?? 'http://localhost:3000/api/v1',
  );
  readonly activeProjectCode = signal(storage?.getItem('recallhub.activeProjectCode') ?? '');
  readonly activeProjectId = signal(storage?.getItem('recallhub.activeProjectId') ?? '');
  readonly activeRepositoryId = signal(storage?.getItem('recallhub.activeRepositoryId') ?? '');
  readonly activeWorkItemId = signal(storage?.getItem('recallhub.activeWorkItemId') ?? '');
  readonly activeWorkItemStatus = signal(storage?.getItem('recallhub.activeWorkItemStatus') ?? '');
  readonly activeRunId = signal(storage?.getItem('recallhub.activeRunId') ?? '');
  readonly activeUserId = signal(storage?.getItem('recallhub.activeUserId') ?? '');
  readonly activeRole = signal<Role>((storage?.getItem('recallhub.activeRole') as Role) ?? 'developer');

  readonly isAuthenticated = computed(() => this.token().trim().length > 0);
  readonly isAdmin = computed(() => ['admin', 'owner', 'ops'].includes(this.activeRole()));

  saveAuth(input: {
    token: string;
    apiBaseUrl: string;
    role: Role;
    activeUserId?: string;
  }) {
    this.setToken(input.token);
    this.setApiBaseUrl(input.apiBaseUrl);
    this.setRole(input.role);
    this.setActiveUserId(input.activeUserId ?? '');
  }

  setToken(value: string) {
    this.persist(this.token, 'recallhub.token', value.trim());
  }

  setApiBaseUrl(value: string) {
    this.persist(this.apiBaseUrl, 'recallhub.apiBaseUrl', value.trim().replace(/\/+$/, ''));
  }

  setRole(value: Role) {
    this.persist(this.activeRole, 'recallhub.activeRole', value);
  }

  setActiveUserId(value: string) {
    this.persist(this.activeUserId, 'recallhub.activeUserId', value.trim());
  }

  selectProject(projectCode: string, projectId?: string) {
    this.persist(this.activeProjectCode, 'recallhub.activeProjectCode', projectCode.trim().toUpperCase());
    if (projectId) this.persist(this.activeProjectId, 'recallhub.activeProjectId', projectId);
  }

  selectRepository(id: string) {
    this.persist(this.activeRepositoryId, 'recallhub.activeRepositoryId', id);
  }

  selectWorkItem(id: string, status?: string) {
    this.persist(this.activeWorkItemId, 'recallhub.activeWorkItemId', id);
    if (status) this.persist(this.activeWorkItemStatus, 'recallhub.activeWorkItemStatus', status);
  }

  selectRun(id: string) {
    this.persist(this.activeRunId, 'recallhub.activeRunId', id);
  }

  idempotencyKey(prefix: string) {
    return `${prefix}-${Date.now()}-${crypto.randomUUID()}`;
  }

  logout() {
    [
      'token',
      'activeProjectCode',
      'activeProjectId',
      'activeRepositoryId',
      'activeWorkItemId',
      'activeWorkItemStatus',
      'activeRunId',
    ].forEach((key) => storage?.removeItem(`recallhub.${key}`));
    this.token.set('');
    this.activeProjectCode.set('');
    this.activeProjectId.set('');
    this.activeRepositoryId.set('');
    this.activeWorkItemId.set('');
    this.activeWorkItemStatus.set('');
    this.activeRunId.set('');
  }

  private persist<T>(target: { set(value: T): void }, key: string, value: T) {
    target.set(value);
    if (typeof value === 'string' && value.length === 0) {
      storage?.removeItem(key);
      return;
    }
    storage?.setItem(key, String(value));
  }
}
