import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { ApiService } from './core/api.service';
import { AppStateService } from './core/app-state.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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
  protected readonly isAuthRoute = computed(() =>
    ['/login', '/register', '/forgot-password'].some((path) =>
      this.currentUrl().startsWith(path),
    ),
  );
  protected readonly pages = [
    { label: 'Login', path: '/login', icon: '01', publicOnly: true },
    { label: 'Project Setup', path: '/project-setup', icon: '02' },
    { label: 'Project Memory', path: '/project-memory', icon: '03' },
    { label: 'Work Items', path: '/work-items', icon: '04' },
    { label: 'Workflow Runs', path: '/workflow-runs', icon: '05' },
    { label: 'Stability', path: '/stability', icon: '06', adminOnly: true },
    { label: 'Audit', path: '/audit', icon: '07' },
    { label: 'Users', path: '/admin/users', icon: '08', adminOnly: true },
    { label: 'Roles', path: '/admin/roles', icon: '09', adminOnly: true },
  ];
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
  }

  protected async logout() {
    this.state.logout();
    this.userMenuOpen.set(false);
    await this.router.navigateByUrl('/login');
  }

  private async refreshMe() {
    try {
      this.state.refreshUser(await this.api.me());
    } catch {
      this.state.logout();
      await this.router.navigateByUrl('/login');
    }
  }
}
