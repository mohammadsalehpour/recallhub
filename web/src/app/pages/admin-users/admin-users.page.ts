import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { CurrentUser, ManagedRole } from '../../core/models';

@Component({
  selector: 'app-admin-users-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-title">
      <span class="eyebrow">P70 User Management</span>
      <h1>Users</h1>
      <p>مدیریت کاربران و تخصیص نقش‌ها از backend RBAC خوانده و ثبت می‌شود.</p>
    </section>

    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <div class="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <section class="glass-panel p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-xl font-black">Users</h2>
          <button class="btn icon-button" type="button" title="Refresh" (click)="load()">↻</button>
        </div>
        <div class="overflow-auto">
          <table class="data-table">
            <thead><tr><th>Name</th><th>Username</th><th>Status</th><th>Roles</th><th></th></tr></thead>
            <tbody>
              @for (user of users(); track user.id) {
                <tr>
                  <td>{{ user.full_name }}</td>
                  <td>{{ user.username }}</td>
                  <td><span class="pill" [class.good]="user.status === 'active'" [class.bad]="user.status !== 'active'">{{ user.status }}</span></td>
                  <td>{{ roleSummary(user) }}</td>
                  <td><button class="btn icon-button" type="button" title="Select user" (click)="selectUser(user)">✓</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Edit User</h2>
        @if (selectedUser()) {
          <form class="grid gap-3" [formGroup]="userForm" (ngSubmit)="saveUser()">
            <div class="form-grid">
              <div class="field"><label for="firstName">First Name</label><input id="firstName" formControlName="first_name" /></div>
              <div class="field"><label for="lastName">Last Name</label><input id="lastName" formControlName="last_name" /></div>
              <div class="field"><label for="username">Username</label><input id="username" formControlName="username" /></div>
              <div class="field"><label for="email">Email</label><input id="email" formControlName="email" /></div>
              <div class="field"><label for="mobile">Mobile</label><input id="mobile" formControlName="mobile" /></div>
              <div class="field"><label for="status">Status</label><select id="status" formControlName="status"><option value="active">active</option><option value="invited">invited</option><option value="suspended">suspended</option><option value="disabled">disabled</option></select></div>
            </div>
            <button class="btn primary w-fit" type="submit">Save User</button>
          </form>

          <div class="mt-5 grid gap-3">
            <h3 class="font-black">Roles</h3>
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
          <p class="text-sm font-bold text-slate-600">یک کاربر را انتخاب کنید.</p>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminUsersPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);

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
    return user.roles.map((role) => role.code).join(', ') || 'none';
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
      this.notice.set('User ذخیره شد.');
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
      this.notice.set('Role assignment به‌روزرسانی شد.');
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
