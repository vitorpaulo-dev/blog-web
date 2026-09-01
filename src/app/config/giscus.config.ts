/**
 * Giscus configuration.
 * TODO: replace placeholder IDs with real values from giscus.app.
 * Set via environment or update these constants after enabling Giscus for vitorpaulo-dev/blog-workspace.
 * @example environment.ts -> giscus: { repo, repoId, category, categoryId }
 */
export const GISCUS_CONFIG = {
  repo: 'vitorpaulo-dev/blog-workspace',
  repoId: 'R_kgDO-placeholder', // TODO env: GISCUS_REPO_ID
  category: 'General',
  categoryId: 'DIC_kwDO-placeholder', // TODO env: GISCUS_CATEGORY_ID
  mapping: 'pathname',
  theme: 'dark',
  lang: 'en',
} as const;
