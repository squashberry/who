import { defineConfig } from 'vite';
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const coreEntries = new Set([
  'index.html',
  'download.html',
  'privacy.html',
  'terms.html',
  'support.html',
  '404.html'
]);

const copyWhoSurfaces = () => ({
  name: 'copy-who-static-surfaces',
  closeBundle() {
    const root = process.cwd();
    const out = resolve(root, 'dist');
    mkdirSync(out, { recursive: true });

    for (const dir of ['admin', 'device-login', 'data']) {
      const source = resolve(root, dir);
      const destination = resolve(out, dir);
      if (existsSync(source)) cpSync(source, destination, { recursive: true });
    }

    for (const file of ['site-pages.css', 'analytics.js']) {
      const source = resolve(root, file);
      const destination = resolve(out, file);
      if (existsSync(source)) cpSync(source, destination);
    }

    for (const file of readdirSync(root)) {
      if (!file.endsWith('.html') || coreEntries.has(file)) continue;
      const source = resolve(root, file);
      const destination = resolve(out, file);
      if (existsSync(source)) cpSync(source, destination);
    }
  }
});

export default defineConfig({
  base: '/who/',
  plugins: [copyWhoSurfaces()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(rootPath(), 'index.html'),
        download: resolve(rootPath(), 'download.html'),
        privacy: resolve(rootPath(), 'privacy.html'),
        terms: resolve(rootPath(), 'terms.html'),
        support: resolve(rootPath(), 'support.html'),
        notFound: resolve(rootPath(), '404.html')
      }
    }
  }
});

function rootPath() {
  return process.cwd();
}
