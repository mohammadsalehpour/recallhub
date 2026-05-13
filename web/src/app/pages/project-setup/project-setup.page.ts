import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import { I18nService } from '../../core/i18n.service';
import {
  ConfigFile,
  Project,
  ProjectPath,
  Repository,
  TechStackItem,
  TechnologyCatalogItem,
  compactRecord,
  projectCodeOf,
  technologyLatestVersionOf,
  technologyNameOf,
} from '../../core/models';
import { LocalizePipe } from '../../shared/localize.pipe';

@Component({
  selector: 'app-project-setup-page',
  imports: [CommonModule, ReactiveFormsModule, LocalizePipe],
  template: `
    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <div class="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section class="glass-panel p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-xl font-black">{{ 'setup.createProject' | localize }}</h2>
          <button class="btn icon-button" type="button" [attr.title]="'common.refresh' | localize" (click)="refresh()">↻</button>
        </div>

        <form class="grid gap-4" [formGroup]="projectForm" (ngSubmit)="createProject()">
          <div class="form-grid">
            <div class="field">
              <label for="projectCode">{{ 'common.code' | localize }}</label>
              <input id="projectCode" formControlName="project_code" />
            </div>
            <div class="field">
              <label for="projectName">{{ 'common.name' | localize }}</label>
              <input id="projectName" formControlName="name" />
            </div>
            <div class="field md:col-span-2">
              <label for="projectDescription">{{ 'common.description' | localize }}</label>
              <textarea id="projectDescription" formControlName="description"></textarea>
            </div>
            <div class="field">
              <label for="businessDomain">{{ 'setup.businessDomain' | localize }}</label>
              <input id="businessDomain" formControlName="business_domain" placeholder="ERP, CRM, internal-tool" />
            </div>
            <div class="field">
              <label for="frameworkName">{{ 'setup.frameworkName' | localize }}</label>
              <input
                id="frameworkName"
                formControlName="framework_name"
                list="frameworkCatalog"
                placeholder="odoo, nestjs, django"
                (change)="selectPrimaryFramework($any($event.target).value)"
              />
              <datalist id="frameworkCatalog">
                @for (technology of frameworkOptions(); track technology.id) {
                  <option [value]="technologyNameOf(technology)">{{ technology.kind }} · {{ technology.ecosystem }}</option>
                }
              </datalist>
            </div>
            <div class="field">
              <label for="frameworkVersion">{{ 'setup.frameworkVersion' | localize }}</label>
              <input id="frameworkVersion" formControlName="framework_version" list="frameworkVersionCatalog" />
              <datalist id="frameworkVersionCatalog">
                @for (version of frameworkVersionOptions(); track version) {
                  <option [value]="version"></option>
                }
              </datalist>
            </div>
          </div>

          <div class="soft-panel p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h3 class="font-black">{{ 'setup.techStack' | localize }}</h3>
              <button class="btn icon-button" type="button" [attr.title]="'setup.addTechItem' | localize" (click)="addTech()">+</button>
            </div>
            <div class="grid gap-3">
              @for (item of techStack(); track $index) {
                <div class="grid gap-2 md:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto]">
                  <input class="mini-input" [attr.aria-label]="'common.category' | localize" [value]="item.category" list="technologyKindCatalog" (input)="updateTech($index, 'category', $any($event.target).value)" [attr.placeholder]="'common.category' | localize" />
                  <input class="mini-input" [attr.aria-label]="'common.name' | localize" [value]="item.name" list="technologyNameCatalog" (input)="updateTech($index, 'name', $any($event.target).value)" (change)="selectTechStackItem($index, $any($event.target).value)" [attr.placeholder]="'common.name' | localize" />
                  <input class="mini-input" [attr.aria-label]="'common.version' | localize" [value]="item.version ?? ''" [attr.list]="'technologyVersionCatalog-' + $index" (input)="updateTech($index, 'version', $any($event.target).value)" [attr.placeholder]="'common.version' | localize" />
                  <datalist [id]="'technologyVersionCatalog-' + $index">
                    @for (version of techVersionOptions(item); track version) {
                      <option [value]="version"></option>
                    }
                  </datalist>
                  <select class="mini-input" [attr.aria-label]="'common.source' | localize" [value]="item.source" (change)="updateTech($index, 'source', $any($event.target).value)">
                    <option value="declared">{{ 'enum.declared' | localize }}</option>
                    <option value="detected">{{ 'enum.detected' | localize }}</option>
                    <option value="imported">{{ 'enum.imported' | localize }}</option>
                  </select>
                  <button class="btn danger icon-button" type="button" [attr.title]="'common.remove' | localize" (click)="removeTech($index)">×</button>
                </div>
              }
            </div>
            <datalist id="technologyKindCatalog">
              @for (kind of technologyKinds(); track kind) {
                <option [value]="kind"></option>
              }
            </datalist>
            <datalist id="technologyNameCatalog">
              @for (technology of catalog(); track technology.id) {
                <option [value]="technologyNameOf(technology)">{{ technology.kind }} · {{ technology.ecosystem }}</option>
              }
            </datalist>
          </div>

          <button class="btn primary w-fit" type="submit">{{ 'setup.createProject' | localize }}</button>
        </form>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">{{ 'setup.projects' | localize }}</h2>
        <div class="overflow-auto">
          <table class="data-table">
            <thead>
              <tr><th>{{ 'common.code' | localize }}</th><th>{{ 'common.name' | localize }}</th><th>{{ 'common.status' | localize }}</th><th></th></tr>
            </thead>
            <tbody>
              @for (project of projects(); track project.id) {
                <tr>
                  <td>{{ projectCodeOf(project) }}</td>
                  <td>{{ project.name }}</td>
                  <td><span class="pill">{{ project.status }}</span></td>
                  <td><button class="btn icon-button" type="button" [attr.title]="'common.select' | localize" (click)="selectProject(project)">✓</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div class="mt-5 grid gap-5 xl:grid-cols-3">
      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">{{ 'setup.repository' | localize }}</h2>
        <form class="grid gap-3" [formGroup]="repoForm" (ngSubmit)="createRepository()">
          <div class="field"><label for="repoName">{{ 'setup.repoName' | localize }}</label><input id="repoName" formControlName="repo_name" /></div>
          <div class="field">
            <label for="locatorType">{{ 'setup.locatorType' | localize }}</label>
            <select id="locatorType" formControlName="locator_type">
              <option value="local_path">local_path</option>
              <option value="git_url">git_url</option>
              <option value="docker_volume">docker_volume</option>
              <option value="network_share">network_share</option>
            </select>
          </div>
          <div class="field"><label for="repoRoot">{{ 'setup.repoRoot' | localize }}</label><input id="repoRoot" formControlName="repo_root" /></div>
          <div class="field"><label for="defaultBranch">{{ 'setup.defaultBranch' | localize }}</label><input id="defaultBranch" formControlName="default_branch" /></div>
          <div class="button-row">
            <button class="btn primary" type="submit">{{ 'common.add' | localize }}</button>
            <button class="btn" type="button" (click)="validateRepository()">{{ 'common.validate' | localize }}</button>
            <button class="btn" type="button" (click)="sync()">{{ 'common.sync' | localize }}</button>
          </div>
        </form>
        <ul class="mt-4 grid gap-2">
          @for (repo of repositories(); track repo.id) {
            <li class="pressed-panel flex items-center justify-between gap-3 p-3">
              <button class="text-left font-bold" type="button" (click)="selectRepository(repo)">{{ repo.repoName || repo.repo_name }}</button>
              <span class="pill" [class.good]="repo.status === 'valid'" [class.bad]="repo.status === 'invalid'">{{ repo.status }}</span>
            </li>
          }
        </ul>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">{{ 'setup.paths' | localize }}</h2>
        <form class="grid gap-3" [formGroup]="pathForm" (ngSubmit)="createPath()">
          <div class="field"><label for="path">{{ 'setup.path' | localize }}</label><input id="path" formControlName="path" /></div>
          <div class="field"><label for="pathType">{{ 'setup.pathType' | localize }}</label><input id="pathType" formControlName="path_type" placeholder="custom_addons, docs, ignore" /></div>
          <div class="field"><label for="scanPolicy">{{ 'setup.scanPolicy' | localize }}</label><select id="scanPolicy" formControlName="scan_policy"><option value="include">{{ 'enum.include' | localize }}</option><option value="metadata_only">{{ 'enum.metadataOnly' | localize }}</option><option value="exclude">{{ 'enum.exclude' | localize }}</option></select></div>
          <div class="field"><label for="ownership">{{ 'setup.ownership' | localize }}</label><input id="ownership" formControlName="ownership" placeholder="team_owned, vendor, generated" /></div>
          <button class="btn primary w-fit" type="submit">{{ 'setup.addPath' | localize }}</button>
        </form>
        <div class="mt-4 flex flex-wrap gap-2">
          @for (path of paths(); track path.id) {
            <span class="pill">{{ path.path }} · {{ path.pathType || path.path_type }}</span>
          }
        </div>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">{{ 'setup.configFiles' | localize }}</h2>
        <form class="grid gap-3" [formGroup]="configForm" (ngSubmit)="createConfigFile()">
          <div class="field"><label for="relativePath">{{ 'setup.relativePath' | localize }}</label><input id="relativePath" formControlName="relative_path" /></div>
          <div class="field"><label for="configType">{{ 'setup.configType' | localize }}</label><input id="configType" formControlName="config_type" /></div>
          <div class="field"><label for="containsSecrets">{{ 'setup.containsSecrets' | localize }}</label><select id="containsSecrets" formControlName="contains_secrets"><option value="unknown">{{ 'enum.unknown' | localize }}</option><option value="true">{{ 'enum.true' | localize }}</option><option value="false">{{ 'enum.false' | localize }}</option></select></div>
          <div class="field"><label for="configScanPolicy">{{ 'setup.scanPolicy' | localize }}</label><select id="configScanPolicy" formControlName="scan_policy"><option value="metadata_only">{{ 'enum.metadataOnly' | localize }}</option><option value="parse_safe">{{ 'enum.parseSafe' | localize }}</option><option value="exclude">{{ 'enum.exclude' | localize }}</option></select></div>
          <button class="btn primary w-fit" type="submit">{{ 'setup.addConfig' | localize }}</button>
        </form>
        <div class="mt-4 flex flex-wrap gap-2">
          @for (file of configFiles(); track file.id) {
            <span class="pill" [class.warn]="(file.containsSecrets || file.contains_secrets) === 'unknown'">{{ file.relativePath || file.relative_path }}</span>
          }
        </div>
      </section>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProjectSetupPage {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  protected readonly state = inject(AppStateService);
  protected readonly projectCodeOf = projectCodeOf;

  protected readonly projects = signal<Project[]>([]);
  protected readonly repositories = signal<Repository[]>([]);
  protected readonly paths = signal<ProjectPath[]>([]);
  protected readonly configFiles = signal<ConfigFile[]>([]);
  protected readonly catalog = signal<TechnologyCatalogItem[]>([]);
  protected readonly frameworkVersionOptions = signal<string[]>([]);
  protected readonly techStack = signal<TechStackItem[]>([
    { category: 'framework', name: '', version: '', source: 'declared' },
  ]);
  protected readonly frameworkOptions = computed(() =>
    this.catalog().filter((technology) => ['framework', 'library'].includes(technology.kind)),
  );
  protected readonly technologyKinds = computed(() =>
    Array.from(new Set(this.catalog().map((technology) => technology.kind))).sort(),
  );
  protected readonly technologyNameOf = technologyNameOf;
  protected readonly notice = signal('');
  protected readonly error = signal('');

  protected readonly projectForm = this.fb.group({
    project_code: ['', Validators.required],
    name: ['', Validators.required],
    description: ['', Validators.required],
    business_domain: [''],
    framework_name: ['', Validators.required],
    framework_version: ['', Validators.required],
  });
  protected readonly repoForm = this.fb.group({
    repo_name: ['', Validators.required],
    locator_type: ['local_path', Validators.required],
    repo_root: ['', Validators.required],
    default_branch: [''],
  });
  protected readonly pathForm = this.fb.group({
    path: ['', Validators.required],
    path_type: ['', Validators.required],
    scan_policy: ['include', Validators.required],
    ownership: ['', Validators.required],
  });
  protected readonly configForm = this.fb.group({
    relative_path: ['', Validators.required],
    config_type: ['', Validators.required],
    contains_secrets: ['unknown', Validators.required],
    scan_policy: ['metadata_only', Validators.required],
  });

  constructor() {
    void this.refresh();
    void this.loadCatalog();
  }

  async refresh() {
    await this.capture(async () => {
      this.projects.set(await this.api.projects());
      if (this.state.activeProjectCode()) await this.refreshProjectDetails();
    });
  }

  addTech() {
    this.techStack.update((rows) => [...rows, { category: '', name: '', source: 'declared' }]);
  }

  removeTech(index: number) {
    this.techStack.update((rows) => rows.filter((_, i) => i !== index));
  }

  updateTech(index: number, key: keyof TechStackItem, value: string) {
    this.techStack.update((rows) =>
      rows.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
    );
  }

  selectPrimaryFramework(value: string) {
    const technology = this.findTechnology(value, ['framework', 'library']);
    if (!technology) {
      this.frameworkVersionOptions.set([]);
      return;
    }

    const name = technologyNameOf(technology);
    const latest = technologyLatestVersionOf(technology);
    this.projectForm.patchValue({
      framework_name: name,
      framework_version: this.projectForm.controls.framework_version.value || latest,
    });
    this.frameworkVersionOptions.set((technology.versions ?? []).map((version) => version.version));
    this.ensureTechStackItem(technology, this.projectForm.controls.framework_version.value || latest);
  }

  selectTechStackItem(index: number, value: string) {
    const technology = this.findTechnology(value);
    if (!technology) {
      this.updateTech(index, 'technology_id', '');
      return;
    }

    this.techStack.update((rows) =>
      rows.map((row, i) =>
        i === index
          ? {
              ...row,
              technology_id: technology.id,
              category: technology.kind,
              name: technologyNameOf(technology),
              version: row.version || technologyLatestVersionOf(technology),
            }
          : row,
      ),
    );
  }

  techVersionOptions(item: TechStackItem) {
    const technologyId = item.technology_id ?? item.technologyId;
    const technology = technologyId
      ? this.catalog().find((entry) => entry.id === technologyId)
      : this.findTechnology(item.name);
    return (technology?.versions ?? []).map((version) => version.version);
  }

  async createProject() {
    if (this.projectForm.invalid || this.normalizedTechStack().length === 0) {
      this.projectForm.markAllAsTouched();
      this.error.set(this.i18n._('setup.projectProfileRequired'));
      return;
    }

    await this.capture(async () => {
      const value = this.projectForm.getRawValue();
      const project = await this.api.createProject(
        compactRecord({
          project_code: value.project_code.trim().toUpperCase(),
          name: value.name,
          description: value.description,
          business_domain: value.business_domain,
          primary_framework: {
            name: value.framework_name,
            version: value.framework_version,
          },
          tech_stack: this.normalizedTechStack(),
        }),
      );
      this.state.selectProject(projectCodeOf(project), project.id);
      this.notice.set(this.i18n._('setup.projectCreated'));
      await this.refresh();
    });
  }

  async selectProject(project: Project) {
    this.state.selectProject(projectCodeOf(project), project.id);
    await this.refreshProjectDetails();
  }

  async createRepository() {
    const code = this.requireProjectCode();
    if (!code || this.repoForm.invalid) return;
    await this.capture(async () => {
      const repo = await this.api.createRepository(
        code,
        compactRecord({ ...this.repoForm.getRawValue(), is_primary: true }),
      );
      this.state.selectRepository(repo.id);
      this.notice.set(this.i18n._('setup.repositoryCreated'));
      await this.refreshProjectDetails();
    });
  }

  selectRepository(repository: Repository) {
    this.state.selectRepository(repository.id);
  }

  async validateRepository() {
    const code = this.requireProjectCode();
    const repoId = this.state.activeRepositoryId();
    if (!code || !repoId) {
      this.error.set(this.i18n._('setup.selectProjectAndRepository'));
      return;
    }
    await this.capture(async () => {
      await this.api.validateRepository(code, repoId);
      this.notice.set(this.i18n._('setup.repositoryValidated'));
      await this.refreshProjectDetails();
    });
  }

  async sync() {
    const code = this.requireProjectCode();
    if (!code) return;
    await this.capture(async () => {
      const result = await this.api.syncProject(code, this.state.idempotencyKey('project-sync'));
      const runId = this.extractRunId(result);
      if (runId) this.state.selectRun(runId);
      this.notice.set(
        runId ? this.i18n.format('setup.syncStarted', { id: runId }) : this.i18n._('setup.syncExecuted'),
      );
    });
  }

  async createPath() {
    const code = this.requireProjectCode();
    const repository_id = this.state.activeRepositoryId();
    if (!code || !repository_id || this.pathForm.invalid) {
      this.error.set(this.i18n._('setup.pathRequired'));
      return;
    }
    await this.capture(async () => {
      await this.api.createPath(code, { repository_id, ...this.pathForm.getRawValue() });
      this.notice.set(this.i18n._('setup.pathCreated'));
      await this.refreshProjectDetails();
    });
  }

  async createConfigFile() {
    const code = this.requireProjectCode();
    const repository_id = this.state.activeRepositoryId();
    if (!code || !repository_id || this.configForm.invalid) {
      this.error.set(this.i18n._('setup.configRequired'));
      return;
    }
    await this.capture(async () => {
      await this.api.createConfigFile(code, { repository_id, required: false, ...this.configForm.getRawValue() });
      this.notice.set(this.i18n._('setup.configCreated'));
      await this.refreshProjectDetails();
    });
  }

  private normalizedTechStack() {
    return this.techStack()
      .filter((row) => row.category.trim() && row.name.trim() && row.source)
      .map((row) => compactRecord({
        category: row.category.trim(),
        technology_id: row.technology_id?.trim(),
        name: row.name.trim(),
        version: row.version?.trim(),
        source: row.source,
        notes: row.notes?.trim(),
      }));
  }

  private async refreshProjectDetails() {
    const code = this.state.activeProjectCode();
    if (!code) return;
    const [repositories, paths, configFiles] = await Promise.all([
      this.api.repositories(code),
      this.api.paths(code),
      this.api.configFiles(code),
      this.api.techStack(code),
    ]);
    this.repositories.set(repositories);
    this.paths.set(paths);
    this.configFiles.set(configFiles);
    if (!this.state.activeRepositoryId() && repositories[0]) {
      this.state.selectRepository(repositories[0].id);
    }
  }

  private async loadCatalog() {
    try {
      this.catalog.set(await this.api.technologyCatalog({ limit: 100 }));
    } catch {
      this.catalog.set([]);
    }
  }

  private findTechnology(value: string, kinds?: string[]) {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    return this.catalog().find((technology) => {
      if (kinds && !kinds.includes(technology.kind)) return false;
      const names = [
        technology.slug,
        technologyNameOf(technology),
        ...(technology.aliases ?? []).map((alias) => alias.alias),
      ].map((item) => item.toLowerCase());
      return names.includes(normalized);
    });
  }

  private ensureTechStackItem(technology: TechnologyCatalogItem, version: string) {
    const name = technologyNameOf(technology);
    this.techStack.update((rows) => {
      const exists = rows.some(
        (row) => row.technology_id === technology.id || row.name.toLowerCase() === name.toLowerCase(),
      );
      if (exists) {
        return rows.map((row) =>
          row.technology_id === technology.id || row.name.toLowerCase() === name.toLowerCase()
            ? { ...row, technology_id: technology.id, category: technology.kind, name, version }
            : row,
        );
      }
      return [
        ...rows,
        {
          technology_id: technology.id,
          category: technology.kind,
          name,
          version,
          source: 'declared',
        },
      ];
    });
  }

  private requireProjectCode() {
    const code = this.state.activeProjectCode();
    if (!code) this.error.set(this.i18n._('setup.selectProjectFirst'));
    return code;
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

  private extractRunId(value: unknown): string {
    if (typeof value !== 'object' || value === null) return '';
    const data = value as { workflowRun?: { id?: string }; id?: string };
    return data.workflowRun?.id ?? data.id ?? '';
  }
}
