import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
  protected readonly pages = [
    { label: 'Login', path: '/login', icon: '01' },
    { label: 'Project Setup', path: '/project-setup', icon: '02' },
    { label: 'Project Memory', path: '/project-memory', icon: '03' },
    { label: 'Work Items', path: '/work-items', icon: '04' },
    { label: 'Workflow Runs', path: '/workflow-runs', icon: '05' },
    { label: 'Stability', path: '/stability', icon: '06', adminOnly: true },
    { label: 'Audit', path: '/audit', icon: '07' },
  ];
  protected readonly visiblePages = computed(() =>
    this.pages.filter((page) => !page.adminOnly || this.state.isAdmin()),
  );
}
