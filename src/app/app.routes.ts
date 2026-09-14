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

export const routes: Routes = [
  ...publicRoutes,
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
    path: 'dashboard/featured',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/featured-manager/featured-manager.component').then(m => m.FeaturedManagerComponent),
  },
  {
    path: 'dashboard/post/:id',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/post-editor/post-editor.component').then(m => m.PostEditorComponent),
  },
  {
    path: 'dashboard/project',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/dashboard-project-list/dashboard-project-list.component').then(m => m.DashboardProjectListComponent),
  },
  {
    path: 'dashboard/project/new',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/dashboard/pages/project-editor/project-editor.component').then(m => m.ProjectEditorComponent),
  },
	{
		path: 'dashboard/project/:id',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./features/dashboard/pages/project-editor/project-editor.component').then(m => m.ProjectEditorComponent),
	},
	{
		path: 'dashboard/tag',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./features/dashboard/pages/dashboard-tag-list/dashboard-tag-list.component').then(m => m.DashboardTagListComponent),
	},
	{
		path: 'dashboard/tag/new',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./features/dashboard/pages/tag-editor/tag-editor.component').then(m => m.TagEditorComponent),
	},
	{
		path: 'dashboard/tag/:id',
		canActivate: [authGuard],
		loadComponent: () =>
			import('./features/dashboard/pages/tag-editor/tag-editor.component').then(m => m.TagEditorComponent),
	},
	...publicRoutes.map(route => ({
		...route,
		path: route.path ? `:lang/${route.path}` : ':lang',
	})),
];
