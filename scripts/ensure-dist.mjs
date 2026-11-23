// `wrangler dev` refuses to start when the assets directory is missing.
// In dev the SPA is served by Vite, so an empty placeholder is enough.
import { mkdirSync, existsSync, writeFileSync } from 'node:fs';

const dir = 'dist/client';
if (!existsSync(dir)) {
  mkdirSync(dir, { recursive: true });
  writeFileSync(`${dir}/index.html`, '<!doctype html><p>Run <code>npm run build</code> or use the Vite dev server on :5173.</p>');
}
