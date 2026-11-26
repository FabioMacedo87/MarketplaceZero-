import { mkdir } from 'node:fs/promises';
import { build } from 'esbuild';

await mkdir('.server', { recursive: true });

await build({
  entryPoints: ['server.ts'],
  outfile: '.server/server.mjs',
  bundle: true,
  packages: 'external',
  platform: 'node',
  format: 'esm',
  target: 'node22',
  sourcemap: false,
  legalComments: 'none',
});

console.log('Compiled PublicaFix Express handler for Vercel Functions.');
