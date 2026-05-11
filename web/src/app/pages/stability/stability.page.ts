import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import { StabilitySnapshot } from '../../core/models';

@Component({
  selector: 'app-stability-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-title">
      <span class="eyebrow">P50 Stability Dashboard</span>
      <h1>Stability</h1>
      <p>عملیات reconcile فقط برای نقش‌های admin/owner/ops فعال است و قبل از اجرا confirmation می‌خواهد.</p>
    </section>

    @if (!state.isAdmin()) {
      <p class="alert error mb-4">این صفحه برای نقش فعلی فقط read-only نیست؛ عملیات admin غیرفعال است.</p>
    }
    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <section class="grid gap-5 md:grid-cols-3">
      <div class="glass-panel p-5">
        <span class="eyebrow">Projects</span>
        <strong class="mt-2 block text-4xl">{{ snapshot()?.projects ?? 0 }}</strong>
      </div>
      <div class="glass-panel p-5">
        <span class="eyebrow">Stale Runs</span>
        <strong class="mt-2 block text-4xl">{{ snapshot()?.stale_workflow_runs ?? 0 }}</strong>
      </div>
      <div class="glass-panel p-5">
        <span class="eyebrow">Statuses</span>
        <strong class="mt-2 block text-4xl">{{ snapshot()?.workflow_runs_by_status?.length ?? 0 }}</strong>
      </div>
    </section>

    <div class="mt-5 grid gap-5 xl:grid-cols-[1fr_0.8fr]">
      <section class="glass-panel p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-xl font-black">Workflow Status Breakdown</h2>
          <button class="btn icon-button" type="button" title="Refresh" (click)="load()">↻</button>
        </div>
        <table class="data-table">
          <thead><tr><th>Status</th><th>Count</th></tr></thead>
          <tbody>
            @for (row of snapshot()?.workflow_runs_by_status ?? []; track row.status) {
              <tr><td>{{ row.status }}</td><td>{{ row.count }}</td></tr>
            }
          </tbody>
        </table>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Reconcile</h2>
        <form class="grid gap-3" [formGroup]="form" (ngSubmit)="confirming.set(true)">
          <div class="field">
            <label for="staleMinutes">Stale Minutes</label>
            <input id="staleMinutes" type="number" min="1" max="1440" formControlName="staleMinutes" />
          </div>
          <button class="btn danger w-fit" type="submit" [disabled]="!state.isAdmin()">Reconcile Runs</button>
        </form>
      </section>
    </div>

    @if (confirming()) {
      <div class="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4">
        <section class="glass-panel max-w-md p-6">
          <h2 class="text-xl font-black">Confirm Reconcile</h2>
          <p class="my-4 text-slate-700">Runهای stale به callback_missing منتقل می‌شوند. این action audit می‌شود.</p>
          <div class="button-row">
            <button class="btn danger" type="button" (click)="reconcile()">Confirm</button>
            <button class="btn" type="button" (click)="confirming.set(false)">Cancel</button>
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
      this.notice.set('Reconcile اجرا شد.');
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
