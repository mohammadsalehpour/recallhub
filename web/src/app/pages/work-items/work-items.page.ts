import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import { JsonRecord, WorkItem, compactRecord } from '../../core/models';

type WorkAction = 'research' | 'spec' | 'approval' | 'implementationPlan' | 'executionSimulation' | 'memoryCommit';

const allowedStatusByAction: Record<WorkAction, string[]> = {
  research: ['needs_research', 'research_ready'],
  spec: ['research_ready', 'spec_review'],
  approval: ['needs_human_approval'],
  implementationPlan: ['approved_for_implementation', 'implementation_planning'],
  executionSimulation: ['implementation_planning'],
  memoryCommit: ['done_pending_memory_commit'],
};

@Component({
  selector: 'app-work-items-page',
  imports: [CommonModule, ReactiveFormsModule, JsonPipe],
  template: `
    <section class="page-title">
      <span class="eyebrow">P30 Work Items</span>
      <h1>Development Cycle</h1>
      <p>Actionها فقط بر اساس status واقعی backend فعال می‌شوند و transition نهایی در UI انجام نمی‌شود.</p>
    </section>

    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <div class="grid gap-5 xl:grid-cols-[0.86fr_1.14fr]">
      <section class="glass-panel p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-xl font-black">Create Work Item</h2>
          <button class="btn icon-button" type="button" title="Refresh" (click)="load()">↻</button>
        </div>
        <form class="grid gap-3" [formGroup]="createForm" (ngSubmit)="createWorkItem()">
          <div class="field"><label for="title">Title</label><input id="title" formControlName="title" /></div>
          <div class="field"><label for="request">Original Request</label><textarea id="request" formControlName="original_request"></textarea></div>
          <div class="form-grid">
            <div class="field"><label for="requestType">Request Type</label><select id="requestType" formControlName="request_type"><option value="feature">feature</option><option value="bugfix">bugfix</option><option value="research">research</option><option value="refactor">refactor</option><option value="ops">ops</option><option value="documentation">documentation</option></select></div>
            <div class="field"><label for="riskLevel">Risk</label><select id="riskLevel" formControlName="risk_level"><option value="low">low</option><option value="medium">medium</option><option value="high">high</option><option value="critical">critical</option></select></div>
            <div class="field"><label for="priority">Priority</label><select id="priority" formControlName="priority"><option value="low">low</option><option value="normal">normal</option><option value="high">high</option><option value="urgent">urgent</option></select></div>
          </div>
          <button class="btn primary w-fit" type="submit">Create</button>
        </form>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Work Items</h2>
        <div class="overflow-auto">
          <table class="data-table">
            <thead><tr><th>Title</th><th>Status</th><th>Risk</th><th>Priority</th><th></th></tr></thead>
            <tbody>
              @for (item of workItems(); track item.id) {
                <tr>
                  <td>{{ item.title }}</td>
                  <td><span class="pill" [class.warn]="item.status.includes('needs')" [class.good]="item.status === 'completed'">{{ item.status }}</span></td>
                  <td>{{ item.riskLevel || item.risk_level }}</td>
                  <td>{{ item.priority }}</td>
                  <td><button class="btn icon-button" type="button" title="Select work item" (click)="selectWorkItem(item)">✓</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <section class="glass-panel mt-5 p-5">
      <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-xl font-black">Pipeline Actions</h2>
        <span class="pill">{{ selectedStatus() || 'not selected' }}</span>
      </div>
      <div class="button-row">
        <button class="btn" type="button" [disabled]="!can('research')" [title]="tooltip('research')" (click)="startAction('research/start', 'wi-research')">Start Research</button>
        <button class="btn" type="button" [disabled]="!can('spec')" [title]="tooltip('spec')" (click)="startAction('spec/start', 'wi-spec')">Start Spec</button>
        <button class="btn" type="button" [disabled]="!can('implementationPlan')" [title]="tooltip('implementationPlan')" (click)="startAction('create-implementation-plan', 'wi-implementation-plan')">Implementation Plan</button>
        <button class="btn" type="button" [disabled]="!can('executionSimulation')" [title]="tooltip('executionSimulation')" (click)="startAction('simulate-execution', 'wi-execution-simulate')">Simulate Execution</button>
      </div>
    </section>

    <div class="mt-5 grid gap-5 xl:grid-cols-2">
      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Human Approval</h2>
        <form class="grid gap-3" [formGroup]="approvalForm" (ngSubmit)="submitApproval()">
          <div class="field"><label for="decision">Decision</label><select id="decision" formControlName="decision"><option value="approve">approve</option><option value="approve_with_waiver">approve_with_waiver</option><option value="reject">reject</option></select></div>
          <div class="field"><label for="reason">Reason</label><textarea id="reason" formControlName="reason"></textarea></div>
          <button class="btn primary w-fit" type="submit" [disabled]="!can('approval')" [title]="tooltip('approval')">Submit Approval</button>
        </form>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Memory Commit</h2>
        <form class="grid gap-3" [formGroup]="commitForm" (ngSubmit)="submitMemoryCommit()">
          <div class="field"><label for="commitTitle">Title</label><input id="commitTitle" formControlName="title" /></div>
          <div class="field"><label for="whatChanged">What Changed</label><textarea id="whatChanged" formControlName="what_changed"></textarea></div>
          <div class="field"><label for="whyChanged">Why Changed</label><textarea id="whyChanged" formControlName="why_changed"></textarea></div>
          <div class="field"><label for="howChanged">How Changed</label><textarea id="howChanged" formControlName="how_changed"></textarea></div>
          <div class="field"><label for="validationSummary">Validation Summary</label><input id="validationSummary" formControlName="validation_summary" /></div>
          <button class="btn primary w-fit" type="submit" [disabled]="!can('memoryCommit')" [title]="tooltip('memoryCommit')">Complete Memory Commit</button>
        </form>
      </section>
    </div>

    <section class="soft-panel mt-5 p-5">
      <h2 class="mb-3 text-lg font-black">Context Packet</h2>
      <pre class="pressed-panel max-h-[34rem] overflow-auto p-4 text-xs">{{ contextPacket() | json }}</pre>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkItemsPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  protected readonly state = inject(AppStateService);

  protected readonly workItems = signal<WorkItem[]>([]);
  protected readonly contextPacket = signal<JsonRecord>({});
  protected readonly notice = signal('');
  protected readonly error = signal('');
  protected readonly selectedStatus = computed(() => this.state.activeWorkItemStatus());

  protected readonly createForm = this.fb.group({
    title: ['', Validators.required],
    original_request: ['', Validators.required],
    request_type: ['feature', Validators.required],
    risk_level: ['medium'],
    priority: ['normal'],
  });
  protected readonly approvalForm = this.fb.group({
    decision: ['approve', Validators.required],
    reason: [''],
  });
  protected readonly commitForm = this.fb.group({
    title: ['', Validators.required],
    what_changed: ['', Validators.required],
    why_changed: ['', Validators.required],
    how_changed: ['', Validators.required],
    validation_summary: ['unknown'],
  });

  constructor() {
    void this.load();
  }

  async load() {
    const code = this.state.activeProjectCode();
    if (!code) {
      this.error.set('ابتدا پروژه فعال را انتخاب کنید.');
      return;
    }
    await this.capture(async () => {
      this.workItems.set(await this.api.workItems(code));
      if (this.state.activeWorkItemId()) await this.loadContext();
    });
  }

  async createWorkItem() {
    const code = this.state.activeProjectCode();
    if (!code || this.createForm.invalid) {
      this.error.set('پروژه فعال و title/original request/request type اجباری هستند.');
      return;
    }
    await this.capture(async () => {
      const item = await this.api.createWorkItem(
        code,
        compactRecord({
          ...this.createForm.getRawValue(),
          open_questions: [],
          requested_by: this.state.activeUserId() || undefined,
          metadata: { ui_source: 'angular', active_project_code: code },
        }),
      );
      this.selectWorkItem(item);
      this.notice.set('Work Item ثبت شد.');
      await this.load();
    });
  }

  selectWorkItem(item: WorkItem) {
    this.state.selectWorkItem(item.id, item.status);
    void this.loadContext();
  }

  can(action: WorkAction) {
    return allowedStatusByAction[action].includes(this.selectedStatus());
  }

  tooltip(action: WorkAction) {
    if (this.can(action)) return '';
    return `وضعیت فعلی ${this.selectedStatus() || 'unknown'} است. این action فقط در ${allowedStatusByAction[action].join(', ')} مجاز است.`;
  }

  async startAction(endpoint: string, prefix: string) {
    const id = this.requireWorkItem();
    if (!id) return;
    await this.capture(async () => {
      const result = await this.api.startWorkItemAction(
        id,
        endpoint,
        compactRecord({
          idempotencyKey: this.state.idempotencyKey(prefix),
          triggeredBy: this.state.activeUserId() || undefined,
          input: {
            uiSource: 'angular',
            activeProjectCode: this.state.activeProjectCode(),
            activeWorkItemId: id,
          },
        }),
      );
      const runId = this.extractRunId(result);
      if (runId) this.state.selectRun(runId);
      this.notice.set(runId ? `Workflow شروع شد: ${runId}` : 'Workflow action ثبت شد.');
      await this.load();
    });
  }

  async submitApproval() {
    const id = this.requireWorkItem();
    if (!id) return;
    await this.capture(async () => {
      const updated = await this.api.humanApproval(
        id,
        compactRecord({
          ...this.approvalForm.getRawValue(),
          actor_id: this.state.activeUserId() || undefined,
        }),
      );
      if (updated.status) this.state.selectWorkItem(id, updated.status);
      this.notice.set('Human approval ثبت شد.');
      await this.load();
    });
  }

  async submitMemoryCommit() {
    const id = this.requireWorkItem();
    if (!id || this.commitForm.invalid) return;
    await this.capture(async () => {
      const value = this.commitForm.getRawValue();
      await this.api.memoryCommit(
        id,
        compactRecord({
          title: value.title,
          what_changed: value.what_changed,
          why_changed: value.why_changed,
          how_changed: value.how_changed,
          validation_result: { summary: value.validation_summary, status: 'unknown' },
          files_touched: [],
          modules_touched: [],
          commands_run: [],
          risks_remaining: [],
          created_by: this.state.activeUserId() || undefined,
        }),
      );
      this.notice.set('Memory commit ثبت شد.');
      await this.load();
    });
  }

  private async loadContext() {
    const id = this.state.activeWorkItemId();
    if (!id) return;
    this.contextPacket.set(await this.api.contextPacket(id));
  }

  private requireWorkItem() {
    const id = this.state.activeWorkItemId();
    if (!id) this.error.set('ابتدا Work Item را انتخاب کنید.');
    return id;
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

  private extractRunId(value: JsonRecord) {
    const workflowRun = value['workflowRun'];
    if (typeof workflowRun === 'object' && workflowRun !== null && !Array.isArray(workflowRun) && 'id' in workflowRun) {
      const id = (workflowRun as { id?: unknown }).id;
      return typeof id === 'string' ? id : '';
    }
    return '';
  }
}
