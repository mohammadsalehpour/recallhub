import {
  ApplicationConfig,
  importProvidersFrom,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import {
  Activity,
  ClipboardList,
  Database,
  FolderOpen,
  ListTodo,
  LogIn,
  LucideAngularModule,
  ShieldCheck,
  Users,
  Workflow,
} from 'lucide-angular';

import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(
      LucideAngularModule.pick({
        Activity,
        ClipboardList,
        Database,
        FolderOpen,
        ListTodo,
        LogIn,
        ShieldCheck,
        Users,
        Workflow,
      }),
    ),
  ]
};
