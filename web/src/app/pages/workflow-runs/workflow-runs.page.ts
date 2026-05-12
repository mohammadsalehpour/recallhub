import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import { I18nService } from '../../core/i18n.service';
import { WorkflowDefinition, WorkflowEvent, WorkflowRun, compactRecord } from '../../core/models';
import { LocalizePipe } from '../../shared/localize.pipe';

const terminalStatuses = ['succeeded', 'failed', 'cancelled', 'timed_out', 'callback_missing'];
const inFlightStatuses = ['pending', 'queued', 'running', 'retrying'];
const lifecycleWorkflows = [
  'task.analyze',
  'research.run',
  'document.generate_spec',
  'document.review',
  'document.finalize',
  'document.revise',
  'implementation.plan',
  'execution.simulate',
];

@Component({
  selector: 'app-workflow-runs-page',
  imports: [CommonModule, ReactiveFormsModule, JsonPipe, LocalizePipe],
  template: `
    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <section class="glass-panel p-5">
      <form class="form-grid items-end" [formGroup]="manualForm" (ngSubmit)="runManualWorkflow()">
        <div class="field">
          <label for="workflowCode">{{ 'runs.workflow' | localize }}</label>
          <select id="workflowCode" formControlName="code">
            @for (workflow of workflows(); track workflow.id) {
              <option [value]="workflow.code">{{ workflow.code }} · {{ workflow.executor }}</option>
            }
          </select>
        </div>
        <div class="field">
          <label for="workflowInput">{{ 'runs.inputJson' | localize }}</label>
          <input id="workflowInput" formControlName="input" placeholder='{"manual":true}' />
        </div>
        <div class="button-row">
          <button class="btn primary" type="submit">{{ 'runs.run' | localize }}</button>
          <button class="btn icon-button" type="button" [attr.title]="'common.refresh' | localize" (click)="refresh()">↻</button>
        </div>
      </form>
    </section>

    <div class="mt-5 grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">{{ 'runs.runs' | localize }}</h2>
        <div class="overflow-auto">
          <table class="data-table">
            <thead><tr><th>{{ 'runs.workflow' | localize }}</th><th>{{ 'common.status' | localize }}</th><th>{{ 'runs.runId' | localize }}</th><th>{{ 'common.created' | localize }}</th><th></th></tr></thead>
            <tbody>
              @for (run of runs(); track run.id) {
                <tr>
                  <td>{{ workflowCode(run) }}</td>
                  <td><span class="pill" [class.good]="run.status === 'succeeded'" [class.bad]="run.status === 'failed'" [class.warn]="inFlightStatuses.includes(run.status)">{{ run.status }}</span></td>
                  <td>{{ run.id }}</td>
                  <td>{{ run.createdAt }}</td>
                  <td><button class="btn icon-button" type="button" [attr.title]="'common.select' | localize" (click)="selectRun(run)">✓</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">{{ 'runs.selectedRun' | localize }}</h2>
        <p class="pressed-panel mb-4 p-3 font-bold">{{ selectedSummary() }}</p>
        <div class="button-row mb-4">
          <button class="btn" type="button" [disabled]="!canRetry()" (click)="retry()">{{ 'common.retry' | localize }}</button>
          <button class="btn danger" type="button" [disabled]="!canCancel()" (click)="cancel()">{{ 'common.cancel' | localize }}</button>
          <button class="btn" type="button" (click)="pollSelected()">{{ 'common.poll' | localize }}</button>
        </div>
        <pre class="pressed-panel max-h-80 overflow-auto p-4 text-xs">{{ selectedRun() | json }}</pre>
      </section>
    </div>

    <section class="soft-panel mt-5 p-5">
      <h2 class="mb-4 text-xl font-black">{{ 'runs.runEvents' | localize }}</h2>
      <div class="overflow-auto">
        <table class="data-table">
          <thead><tr><th>{{ 'common.type' | localize }}</th><th>{{ 'common.created' | localize }}</th><th>{{ 'common.payload' | localize }}</th></tr></thead>
          <tbody>
            @for (event of events(); track event.id) {
              <tr>
                <td>{{ event.eventType || event.event_type }}</td>
                <td>{{ event.createdAt }}</td>
                <td>{{ event.payloadJson | json }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkflowRunsPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  protected readonly state = inject(AppStateService);
  protected readonly inFlightStatuses = inFlightStatuses;

  protected readonly workflows = signal<WorkflowDefinition[]>([]);
  protected readonly runs = signal<WorkflowRun[]>([]);
  protected readonly selectedRun = signal<WorkflowRun | null>(null);
  protected readonly events = signal<WorkflowEvent[]>([]);
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly selectedSummary = computed(() => {
    const run = this.selectedRun();
    if (!run) return this.i18n._('runs.noRunSelected');
    return `${this.workflowCode(run)} | ${run.status} | ${run.id}`;
  });

  protected readonly manualForm = this.fb.group({
    code: ['project.scan'],
    input: ['{}'],
  });

  constructor() {
    void this.refresh();
  }

  async refresh() {
    await this.capture(async () => {
      const [workflows, runs] = await Promise.all([this.api.workflows(), this.api.workflowRuns()]);
      this.workflows.set(workflows);
      this.runs.set(runs);
      const active = this.state.activeRunId();
      if (active) await this.selectRunById(active);
    });
  }

  async runManualWorkflow() {
    const value = this.manualForm.getRawValue();
    if (lifecycleWorkflows.includes(value.code)) {
      this.error.set(this.i18n._('runs.lifecycleBlocked'));
      return;
    }
    await this.capture(async () => {
      const run = await this.api.runWorkflow(
        value.code,
        compactRecord({
          projectId: this.state.activeProjectId() || undefined,
          workItemId: this.state.activeWorkItemId() || undefined,
          triggeredBy: this.state.activeUserId() || undefined,
          idempotencyKey: this.state.idempotencyKey('workflow-run'),
          input: this.parseInput(value.input),
        }),
      );
      this.state.selectRun(run.id);
      this.notice.set(this.i18n.format('runs.runStarted', { id: run.id }));
      await this.selectRunById(run.id);
      void this.poll(run.id);
    });
  }

  async selectRun(run: WorkflowRun) {
    this.state.selectRun(run.id);
    await this.selectRunById(run.id);
  }

  async selectRunById(runId: string) {
    const [run, events] = await Promise.all([this.api.workflowRun(runId), this.api.workflowEvents(runId)]);
    this.selectedRun.set(run);
    this.events.set(events);
  }

  canRetry() {
    const status = this.selectedRun()?.status;
    return status ? ['failed', 'timed_out', 'callback_missing'].includes(status) : false;
  }

  canCancel() {
    const status = this.selectedRun()?.status;
    return status ? inFlightStatuses.includes(status) : false;
  }

  async retry() {
    const run = this.selectedRun();
    if (!run || !this.canRetry()) return;
    await this.capture(async () => {
      await this.api.retryRun(run.id);
      this.notice.set(this.i18n._('runs.retryCreated'));
      await this.poll(run.id);
    });
  }

  async cancel() {
    const run = this.selectedRun();
    if (!run || !this.canCancel()) return;
    await this.capture(async () => {
      await this.api.cancelRun(run.id);
      this.notice.set(this.i18n._('runs.cancelled'));
      await this.refresh();
    });
  }

  async pollSelected() {
    const run = this.selectedRun();
    if (run) await this.poll(run.id);
  }

  async poll(runId: string) {
    for (let index = 0; index < 24; index += 1) {
      await this.selectRunById(runId);
      const status = this.selectedRun()?.status;
      if (status && terminalStatuses.includes(status)) {
        this.notice.set(this.i18n.format('runs.reachedStatus', { status }));
        await this.refresh();
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, Math.min(2000 + index * 500, 9000)));
    }
    this.notice.set(this.i18n._('runs.pollingTimeout'));
  }

  workflowCode(run: WorkflowRun) {
    return run.workflowDefinition?.code ?? run.workflow_definition?.code ?? 'workflow';
  }

  private parseInput(raw: string) {
    if (!raw.trim()) return {};
    try {
      return JSON.parse(raw) as Record<string, unknown>;
    } catch {
      this.error.set(this.i18n._('runs.invalidJson'));
      return {};
    }
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
