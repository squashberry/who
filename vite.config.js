import { defineConfig } from 'vite';
import { cpSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const copyLegacyOperationalSurfaces = () => ({
  name: 'copy-who-operational-surfaces',
  closeBundle() {
    const out = resolve(process.cwd(), 'dist');
    mkdirSync(out, { recursive: true });

    for (const dir of ['admin', 'device-login']) {
      const source = resolve(process.cwd(), dir);
      const destination = resolve(out, dir);
      if (existsSync(source)) {
        cpSync(source, destination, { recursive: true });
      }
    }

    for (const file of [
      'feedback.html',
      'data',
      'how-to-use-pc-relay.html'
    ]) {
      const source = resolve(process.cwd(), file);
      const destination = resolve(out, file);
      if (existsSync(source)) {
        cpSync(source, destination, { recursive: true });
      }
    }
  }
});

export default defineConfig({
  base: '/who/',
  plugins: [copyLegacyOperationalSurfaces()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssCodeSplit: true,
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: resolve(process.cwd(), 'index.html'),
        download: resolve(process.cwd(), 'download.html'),
        privacy: resolve(process.cwd(), 'privacy.html'),
        terms: resolve(process.cwd(), 'terms.html'),
        support: resolve(process.cwd(), 'support.html'),
        notFound: resolve(process.cwd(), '404.html')
      }
    }
  }
});
