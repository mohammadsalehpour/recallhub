import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import { AuditLog, WorkflowEvent, WorkflowRun } from '../../core/models';
import { LocalizePipe } from '../../shared/localize.pipe';

type TimelineRow = {
  source: string;
  timestamp: string;
  type: string;
  summary: string;
  resourceId: string;
};

@Component({
  selector: 'app-audit-page',
  imports: [CommonModule, JsonPipe, LocalizePipe],
  template: `
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <section class="glass-panel p-5">
      <div class="mb-4 flex items-center justify-between gap-3">
        <h2 class="text-xl font-black">{{ 'audit.timeline' | localize }}</h2>
        <button class="btn icon-button" type="button" [attr.title]="'common.refresh' | localize" (click)="load()">↻</button>
      </div>
      <div class="overflow-auto">
        <table class="data-table">
          <thead><tr><th>{{ 'common.source' | localize }}</th><th>{{ 'common.time' | localize }}</th><th>{{ 'common.type' | localize }}</th><th>{{ 'common.summary' | localize }}</th><th>{{ 'common.resource' | localize }}</th></tr></thead>
          <tbody>
            @for (row of timeline(); track row.source + row.resourceId + row.timestamp) {
              <tr>
                <td><span class="pill">{{ row.source }}</span></td>
                <td>{{ row.timestamp }}</td>
                <td>{{ row.type }}</td>
                <td>{{ row.summary }}</td>
                <td>{{ row.resourceId }}</td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="soft-panel mt-5 p-5">
      <h2 class="mb-4 text-xl font-black">{{ 'audit.selectedWorkflowEvents' | localize }}</h2>
      <pre class="pressed-panel max-h-96 overflow-auto p-4 text-xs">{{ selectedRunEvents() | json }}</pre>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuditPage {
  private readonly api = inject(ApiService);
  protected readonly state = inject(AppStateService);

  protected readonly auditLogs = signal<AuditLog[]>([]);
  protected readonly workflowRuns = signal<WorkflowRun[]>([]);
  protected readonly selectedRunEvents = signal<WorkflowEvent[]>([]);
  protected readonly error = signal('');
  protected readonly timeline = computed<TimelineRow[]>(() => {
    const logs = this.auditLogs().map((event) => ({
      source: 'audit',
      timestamp: event.createdAt ?? '',
      type: event.action,
      summary: `${event.outcome ?? 'success'} ${event.resourceType ?? ''}`,
      resourceId: event.resourceId ?? event.id,
    }));
    const runs = this.workflowRuns().map((run) => ({
      source: 'workflow_run',
      timestamp: run.createdAt ?? '',
      type: run.workflowDefinition?.code ?? run.workflow_definition?.code ?? run.status,
      summary: `Run ${run.status}`,
      resourceId: run.id,
    }));
    return [...logs, ...runs].sort((left, right) => right.timestamp.localeCompare(left.timestamp));
  });

  constructor() {
    void this.load();
  }

  async load() {
    this.error.set('');
    try {
      const [auditLogs, workflowRuns] = await Promise.all([
        this.api.auditLogs(this.state.activeProjectId() || undefined),
        this.api.workflowRuns(),
      ]);
      this.auditLogs.set(auditLogs);
      this.workflowRuns.set(workflowRuns);
      if (this.state.activeRunId()) {
        this.selectedRunEvents.set(await this.api.workflowEvents(this.state.activeRunId()));
      }
    } catch (error) {
      this.error.set(messageFromError(error));
    }
  }
}
