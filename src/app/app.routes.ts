import { Route, Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { langGuard } from './core/i18n/lang.guard';

const publicRoutes: Route[] = [
  {
    path: '',
    canActivate: [langGuard],
    loadComponent: () =>
      import('./features/home/pages/home-page/home-page.component').then(m => m.HomePageComponent),
  },
  {
    path: 'post',
    canActivate: [langGuard],
    loadComponent: () =>
      import('./features/posts/pages/post-list/post-list.component').then(m => m.PostListComponent),
  },
  {
    path: 'post/:slug',
    canActivate: [langGuard],
    loadComponent: () =>
      import('./features/posts/pages/post-detail/post-detail.component').then(m => m.PostDetailComponent),
  },
  {
    path: 'project',
    canActivate: [langGuard],
    loadComponent: () =>
      import('./features/projects/pages/project-list/project-list.component').then(m => m.ProjectListComponent),
  },
  {
    path: 'project/:slug',
    canActivate: [langGuard],
    loadComponent: () =>
      import('./features/projects/pages/project-detail/project-detail.component').then(m => m.ProjectDetailComponent),
  },
];

const langPrefixedRoutes: Route[] = publicRoutes.map(({ canActivate, ...route }) => route);

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/layout/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: [
      ...publicRoutes,
      {
        path: 'login',
        loadComponent: () =>
          import('./features/auth/pages/login/login.component').then(m => m.LoginComponent),
      },
    ],
  },
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/layout/dashboard-layout.component').then(m => m.DashboardLayoutComponent),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-index/dashboard-index.component').then(m => m.DashboardIndexComponent),
      },
      {
        path: 'post',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-post-list/dashboard-post-list.component').then(m => m.DashboardPostListComponent),
      },
      {
        path: 'post/new',
        loadComponent: () =>
          import('./features/dashboard/pages/post-editor/post-editor.component').then(m => m.PostEditorComponent),
      },
      {
        path: 'post/:id',
        loadComponent: () =>
          import('./features/dashboard/pages/post-editor/post-editor.component').then(m => m.PostEditorComponent),
      },
      {
        path: 'featured',
        loadComponent: () =>
          import('./features/dashboard/pages/featured-manager/featured-manager.component').then(m => m.FeaturedManagerComponent),
      },
      {
        path: 'project',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-project-list/dashboard-project-list.component').then(m => m.DashboardProjectListComponent),
      },
      {
        path: 'project/new',
        loadComponent: () =>
          import('./features/dashboard/pages/project-editor/project-editor.component').then(m => m.ProjectEditorComponent),
      },
      {
        path: 'project/:id',
        loadComponent: () =>
          import('./features/dashboard/pages/project-editor/project-editor.component').then(m => m.ProjectEditorComponent),
      },
      {
        path: 'tag',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-tag-list/dashboard-tag-list.component').then(m => m.DashboardTagListComponent),
      },
      {
        path: 'tag/new',
        loadComponent: () =>
          import('./features/dashboard/pages/tag-editor/tag-editor.component').then(m => m.TagEditorComponent),
      },
      {
        path: 'tag/:id',
        loadComponent: () =>
          import('./features/dashboard/pages/tag-editor/tag-editor.component').then(m => m.TagEditorComponent),
      },
      {
        path: 'subscribers',
        loadComponent: () =>
          import('./features/dashboard/pages/dashboard-subscriber-list/dashboard-subscriber-list.component').then(m => m.DashboardSubscriberListComponent),
      },
    ],
  },
  {
    path: ':lang',
    canActivate: [langGuard],
    loadComponent: () =>
      import('./features/layout/public-layout/public-layout.component').then(m => m.PublicLayoutComponent),
    children: langPrefixedRoutes,
  },
];
