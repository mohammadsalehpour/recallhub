import { CommonModule, JsonPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import { I18nService, TranslationKey } from '../../core/i18n.service';
import { JsonRecord } from '../../core/models';
import { LocalizePipe } from '../../shared/localize.pipe';

type MemoryTab = 'modules' | 'files' | 'chunks' | 'events' | 'commits';

@Component({
  selector: 'app-project-memory-page',
  imports: [CommonModule, FormsModule, JsonPipe, LocalizePipe],
  template: `
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <section class="glass-panel p-5">
      <div class="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div class="tabs" role="tablist" [attr.aria-label]="'memory.tabsLabel' | localize">
          @for (tab of tabs; track tab.key) {
            <button class="tab" [class.active]="activeTab() === tab.key" type="button" (click)="activeTab.set(tab.key)" role="tab">
              {{ tab.labelKey | localize }}
            </button>
          }
        </div>
        <button class="btn icon-button" type="button" [attr.title]="'memory.refresh' | localize" (click)="load()">↻</button>
      </div>

      <div class="overflow-auto">
        <table class="data-table">
          <thead>
            <tr>
              @for (column of columns(); track column) {
                <th>{{ column }}</th>
              }
            </tr>
          </thead>
          <tbody>
            @for (row of activeRows(); track row['id'] || $index) {
              <tr>
                @for (column of columns(); track column) {
                  <td>{{ cell(row, column) }}</td>
                }
              </tr>
            } @empty {
              <tr><td [attr.colspan]="columns().length || 1">{{ 'memory.noRows' | localize }}</td></tr>
            }
          </tbody>
        </table>
      </div>
    </section>

    <section class="soft-panel mt-5 p-5">
      <h2 class="mb-3 text-lg font-black">{{ 'memory.rawSelection' | localize }}</h2>
      <pre class="pressed-panel max-h-96 overflow-auto p-4 text-xs">{{ activeRows()[0] | json }}</pre>
    </section>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectMemoryPage {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  protected readonly state = inject(AppStateService);

  protected readonly tabs: { key: MemoryTab; labelKey: TranslationKey }[] = [
    { key: 'modules', labelKey: 'memory.modules' },
    { key: 'files', labelKey: 'memory.files' },
    { key: 'chunks', labelKey: 'memory.chunks' },
    { key: 'events', labelKey: 'memory.events' },
    { key: 'commits', labelKey: 'memory.commits' },
  ];
  protected readonly activeTab = signal<MemoryTab>('modules');
  protected readonly modules = signal<JsonRecord[]>([]);
  protected readonly files = signal<JsonRecord[]>([]);
  protected readonly chunks = signal<JsonRecord[]>([]);
  protected readonly events = signal<JsonRecord[]>([]);
  protected readonly commits = signal<JsonRecord[]>([]);
  protected readonly error = signal('');

  constructor() {
    void this.load();
  }

  async load() {
    const code = this.state.activeProjectCode();
    if (!code) {
      this.error.set(this.i18n._('memory.selectProjectFirst'));
      return;
    }
    this.error.set('');
    try {
      const [modules, files, chunks, events, commits] = await Promise.all([
        this.api.modules(code),
        this.api.files(code),
        this.api.memoryChunks(code),
        this.api.memoryEvents(code),
        this.api.memoryCommits(code),
      ]);
      this.modules.set(modules);
      this.files.set(files);
      this.chunks.set(chunks);
      this.events.set(events);
      this.commits.set(commits);
    } catch (error) {
      this.error.set(messageFromError(error));
    }
  }

  protected activeRows() {
    return {
      modules: this.modules(),
      files: this.files(),
      chunks: this.chunks(),
      events: this.events(),
      commits: this.commits(),
    }[this.activeTab()];
  }

  protected columns() {
    const rows = this.activeRows();
    const keys = rows.flatMap((row) => Object.keys(row));
    return Array.from(new Set(keys)).slice(0, 8);
  }

  protected cell(row: JsonRecord, column: string) {
    const value = row[column];
    if (value === null || value === undefined) return '';
    if (typeof value === 'object') return JSON.stringify(value).slice(0, 120);
    return String(value);
  }
}
