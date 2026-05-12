import { Routes } from '@angular/router';
import { adminGuard, authGuard } from './core/auth.guard';

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
    path: 'register',
    loadComponent: () =>
      import('./pages/register/register.page').then((module) => module.RegisterPage),
  },
  {
    path: 'forgot-password',
    loadComponent: () =>
      import('./pages/forgot-password/forgot-password.page').then(
        (module) => module.ForgotPasswordPage,
      ),
  },
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/profile/profile.page').then((module) => module.ProfilePage),
  },
  {
    path: 'project-setup',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/project-setup/project-setup.page').then(
        (module) => module.ProjectSetupPage,
      ),
  },
  {
    path: 'project-memory',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/project-memory/project-memory.page').then(
        (module) => module.ProjectMemoryPage,
      ),
  },
  {
    path: 'work-items',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/work-items/work-items.page').then(
        (module) => module.WorkItemsPage,
      ),
  },
  {
    path: 'workflow-runs',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/workflow-runs/workflow-runs.page').then(
        (module) => module.WorkflowRunsPage,
      ),
  },
  {
    path: 'stability',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/stability/stability.page').then(
        (module) => module.StabilityPage,
      ),
  },
  {
    path: 'audit',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./pages/audit/audit.page').then((module) => module.AuditPage),
  },
  {
    path: 'admin/users',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin-users/admin-users.page').then(
        (module) => module.AdminUsersPage,
      ),
  },
  {
    path: 'admin/roles',
    canActivate: [authGuard, adminGuard],
    loadComponent: () =>
      import('./pages/admin-roles/admin-roles.page').then(
        (module) => module.AdminRolesPage,
      ),
  },
];
