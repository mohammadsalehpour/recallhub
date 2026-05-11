import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'project-setup',
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.page').then((module) => module.LoginPage),
  },
  {
    path: 'project-setup',
    loadComponent: () =>
      import('./pages/project-setup/project-setup.page').then(
        (module) => module.ProjectSetupPage,
      ),
  },
  {
    path: 'project-memory',
    loadComponent: () =>
      import('./pages/project-memory/project-memory.page').then(
        (module) => module.ProjectMemoryPage,
      ),
  },
  {
    path: 'work-items',
    loadComponent: () =>
      import('./pages/work-items/work-items.page').then(
        (module) => module.WorkItemsPage,
      ),
  },
  {
    path: 'workflow-runs',
    loadComponent: () =>
      import('./pages/workflow-runs/workflow-runs.page').then(
        (module) => module.WorkflowRunsPage,
      ),
  },
  {
    path: 'stability',
    loadComponent: () =>
      import('./pages/stability/stability.page').then(
        (module) => module.StabilityPage,
      ),
  },
  {
    path: 'audit',
    loadComponent: () =>
      import('./pages/audit/audit.page').then((module) => module.AuditPage),
  },
];
