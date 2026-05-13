import { Injectable, computed, signal } from '@angular/core';
import { AuthResponse, CurrentUser, Role } from './models';

const storage = globalThis.localStorage;
const currentUser = storage?.getItem('recallhub.currentUser');

function parseCurrentUser(value: string | null | undefined): CurrentUser | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as CurrentUser;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AppStateService {
  readonly token = signal(storage?.getItem('recallhub.token') ?? '');
  readonly apiBaseUrl = signal(
    storage?.getItem('recallhub.apiBaseUrl') ?? 'http://localhost:3000/api/v1',
  );
  readonly currentUser = signal<CurrentUser | null>(parseCurrentUser(currentUser));
  readonly activeProjectCode = signal(storage?.getItem('recallhub.activeProjectCode') ?? '');
  readonly activeProjectId = signal(storage?.getItem('recallhub.activeProjectId') ?? '');
  readonly activeRepositoryId = signal(storage?.getItem('recallhub.activeRepositoryId') ?? '');
  readonly activeWorkItemId = signal(storage?.getItem('recallhub.activeWorkItemId') ?? '');
  readonly activeWorkItemStatus = signal(storage?.getItem('recallhub.activeWorkItemStatus') ?? '');
  readonly activeRunId = signal(storage?.getItem('recallhub.activeRunId') ?? '');
  readonly activeUserId = computed(() => this.currentUser()?.id ?? '');
  readonly activeRole = computed<Role>(() => {
    const role = this.currentUser()?.roles[0]?.code;
    return (role as Role | undefined) ?? 'viewer';
  });

  readonly isAuthenticated = computed(() => this.token().trim().length > 0);
  readonly isAdmin = computed(
    () =>
      ['admin', 'owner'].includes(this.activeRole()) ||
      this.hasPermission('user.manage') ||
      this.hasPermission('role.manage') ||
      this.hasPermission('settings.write'),
  );

  saveSession(response: AuthResponse) {
    this.setToken(response.access_token);
    this.currentUser.set(response.user);
    storage?.setItem('recallhub.currentUser', JSON.stringify(response.user));
  }

  refreshUser(user: CurrentUser) {
    this.currentUser.set(user);
    storage?.setItem('recallhub.currentUser', JSON.stringify(user));
  }

  hasPermission(permission: string) {
    return (
      this.currentUser()?.permissions.some((item) => item.code === permission) ??
      false
    );
  }

  setToken(value: string) {
    this.persist(this.token, 'recallhub.token', value.trim());
  }

  setApiBaseUrl(value: string) {
    this.persist(this.apiBaseUrl, 'recallhub.apiBaseUrl', value.trim().replace(/\/+$/, ''));
  }

  selectProject(projectCode: string, projectId?: string) {
    this.persist(this.activeProjectCode, 'recallhub.activeProjectCode', projectCode.trim().toUpperCase());
    if (projectId !== undefined) this.persist(this.activeProjectId, 'recallhub.activeProjectId', projectId);
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
      'currentUser',
    ].forEach((key) => storage?.removeItem(`recallhub.${key}`));
    this.token.set('');
    this.currentUser.set(null);
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
