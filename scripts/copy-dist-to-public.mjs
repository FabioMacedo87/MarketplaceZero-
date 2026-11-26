import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dist = path.join(root, 'dist');
const publicDir = path.join(root, 'public');

if (!fs.existsSync(path.join(dist, 'index.html'))) {
  throw new Error('Vite build output was not found in dist/.');
}

fs.cpSync(dist, publicDir, { recursive: true, force: true });
console.log('Copied Vite production assets into public/ for Vercel CDN hosting.');
