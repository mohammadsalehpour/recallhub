import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import { I18nService } from '../../core/i18n.service';
import { LocalizePipe } from '../../shared/localize.pipe';

@Component({
  selector: 'app-register-page',
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

      <section class="auth-card auth-card-wide" aria-labelledby="registerTitle">
        <h1 id="registerTitle" class="auth-title">{{ 'auth.registerTitle' | localize }}</h1>

        @if (error()) {
          <p class="alert error">{{ error() }}</p>
        }

        <form class="auth-form" [formGroup]="form" (ngSubmit)="register()">
          <div class="form-grid">
            <div class="field">
              <label for="firstName">{{ 'auth.firstName' | localize }}</label>
              <input id="firstName" formControlName="first_name" autocomplete="given-name" />
            </div>
            <div class="field">
              <label for="lastName">{{ 'auth.lastName' | localize }}</label>
              <input id="lastName" formControlName="last_name" autocomplete="family-name" />
            </div>
            <div class="field">
              <label for="mobile">{{ 'auth.mobile' | localize }}</label>
              <input id="mobile" formControlName="mobile" autocomplete="tel" inputmode="tel" />
            </div>
            <div class="field">
              <label for="username">{{ 'auth.username' | localize }}</label>
              <input id="username" formControlName="username" autocomplete="username" />
            </div>
            <div class="field md:col-span-2">
              <label for="email">{{ 'auth.email' | localize }}</label>
              <input id="email" type="email" formControlName="email" autocomplete="email" />
            </div>
            <div class="field">
              <label for="password">{{ 'auth.password' | localize }}</label>
              <input id="password" type="password" formControlName="password" autocomplete="new-password" />
            </div>
            <div class="field">
              <label for="confirm">{{ 'auth.confirmPassword' | localize }}</label>
              <input id="confirm" type="password" formControlName="password_confirmation" autocomplete="new-password" />
            </div>
          </div>

          <button class="btn primary auth-submit" type="submit">{{ 'auth.registerButton' | localize }}</button>
        </form>

        <p class="auth-switch">
          {{ 'auth.haveAccount' | localize }}
          <a routerLink="/login">{{ 'auth.loginLink' | localize }}</a>
        </p>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  private readonly state = inject(AppStateService);
  private readonly router = inject(Router);
  protected readonly i18n = inject(I18nService);

  protected readonly error = signal('');
  protected readonly form = this.fb.group({
    first_name: ['', Validators.required],
    last_name: ['', Validators.required],
    mobile: ['', Validators.required],
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    password_confirmation: ['', [Validators.required, Validators.minLength(8)]],
  });

  async register() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (value.password !== value.password_confirmation) {
      this.error.set(this.i18n._('auth.passwordMismatch'));
      return;
    }

    this.error.set('');
    try {
      const response = await this.api.register(value);
      this.state.saveSession(response);
      await this.router.navigateByUrl('/project-setup');
    } catch (error) {
      this.error.set(messageFromError(error));
    }
  }
}
