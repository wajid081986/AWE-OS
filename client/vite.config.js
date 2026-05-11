import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/',
  plugins: [react()],

  server: {
    port: 3000,
    proxy: { '/api': 'http://localhost:5000' },
  },

  build: {
    // Target modern browsers — enables smaller output + better tree-shaking.
    // All supported browsers (Chromium 88+, Safari 14+, Firefox 78+) handle ES2020.
    target: 'es2020',

    // Raise limit to suppress warnings for intentionally large vendor chunks
    // (pdf-lib, pdfjs-dist are inherently large — acceptable for on-demand tools).
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Core framework ─────────────────────────────────────────────
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'

          // ── Charting ───────────────────────────────────────────────────
          if (id.includes('recharts')) return 'vendor-charts'

          // ── PDF libraries — each is large enough to warrant isolation ──
          if (id.includes('pdfjs-dist')) return 'vendor-pdfjs'
          if (id.includes('pdf-lib'))    return 'vendor-pdf-lib'
          if (id.includes('jspdf'))      return 'vendor-jspdf'

          // ── Document processing ────────────────────────────────────────
          // mammoth (~370kB) is only used by WordToPDF — keep it isolated
          if (id.includes('mammoth'))    return 'vendor-mammoth'

          // html2canvas (~200kB) used by PDF tools and invoice
          if (id.includes('html2canvas')) return 'vendor-html2canvas'

          // ── Spreadsheets ───────────────────────────────────────────────
          if (id.includes('xlsx'))       return 'vendor-xlsx'

          // ── Archive ────────────────────────────────────────────────────
          if (id.includes('jszip'))      return 'vendor-jszip'
        },
      },
    },
  },
});
