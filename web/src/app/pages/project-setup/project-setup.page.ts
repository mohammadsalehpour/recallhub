import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ApiService, messageFromError } from '../../core/api.service';
import { AppStateService } from '../../core/app-state.service';
import {
  ConfigFile,
  Project,
  ProjectPath,
  Repository,
  TechStackItem,
  compactRecord,
  projectCodeOf,
} from '../../core/models';

@Component({
  selector: 'app-project-setup-page',
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <section class="page-title">
      <span class="eyebrow">P10 Project Setup Wizard</span>
      <h1>Project Setup</h1>
      <p>Profile پروژه، repository، pathها و config fileها باید صریح وارد شوند. UI مقدار domain را حدس نمی‌زند.</p>
    </section>

    @if (notice()) {
      <p class="alert success mb-4">{{ notice() }}</p>
    }
    @if (error()) {
      <p class="alert error mb-4">{{ error() }}</p>
    }

    <div class="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
      <section class="glass-panel p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-xl font-black">Create Project</h2>
          <button class="btn icon-button" type="button" title="Refresh" (click)="refresh()">↻</button>
        </div>

        <form class="grid gap-4" [formGroup]="projectForm" (ngSubmit)="createProject()">
          <div class="form-grid">
            <div class="field">
              <label for="projectCode">Project Code</label>
              <input id="projectCode" formControlName="project_code" />
            </div>
            <div class="field">
              <label for="projectName">Name</label>
              <input id="projectName" formControlName="name" />
            </div>
            <div class="field md:col-span-2">
              <label for="projectDescription">Description</label>
              <textarea id="projectDescription" formControlName="description"></textarea>
            </div>
            <div class="field">
              <label for="businessDomain">Business Domain</label>
              <input id="businessDomain" formControlName="business_domain" placeholder="ERP, CRM, internal-tool" />
            </div>
            <div class="field">
              <label for="frameworkName">Framework Name</label>
              <input id="frameworkName" formControlName="framework_name" placeholder="odoo, nestjs, django" />
            </div>
            <div class="field">
              <label for="frameworkVersion">Framework Version</label>
              <input id="frameworkVersion" formControlName="framework_version" />
            </div>
          </div>

          <div class="soft-panel p-4">
            <div class="mb-3 flex items-center justify-between gap-3">
              <h3 class="font-black">Tech Stack</h3>
              <button class="btn icon-button" type="button" title="Add tech item" (click)="addTech()">+</button>
            </div>
            <div class="grid gap-3">
              @for (item of techStack(); track $index) {
                <div class="grid gap-2 md:grid-cols-[1fr_1fr_0.8fr_0.8fr_auto]">
                  <input class="mini-input" aria-label="category" [value]="item.category" (input)="updateTech($index, 'category', $any($event.target).value)" placeholder="category" />
                  <input class="mini-input" aria-label="name" [value]="item.name" (input)="updateTech($index, 'name', $any($event.target).value)" placeholder="name" />
                  <input class="mini-input" aria-label="version" [value]="item.version ?? ''" (input)="updateTech($index, 'version', $any($event.target).value)" placeholder="version" />
                  <select class="mini-input" aria-label="source" [value]="item.source" (change)="updateTech($index, 'source', $any($event.target).value)">
                    <option value="declared">declared</option>
                    <option value="detected">detected</option>
                    <option value="imported">imported</option>
                  </select>
                  <button class="btn danger icon-button" type="button" title="Remove" (click)="removeTech($index)">×</button>
                </div>
              }
            </div>
          </div>

          <button class="btn primary w-fit" type="submit">Create Project</button>
        </form>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Projects</h2>
        <div class="overflow-auto">
          <table class="data-table">
            <thead>
              <tr><th>Code</th><th>Name</th><th>Status</th><th></th></tr>
            </thead>
            <tbody>
              @for (project of projects(); track project.id) {
                <tr>
                  <td>{{ projectCodeOf(project) }}</td>
                  <td>{{ project.name }}</td>
                  <td><span class="pill">{{ project.status }}</span></td>
                  <td><button class="btn icon-button" type="button" title="Select project" (click)="selectProject(project)">✓</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    </div>

    <div class="mt-5 grid gap-5 xl:grid-cols-3">
      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Repository</h2>
        <form class="grid gap-3" [formGroup]="repoForm" (ngSubmit)="createRepository()">
          <div class="field"><label for="repoName">Repo Name</label><input id="repoName" formControlName="repo_name" /></div>
          <div class="field">
            <label for="locatorType">Locator Type</label>
            <select id="locatorType" formControlName="locator_type">
              <option value="local_path">local_path</option>
              <option value="git_url">git_url</option>
              <option value="docker_volume">docker_volume</option>
              <option value="network_share">network_share</option>
            </select>
          </div>
          <div class="field"><label for="repoRoot">Repo Root</label><input id="repoRoot" formControlName="repo_root" /></div>
          <div class="field"><label for="defaultBranch">Default Branch</label><input id="defaultBranch" formControlName="default_branch" /></div>
          <div class="button-row">
            <button class="btn primary" type="submit">Add</button>
            <button class="btn" type="button" (click)="validateRepository()">Validate</button>
            <button class="btn" type="button" (click)="sync()">Sync</button>
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
        <h2 class="mb-4 text-xl font-black">Paths</h2>
        <form class="grid gap-3" [formGroup]="pathForm" (ngSubmit)="createPath()">
          <div class="field"><label for="path">Path</label><input id="path" formControlName="path" /></div>
          <div class="field"><label for="pathType">Path Type</label><input id="pathType" formControlName="path_type" placeholder="custom_addons, docs, ignore" /></div>
          <div class="field"><label for="scanPolicy">Scan Policy</label><select id="scanPolicy" formControlName="scan_policy"><option value="include">include</option><option value="metadata_only">metadata_only</option><option value="exclude">exclude</option></select></div>
          <div class="field"><label for="ownership">Ownership</label><input id="ownership" formControlName="ownership" placeholder="team_owned, vendor, generated" /></div>
          <button class="btn primary w-fit" type="submit">Add Path</button>
        </form>
        <div class="mt-4 flex flex-wrap gap-2">
          @for (path of paths(); track path.id) {
            <span class="pill">{{ path.path }} · {{ path.pathType || path.path_type }}</span>
          }
        </div>
      </section>

      <section class="glass-panel p-5">
        <h2 class="mb-4 text-xl font-black">Config Files</h2>
        <form class="grid gap-3" [formGroup]="configForm" (ngSubmit)="createConfigFile()">
          <div class="field"><label for="relativePath">Relative Path</label><input id="relativePath" formControlName="relative_path" /></div>
          <div class="field"><label for="configType">Config Type</label><input id="configType" formControlName="config_type" /></div>
          <div class="field"><label for="containsSecrets">Contains Secrets</label><select id="containsSecrets" formControlName="contains_secrets"><option value="unknown">unknown</option><option value="true">true</option><option value="false">false</option></select></div>
          <div class="field"><label for="configScanPolicy">Scan Policy</label><select id="configScanPolicy" formControlName="scan_policy"><option value="metadata_only">metadata_only</option><option value="parse_safe">parse_safe</option><option value="exclude">exclude</option></select></div>
          <button class="btn primary w-fit" type="submit">Add Config</button>
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
  protected readonly state = inject(AppStateService);
  protected readonly projectCodeOf = projectCodeOf;

  protected readonly projects = signal<Project[]>([]);
  protected readonly repositories = signal<Repository[]>([]);
  protected readonly paths = signal<ProjectPath[]>([]);
  protected readonly configFiles = signal<ConfigFile[]>([]);
  protected readonly techStack = signal<TechStackItem[]>([
    { category: 'framework', name: '', version: '', source: 'declared' },
  ]);
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

  async createProject() {
    if (this.projectForm.invalid || this.normalizedTechStack().length === 0) {
      this.projectForm.markAllAsTouched();
      this.error.set('Project profile و حداقل یک declared tech stack item اجباری هستند.');
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
      this.notice.set('پروژه ثبت شد.');
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
      this.notice.set('Repository ثبت شد.');
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
      this.error.set('ابتدا پروژه و repository را انتخاب کنید.');
      return;
    }
    await this.capture(async () => {
      await this.api.validateRepository(code, repoId);
      this.notice.set('Repository توسط backend validate شد.');
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
      this.notice.set(runId ? `Sync شروع شد: ${runId}` : 'Sync اجرا شد.');
    });
  }

  async createPath() {
    const code = this.requireProjectCode();
    const repository_id = this.state.activeRepositoryId();
    if (!code || !repository_id || this.pathForm.invalid) {
      this.error.set('پروژه، repository و فیلدهای path اجباری هستند.');
      return;
    }
    await this.capture(async () => {
      await this.api.createPath(code, { repository_id, ...this.pathForm.getRawValue() });
      this.notice.set('Path ثبت شد.');
      await this.refreshProjectDetails();
    });
  }

  async createConfigFile() {
    const code = this.requireProjectCode();
    const repository_id = this.state.activeRepositoryId();
    if (!code || !repository_id || this.configForm.invalid) {
      this.error.set('پروژه، repository و فیلدهای config اجباری هستند.');
      return;
    }
    await this.capture(async () => {
      await this.api.createConfigFile(code, { repository_id, required: false, ...this.configForm.getRawValue() });
      this.notice.set('Config file ثبت شد.');
      await this.refreshProjectDetails();
    });
  }

  private normalizedTechStack() {
    return this.techStack()
      .filter((row) => row.category.trim() && row.name.trim() && row.source)
      .map((row) => compactRecord({
        category: row.category.trim(),
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

  private requireProjectCode() {
    const code = this.state.activeProjectCode();
    if (!code) this.error.set('ابتدا پروژه فعال را انتخاب کنید.');
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
