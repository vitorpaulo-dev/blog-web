import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  {
    path: '',
    renderMode: RenderMode.Server
  },
  {
    path: 'post',
    renderMode: RenderMode.Server
  },
  {
    path: 'post/:slug',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/post',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/post/new',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/post/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'project',
    renderMode: RenderMode.Server
  },
  {
    path: 'project/:slug',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/project',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/project/new',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/project/:id',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/tag',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/tag/new',
    renderMode: RenderMode.Server
  },
  {
    path: 'dashboard/tag/:id',
    renderMode: RenderMode.Server
  },
  {
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
