import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, messageFromError } from '../../core/api.service';
import { LocalizePipe } from '../../shared/localize.pipe';

@Component({
  selector: 'app-forgot-password-page',
  imports: [ReactiveFormsModule, RouterLink, LocalizePipe],
  template: `
    <div class="auth-stack">
      <div class="auth-brand-outside" aria-label="RecallHub">
        <span class="auth-logo">RH</span>
        <div>
          <strong>RecallHub</strong>
          <small>{{ 'app.subtitle' | localize }}</small>
        </div>
      </div>

      <section class="auth-card" aria-labelledby="forgotTitle">
        <h1 id="forgotTitle" class="auth-title">{{ 'auth.forgotTitle' | localize }}</h1>

        @if (notice()) {
          <p class="alert success">{{ notice() }}</p>
        }
        @if (error()) {
          <p class="alert error">{{ error() }}</p>
        }

        <form class="auth-form" [formGroup]="form" (ngSubmit)="submit()">
          <div class="field">
            <label for="identifier">{{ 'auth.identifier' | localize }}</label>
            <input id="identifier" formControlName="identifier" autocomplete="username" />
          </div>

          <button class="btn primary auth-submit" type="submit">{{ 'auth.resetButton' | localize }}</button>
        </form>

        <p class="auth-switch">
          {{ 'auth.rememberedPassword' | localize }}
          <a routerLink="/login">{{ 'auth.backToLogin' | localize }}</a>
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
