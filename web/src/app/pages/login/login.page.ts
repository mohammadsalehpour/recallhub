import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import { LocalizePipe } from '../../shared/localize.pipe';

@Component({
  selector: 'app-login-page',
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

      <section class="auth-card" aria-labelledby="loginTitle">
        <h1 id="loginTitle" class="auth-title">{{ 'auth.loginTitle' | localize }}</h1>

        @if (error()) {
          <p class="alert error">{{ error() }}</p>
        }

        <form class="auth-form" [formGroup]="form" (ngSubmit)="login()">
          <div class="field">
            <label for="identifier">{{ 'auth.identifier' | localize }}</label>
            <input id="identifier" formControlName="identifier" autocomplete="username" inputmode="email" />
          </div>

          <div class="field">
            <label for="password">{{ 'auth.password' | localize }}</label>
            <input id="password" type="password" formControlName="password" autocomplete="current-password" />
          </div>

          <div class="auth-options">
            <label class="auth-check">
            <input type="checkbox" formControlName="remember_me" />
              <span>{{ 'auth.rememberMe' | localize }}</span>
            </label>
            <a routerLink="/forgot-password">{{ 'auth.forgotPassword' | localize }}</a>
          </div>

          <button class="btn primary auth-submit" type="submit">{{ 'auth.loginButton' | localize }}</button>
        </form>

        <p class="auth-switch">
          {{ 'auth.noAccount' | localize }}
          <a routerLink="/register">{{ 'auth.registerLink' | localize }}</a>
        </p>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  private readonly state = inject(AppStateService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  protected readonly error = signal('');
  protected readonly form = this.fb.group({
    identifier: ['', Validators.required],
    password: ['', Validators.required],
    remember_me: [true],
  });

  async login() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.error.set('');
    try {
      const response = await this.api.login(this.form.getRawValue());
      this.state.saveSession(response);
      const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl') ?? '/project-setup';
      await this.router.navigateByUrl(returnUrl);
    } catch (error) {
      this.error.set(messageFromError(error));
    }
  }
}
