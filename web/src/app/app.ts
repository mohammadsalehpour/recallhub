import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { LucideAngularModule } from 'lucide-angular';
import { filter } from 'rxjs';
import { ApiService } from './core/api.service';
import { AppStateService } from './core/app-state.service';
import { TranslationKey } from './core/i18n.service';
import { Project, projectCodeOf } from './core/models';
import { LanguageSwitcherComponent } from './shared/language-switcher.component';
import { LocalizePipe } from './shared/localize.pipe';

type NavPage = {
  labelKey: TranslationKey;
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
  path: string;
  icon: string;
  publicOnly?: boolean;
  adminOnly?: boolean;
};

type PageHeader = {
  titleKey: TranslationKey;
  subtitleKey: TranslationKey;
};

@Component({
  selector: 'app-root',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    LanguageSwitcherComponent,
    LocalizePipe,
    LucideAngularModule,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {
  protected readonly state = inject(AppStateService);
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  protected readonly userMenuOpen = signal(false);
  protected readonly currentUrl = signal(this.router.url);
  protected readonly projects = signal<Project[]>([]);
  protected readonly projectCodeOf = projectCodeOf;
  protected readonly isAuthRoute = computed(() =>
    ['/login', '/register', '/forgot-password'].some((path) =>
      this.currentUrl().startsWith(path),
    ),
  );
  protected readonly pages: NavPage[] = [
    { labelKey: 'nav.login', titleKey: 'auth.loginTitle', subtitleKey: 'app.subtitle', path: '/login', icon: 'log-in', publicOnly: true },
    { labelKey: 'nav.projectSetup', titleKey: 'setup.title', subtitleKey: 'setup.subtitle', path: '/project-setup', icon: 'folder-open' },
    { labelKey: 'nav.projectMemory', titleKey: 'memory.title', subtitleKey: 'memory.subtitle', path: '/project-memory', icon: 'database' },
    { labelKey: 'nav.workItems', titleKey: 'workItems.title', subtitleKey: 'workItems.subtitle', path: '/work-items', icon: 'list-todo' },
    { labelKey: 'nav.workflowRuns', titleKey: 'runs.title', subtitleKey: 'runs.subtitle', path: '/workflow-runs', icon: 'workflow' },
    { labelKey: 'nav.stability', titleKey: 'stability.title', subtitleKey: 'stability.subtitle', path: '/stability', icon: 'activity', adminOnly: true },
    { labelKey: 'nav.audit', titleKey: 'audit.title', subtitleKey: 'audit.subtitle', path: '/audit', icon: 'clipboard-list' },
    { labelKey: 'nav.users', titleKey: 'users.title', subtitleKey: 'users.subtitle', path: '/admin/users', icon: 'users', adminOnly: true },
    { labelKey: 'nav.roles', titleKey: 'roles.title', subtitleKey: 'roles.subtitle', path: '/admin/roles', icon: 'shield-check', adminOnly: true },
  ];
  private readonly profileHeader: PageHeader = {
    titleKey: 'profile.title',
    subtitleKey: 'profile.subtitle',
  };
  protected readonly pageHeader = computed<PageHeader>(() => {
    const path = this.currentUrl().split('?')[0].split('#')[0];
    if (path.startsWith('/profile')) return this.profileHeader;
    const page = this.pages
      .filter((item) => !item.publicOnly)
      .find((item) => path.startsWith(item.path));
    return page ?? this.pages[1];
  });
  protected readonly activeProjectMissing = computed(() => {
    const activeCode = this.state.activeProjectCode();
    return activeCode.length > 0 && !this.projects().some((project) => projectCodeOf(project) === activeCode);
  });
  protected readonly visiblePages = computed(() =>
    this.pages.filter((page) => {
      if (page.publicOnly) return !this.state.isAuthenticated();
      if (!this.state.isAuthenticated()) return false;
      return !page.adminOnly || this.state.isAdmin();
    }),
  );

  protected readonly userInitials = computed(() => {
    const user = this.state.currentUser();
    return `${user?.first_name?.[0] ?? 'R'}${user?.last_name?.[0] ?? 'H'}`.toUpperCase();
  });

  constructor() {
    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects);
        this.userMenuOpen.set(false);
      });

    if (this.state.isAuthenticated() && !this.state.currentUser()) {
      void this.refreshMe();
    }

    if (this.state.isAuthenticated()) {
      void this.loadProjects();
    }
  }

  protected selectActiveProject(value: string) {
    if (!value) {
      this.state.selectProject('', '');
      return;
    }

    const project = this.projects().find(
      (item) => item.id === value || projectCodeOf(item) === value,
    );
    if (project) {
      this.state.selectProject(projectCodeOf(project), project.id);
      return;
    }

    this.state.selectProject(value, '');
  }

  protected async logout() {
    this.state.logout();
    this.userMenuOpen.set(false);
    await this.router.navigateByUrl('/login');
  }

  private async refreshMe() {
    try {
      this.state.refreshUser(await this.api.me());
      await this.loadProjects();
    } catch {
      this.state.logout();
      await this.router.navigateByUrl('/login');
    }
  }

  private async loadProjects() {
    try {
      const projects = await this.api.projects();
      this.projects.set(projects);
      if (!this.state.activeProjectCode() && projects[0]) {
        this.state.selectProject(projectCodeOf(projects[0]), projects[0].id);
      }
    } catch {
      this.projects.set([]);
    }
  }
}
