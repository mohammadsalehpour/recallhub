import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import { I18nService } from '../../core/i18n.service';
import { StabilitySnapshot } from '../../core/models';
import { LocalizePipe } from '../../shared/localize.pipe';

@Component({
  selector: 'app-stability-page',
  imports: [CommonModule, ReactiveFormsModule, LocalizePipe],
  template: `
    @if (!state.isAdmin()) {
      <p class="alert error mb-4">{{ 'stability.readonlyWarning' | localize }}</p>
    }
    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <section class="grid gap-5 md:grid-cols-3">
      <div class="glass-panel p-5">
        <span class="eyebrow">{{ 'stability.projects' | localize }}</span>
        <strong class="mt-2 block text-4xl">{{ snapshot()?.projects ?? 0 }}</strong>
      </div>
      <div class="glass-panel p-5">
        <span class="eyebrow">{{ 'stability.staleRuns' | localize }}</span>
        <strong class="mt-2 block text-4xl">{{ snapshot()?.stale_workflow_runs ?? 0 }}</strong>
      </div>
      <div class="glass-panel p-5">
        <span class="eyebrow">{{ 'stability.statuses' | localize }}</span>
        <strong class="mt-2 block text-4xl">{{ snapshot()?.workflow_runs_by_status?.length ?? 0 }}</strong>
      </div>
    </section>

    <div class="mt-5 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <section class="glass-panel p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-xl font-black">{{ 'stability.breakdown' | localize }}</h2>
          <button class="btn icon-button" type="button" [attr.title]="'common.refresh' | localize" (click)="load()">↻</button>
        </div>
        <table class="data-table">
          <thead><tr><th>{{ 'common.status' | localize }}</th><th>{{ 'common.count' | localize }}</th></tr></thead>
          <tbody>
            @for (row of snapshot()?.workflow_runs_by_status ?? []; track row.status) {
              <tr><td>{{ row.status }}</td><td>{{ row.count }}</td></tr>
            }
          </tbody>
        </table>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">{{ 'stability.reconcile' | localize }}</h2>
        <form class="grid gap-3" [formGroup]="form" (ngSubmit)="confirming.set(true)">
          <div class="field">
            <label for="staleMinutes">{{ 'stability.staleMinutes' | localize }}</label>
            <input id="staleMinutes" type="number" min="1" max="1440" formControlName="staleMinutes" />
          </div>
          <button class="btn danger w-fit" type="submit" [disabled]="!state.isAdmin()">{{ 'stability.reconcileRuns' | localize }}</button>
        </form>
      </section>
    </div>

    @if (confirming()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
        <section class="glass-panel max-w-md p-6">
          <h2 class="text-xl font-black">{{ 'stability.confirmReconcile' | localize }}</h2>
          <p class="my-4 text-slate-700">{{ 'stability.confirmText' | localize }}</p>
          <div class="button-row">
            <button class="btn danger" type="button" (click)="reconcile()">{{ 'stability.confirmReconcile' | localize }}</button>
            <button class="btn" type="button" (click)="confirming.set(false)">{{ 'common.cancel' | localize }}</button>
          </div>
        </section>
      </div>
    }
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StabilityPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  protected readonly state = inject(AppStateService);

  protected readonly snapshot = signal<StabilitySnapshot | null>(null);
  protected readonly confirming = signal(false);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly form = this.fb.group({ staleMinutes: [30] });

  constructor() {
    void this.load();
  }

  async load() {
    await this.capture(async () => {
      this.snapshot.set(await this.api.stability());
    });
  }

  async reconcile() {
    if (!this.state.isAdmin()) return;
    await this.capture(async () => {
      const value = Math.min(Math.max(Math.trunc(this.form.getRawValue().staleMinutes), 1), 1440);
      await this.api.reconcile(value);
      this.notice.set(this.i18n._('stability.reconciled'));
      this.confirming.set(false);
      await this.load();
    });
  }

  private async capture(work: () => Promise<void>) {
    this.error.set('');
    this.notice.set('');
    try {
      await work();
    } catch (error) {
      this.error.set(messageFromError(error));
    }
  }
}
