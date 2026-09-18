import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import { join } from 'node:path';
import { environment } from './environments/environment';
import { buildSitemap, SitemapItem } from './server/sitemap';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

const SITEMAP_TTL_MS = 60 * 60 * 1000;
const SITEMAP_PAGE_SIZE = 50;

interface SitemapCache {
  xml: string;
  fetchedAt: number;
}

let sitemapCache: SitemapCache | null = null;

interface SearchPageResponse {
  content: Array<{ slug: string; updatedAt: string }>;
  totalPages: number;
}

async function fetchSearchEntries(path: string): Promise<SitemapItem[]> {
  const items: SitemapItem[] = [];
  let totalPages = 1;
  let page = 0;

  while (page < totalPages) {
    const response = await fetch(`${environment.apiBaseUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: {},
        page,
        size: SITEMAP_PAGE_SIZE,
        sort: 'createdAt',
        direction: 'DESC',
      }),
    });

    if (!response.ok) {
      throw new Error(`Search request failed with status ${response.status}`);
    }

    const data = (await response.json()) as SearchPageResponse;
    items.push(
      ...(data.content ?? []).map((item) => ({
        slug: item.slug,
        updatedAt: item.updatedAt,
      })),
    );
    totalPages = data.totalPages ?? 1;
    page += 1;
  }

  return items;
}

async function generateSitemap(): Promise<string> {
  try {
    const [posts, projects] = await Promise.all([
      fetchSearchEntries('/v1/post/search'),
      fetchSearchEntries('/v1/project/search'),
    ]);

    return buildSitemap({ siteUrl: environment.siteUrl, posts, projects });
  } catch {
    return buildSitemap({ siteUrl: environment.siteUrl, posts: [], projects: [] });
  }
}

app.get('/sitemap.xml', async (_req, res) => {
  const now = Date.now();

  if (!sitemapCache || now - sitemapCache.fetchedAt > SITEMAP_TTL_MS) {
    sitemapCache = {
      xml: await generateSitemap(),
      fetchedAt: now,
    };
  }

  res.type('application/xml').send(sitemapCache.xml);
});

/**
 * Example Express Rest API endpoints can be defined here.
 * Uncomment and define endpoints as necessary.
 *
 * Example:
 * ```ts
 * app.get('/api/{*splat}', (req, res) => {
 *    * });
 * ```
 */

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) =>
      response ? writeResponseToNodeResponse(response, res) : next(),
    )
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
