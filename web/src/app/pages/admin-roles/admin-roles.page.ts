import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { ManagedRole, Permission } from '../../core/models';

@Component({
  selector: 'app-admin-roles-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-title">
      <span class="eyebrow">P80 Roles & Permissions</span>
      <h1>Roles</h1>
      <p>Roleها مجموعه‌ای از permissionها هستند و دسترسی مؤثر کاربر از union نقش‌های او ساخته می‌شود.</p>
    </section>

    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <div class="grid gap-5 xl:grid-cols-[0.8fr_1.2fr]">
      <section class="glass-panel p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-xl font-black">Create Role</h2>
          <button class="btn icon-button" type="button" title="Refresh" (click)="load()">↻</button>
        </div>
        <form class="grid gap-3" [formGroup]="roleForm" (ngSubmit)="createRole()">
          <div class="field"><label for="code">Code</label><input id="code" formControlName="code" /></div>
          <div class="field"><label for="name">Name</label><input id="name" formControlName="name" /></div>
          <div class="field"><label for="description">Description</label><textarea id="description" formControlName="description"></textarea></div>
          <button class="btn primary w-fit" type="submit">Create Role</button>
        </form>

        <div class="mt-5 grid gap-2">
          @for (role of roles(); track role.id) {
            <button class="btn justify-start" type="button" [class.primary]="selectedRole()?.id === role.id" (click)="selectRole(role)">
              {{ role.code }}
            </button>
          }
        </div>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Permissions</h2>
        @if (selectedRole()) {
          <div class="mb-4">
            <span class="pill">{{ selectedRole()?.code }}</span>
            @if (selectedRole()?.system) {
              <span class="pill warn ml-2">system</span>
            }
          </div>

          <div class="grid gap-2 md:grid-cols-2">
            @for (permission of permissions(); track permission.id) {
              <label class="pressed-panel flex items-center gap-2 p-3 text-sm font-bold text-slate-700">
                <input
                  class="h-4 w-4"
                  type="checkbox"
                  [checked]="hasPermission(permission)"
                  (change)="togglePermission(permission)"
                />
                <span>{{ permission.code }}</span>
              </label>
            }
          </div>
        } @else {
          <p class="text-sm font-bold text-slate-600">یک role را انتخاب کنید.</p>
        }
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdminRolesPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);

  protected readonly roles = signal<ManagedRole[]>([]);
  protected readonly permissions = signal<Permission[]>([]);
  protected readonly selectedRole = signal<ManagedRole | null>(null);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly roleForm = this.fb.group({
    code: ['', Validators.required],
    name: ['', Validators.required],
    description: [''],
  });

  constructor() {
    void this.load();
  }

  async load() {
    await this.capture(async () => {
      const [roles, permissions] = await Promise.all([
        this.api.roles(),
        this.api.permissions(),
      ]);
      this.roles.set(roles);
      this.permissions.set(permissions);
      const selected = this.selectedRole();
      if (selected) {
        this.selectedRole.set(roles.find((role) => role.id === selected.id) ?? null);
      }
    });
  }

  selectRole(role: ManagedRole) {
    this.selectedRole.set(role);
  }

  hasPermission(permission: Permission) {
    return (
      this.selectedRole()?.permissions.some((item) => item.id === permission.id) ?? false
    );
  }

  async createRole() {
    if (this.roleForm.invalid) {
      this.roleForm.markAllAsTouched();
      return;
    }

    await this.capture(async () => {
      const role = await this.api.createRole(this.roleForm.getRawValue());
      this.selectedRole.set(role);
      this.roleForm.reset();
      this.notice.set('Role ساخته شد.');
      await this.load();
    });
  }

  async togglePermission(permission: Permission) {
    const role = this.selectedRole();
    if (!role) return;

    await this.capture(async () => {
      const updated = this.hasPermission(permission)
        ? await this.api.removeRolePermission(role.id, permission.id)
        : await this.api.assignRolePermission(role.id, permission.id);
      this.selectedRole.set(updated);
      this.notice.set('Permission assignment به‌روزرسانی شد.');
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
