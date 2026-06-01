import { build, context } from 'esbuild';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const pkgSrc = (name) => path.resolve(dir, '../../packages', name, 'src/index.ts');

// Workspace packages are bundled in (resolved by path, not declared as deps) so
// the deployed package.json carries no `workspace:*` specifiers that the cloud
// `npm install` cannot understand. Real npm deps stay external and are installed
// in the Cloud Functions build.
const options = {
  entryPoints: [path.resolve(dir, 'src/index.ts')],
  outfile: path.resolve(dir, 'dist/index.js'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  sourcemap: true,
  external: ['firebase-admin', 'firebase-admin/*', 'firebase-functions', 'firebase-functions/*', 'sharp'],
  alias: {
    '@fazole/common': pkgSrc('common'),
    '@fazole/config': pkgSrc('config'),
  },
  logLevel: 'info',
};

if (process.argv.includes('--watch')) {
  const ctx = await context(options);
  await ctx.watch();
} else {
  await build(options);
}
