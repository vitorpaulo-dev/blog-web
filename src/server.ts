import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';
import { buildLocaleSitemap, buildSitemapIndex, loadSitemapCache, sharedLastmod } from './server/sitemap';

const browserDistFolder = join(import.meta.dirname, '../browser');

const siteUrl = environment.host;

const app = express();
const angularApp = new AngularNodeAppEngine({
  trustProxyHeaders: true,
});

app.get('/sitemap.xml', async (_req, res) => {
  const cache = await loadSitemapCache();

  res.type('application/xml').send(buildSitemapIndex(siteUrl, sharedLastmod(cache)));
});

app.get('/:locale/sitemap.xml', async (req, res) => {
  const locale = req.params['locale'];
  if (locale !== 'en' && locale !== 'pt') {
    res.status(404).send('Not found');
    return;
  }

  const cache = await loadSitemapCache();

  res
    .type('application/xml')
    .send(buildLocaleSitemap(locale, siteUrl, cache.posts, cache.projects, sharedLastmod(cache)));
});

app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
