// zip.js's "native" build uses the platform CompressionStream (no WebAssembly, no inline
// workers), which keeps us inside the page's Content Security Policy. Its API is identical
// to the package's main entry point, so reuse those types.
declare module '@zip.js/zip.js/lib/zip-native.js' {
  export * from '@zip.js/zip.js';
}
