import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { I18nService } from '../../core/i18n.service';
import { CurrentUser, ManagedRole } from '../../core/models';
import { LocalizePipe } from '../../shared/localize.pipe';

@Component({
  selector: 'app-admin-users-page',
  imports: [CommonModule, ReactiveFormsModule, LocalizePipe],
  template: `
    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <div class="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section class="glass-panel p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-xl font-black">{{ 'users.title' | localize }}</h2>
          <button class="btn icon-button" type="button" [attr.title]="'common.refresh' | localize" (click)="load()">↻</button>
        </div>
        <div class="overflow-auto">
          <table class="data-table">
            <thead><tr><th>{{ 'common.name' | localize }}</th><th>{{ 'common.username' | localize }}</th><th>{{ 'common.status' | localize }}</th><th>{{ 'common.roles' | localize }}</th><th></th></tr></thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>{{ user.full_name }}</td>
                  <td>{{ user.username }}</td>
                  <td><span class="pill" [class.good]="user.status === 'active'" [class.bad]="user.status !== 'active'">{{ user.status }}</span></td>
                  <td>{{ roleSummary(user) }}</td>
                  <td><button class="btn icon-button" type="button" [attr.title]="'common.select' | localize" (click)="selectUser(user)">✓</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">{{ 'users.editTitle' | localize }}</h2>
        @if (selectedUser()) {
          <form class="grid gap-3" [formGroup]="userForm" (ngSubmit)="saveUser()">
            <div class="form-grid">
              <div class="field"><label for="firstName">{{ 'common.firstName' | localize }}</label><input id="firstName" formControlName="first_name" /></div>
              <div class="field"><label for="lastName">{{ 'common.lastName' | localize }}</label><input id="lastName" formControlName="last_name" /></div>
              <div class="field"><label for="username">{{ 'common.username' | localize }}</label><input id="username" formControlName="username" /></div>
              <div class="field"><label for="email">{{ 'common.email' | localize }}</label><input id="email" formControlName="email" /></div>
              <div class="field"><label for="mobile">{{ 'common.mobile' | localize }}</label><input id="mobile" formControlName="mobile" /></div>
              <div class="field"><label for="status">{{ 'common.status' | localize }}</label><select id="status" formControlName="status"><option value="active">{{ 'enum.active' | localize }}</option><option value="invited">{{ 'enum.invited' | localize }}</option><option value="suspended">{{ 'enum.suspended' | localize }}</option><option value="disabled">{{ 'enum.disabled' | localize }}</option></select></div>
            </div>
            <button class="btn primary w-fit" type="submit">{{ 'users.save' | localize }}</button>
          </form>

          <div class="mt-5 grid gap-3">
            <h3 class="font-black">{{ 'common.roles' | localize }}</h3>
            <div class="button-row">
              @for (role of roles(); track role.id) {
                <button
                  class="btn"
                  type="button"
                  [class.primary]="hasRole(role)"
                  (click)="toggleRole(role)"
                >
                  {{ role.code }}
                </button>
              }
            </div>
          </div>
        } @else {
          <p class="text-sm font-bold text-slate-600">{{ 'users.selectUser' | localize }}</p>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);

  protected readonly users = signal<CurrentUser[]>([]);
  protected readonly roles = signal<ManagedRole[]>([]);
  protected readonly selectedUser = signal<CurrentUser | null>(null);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly userForm = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    mobile: ['', Validators.required],
    status: ['active', Validators.required],
  });

  constructor() {
    void this.load();
  }

  async load() {
    await this.capture(async () => {
      const [users, roles] = await Promise.all([this.api.users(), this.api.roles()]);
      this.users.set(users);
      this.roles.set(roles);
    });
  }

  selectUser(user: CurrentUser) {
    this.selectedUser.set(user);
    this.userForm.setValue({
      first_name: user.first_name,
      last_name: user.last_name,
      username: user.username,
      email: user.email,
      mobile: user.mobile,
      status: user.status,
    });
  }

  roleSummary(user: CurrentUser) {
    return user.roles.map((role) => role.code).join(', ') || this.i18n._('users.none');
  }

  hasRole(role: ManagedRole) {
    return this.selectedUser()?.roles.some((item) => item.id === role.id) ?? false;
  }

  async saveUser() {
    const user = this.selectedUser();
    if (!user || this.userForm.invalid) return;
    await this.capture(async () => {
      const updated = await this.api.updateUser(user.id, this.userForm.getRawValue());
      this.selectedUser.set(updated);
      this.notice.set(this.i18n._('users.updated'));
      await this.load();
    });
  }

  async toggleRole(role: ManagedRole) {
    const user = this.selectedUser();
    if (!user) return;
    await this.capture(async () => {
      const updated = this.hasRole(role)
        ? await this.api.removeUserRole(user.id, role.id)
        : await this.api.assignUserRole(user.id, role.id);
      this.selectedUser.set(updated);
      this.notice.set(this.i18n._('roles.permissionUpdated'));
      await this.load();
    });
  }

  private async capture(work: () => Promise<void>) {
    this.notice.set('');
    this.error.set('');
    try {
      await work();
    } catch (error) {
      this.error.set(messageFromError(error));
    }
  }
}
