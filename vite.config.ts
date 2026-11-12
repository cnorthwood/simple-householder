import { defineConfig, type Plugin } from 'vite';
import preact from '@preact/preset-vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

/**
 * Content Security Policy injected into built pages.
 *
 * The important line is `connect-src 'none'`: the browser itself refuses any
 * fetch/XHR/WebSocket/beacon, so voter data cannot leave the machine even if a
 * bug or a compromised dependency tried. Images, fonts and forms are likewise
 * locked to the page itself. Applied at build time only, because the Vite dev
 * server needs a WebSocket for hot reload.
 *
 * The single-file build inlines its JS and CSS, so it needs 'unsafe-inline'
 * for those; the network restrictions are identical.
 */
function contentSecurityPolicy(single: boolean): Plugin {
  const inline = single ? " 'unsafe-inline'" : '';
  const policy = [
    "default-src 'none'",
    `script-src 'self'${inline}`,
    `style-src 'self'${inline}`,
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    "connect-src 'none'",
    "form-action 'none'",
    "base-uri 'none'",
    "object-src 'none'",
  ].join('; ');
  return {
    name: 'simple-householder-csp',
    apply: 'build',
    transformIndexHtml: () => [
      {
        tag: 'meta',
        attrs: { 'http-equiv': 'Content-Security-Policy', content: policy },
        injectTo: 'head-prepend',
      },
    ],
  };
}

// `--mode single` produces dist-single/index.html: one self-contained file
// campaigners can download and open from disk, fully offline.
export default defineConfig(({ mode }) => {
  const single = mode === 'single';
  return {
    // Relative base so the build works on GitHub Pages (project subpath) and from file://
    base: './',
    plugins: [preact(), contentSecurityPolicy(single), ...(single ? [viteSingleFile()] : [])],
    build: {
      outDir: single ? 'dist-single' : 'dist',
    },
    test: {
      include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    },
  };
});
