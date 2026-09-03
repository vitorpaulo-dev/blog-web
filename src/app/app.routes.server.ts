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
    path: '**',
    renderMode: RenderMode.Prerender
  }
];
