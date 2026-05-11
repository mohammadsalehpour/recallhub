import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AppStateService } from '../../core/app-state.service';
import { Role } from '../../core/models';

@Component({
  selector: 'app-login-page',
  imports: [ReactiveFormsModule],
  template: `
    <section class="page-title">
      <span class="eyebrow">P01 Login</span>
      <h1>RecallHub Control Plane</h1>
      <p>Token و Base URL فقط برای مصرف API رسمی NestJS ذخیره می‌شوند؛ هیچ اتصال مستقیم به n8n یا دیتابیس وجود ندارد.</p>
    </section>

    <form class="glass-panel grid gap-5 p-5 lg:p-7" [formGroup]="form" (ngSubmit)="save()">
      <div class="form-grid">
        <div class="field md:col-span-2">
          <label for="token">API Token</label>
          <input id="token" type="password" formControlName="token" autocomplete="current-password" />
        </div>

        <div class="field">
          <label for="apiBaseUrl">API Base URL</label>
          <input id="apiBaseUrl" formControlName="apiBaseUrl" />
        </div>

        <div class="field">
          <label for="role">Role</label>
          <select id="role" formControlName="role">
            @for (role of roles; track role) {
              <option [value]="role">{{ role }}</option>
            }
          </select>
        </div>

        <div class="field md:col-span-2">
          <label for="activeUserId">Actor UUID</label>
          <input id="activeUserId" formControlName="activeUserId" placeholder="اختیاری برای triggeredBy و approval" />
        </div>
      </div>

      <div class="button-row">
        <button class="btn primary" type="submit">Save</button>
        <button class="btn" type="button" (click)="logout()">Logout</button>
      </div>

      @if (saved) {
        <p class="alert success">تنظیمات ذخیره شد.</p>
      }
    </form>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly state = inject(AppStateService);
  private readonly router = inject(Router);

  protected readonly roles: Role[] = ['admin', 'owner', 'ops', 'developer', 'viewer'];
  protected saved = false;
  protected readonly form = this.fb.group({
    token: [this.state.token(), Validators.required],
    apiBaseUrl: [this.state.apiBaseUrl(), Validators.required],
    role: [this.state.activeRole(), Validators.required],
    activeUserId: [this.state.activeUserId()],
  });

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.state.saveAuth(this.form.getRawValue());
    this.saved = true;
    void this.router.navigateByUrl('/project-setup');
  }

  logout() {
    this.state.logout();
    this.form.patchValue({ token: '' });
    this.saved = false;
  }
}
