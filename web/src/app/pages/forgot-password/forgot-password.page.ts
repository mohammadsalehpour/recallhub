import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, messageFromError } from '../../core/api.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-stack">
      <div class="auth-brand-outside" aria-label="RecallHub">
        <span class="auth-logo">RH</span>
        <div>
          <strong>RecallHub</strong>
          <small>Control Plane</small>
        </div>
      </div>

      <section class="auth-card" aria-labelledby="forgotTitle">
        <h1 id="forgotTitle" class="auth-title">بازیابی رمز عبور</h1>

        @if (notice()) {
          <p class="alert success">{{ notice() }}</p>
        }
        @if (error()) {
          <p class="alert error">{{ error() }}</p>
        }

        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="identifier">ایمیل، نام کاربری یا موبایل</label>
            <input id="identifier" formControlName="identifier" autocomplete="username" />
          </div>

          <button class="btn primary auth-submit" type="submit">ثبت درخواست بازیابی</button>
        </form>

        <p class="auth-switch">
          رمز عبور را به یاد آوردید؟
          <a routerLink="/login">بازگشت به ورود</a>
        </p>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ForgotPasswordPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);

  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly form = this.fb.group({
    identifier: ['', Validators.required],
  });

  async submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.notice.set('');
    this.error.set('');
    try {
      const response = await this.api.forgotPassword(this.form.getRawValue());
      this.notice.set(response.message);
    } catch (error) {
      this.error.set(messageFromError(error));
    }
  }
}
