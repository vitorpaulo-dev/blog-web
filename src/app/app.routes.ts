import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./features/home/pages/home-page/home-page.component').then(m => m.HomePageComponent),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/pages/login/login.component').then(m => m.LoginComponent),
  },
  {
    path: 'signup',
    loadComponent: () =>
      import('./features/auth/pages/signup/signup.component').then(m => m.SignupComponent),
  },
  {
    path: 'post',
    loadComponent: () =>
      import('./features/posts/pages/post-list/post-list.component').then(m => m.PostListComponent),
  },
  {
    path: 'post/:slug',
    loadComponent: () =>
      import('./features/posts/pages/post-detail/post-detail.component').then(m => m.PostDetailComponent),
  },
  {
    path: 'dashboard/post',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard-post-list/dashboard-post-list.component').then(m => m.DashboardPostListComponent),
  },
  {
    path: 'dashboard/post/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/post-editor/post-editor.component').then(m => m.PostEditorComponent),
  },
  {
    path: 'dashboard/post/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/post-editor/post-editor.component').then(m => m.PostEditorComponent),
  },
];
