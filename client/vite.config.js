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
    target: 'es2020',

    // Raise limit to suppress warnings for intentionally large vendor chunks
    // (pdf-lib, pdfjs-dist are inherently large — acceptable for on-demand tools).
    chunkSizeWarningLimit: 600,

    rollupOptions: {
      output: {
        manualChunks(id) {
          // ── Core framework ─────────────────────────────────────────────
          if (id.includes('react-dom') || id.includes('react-router')) return 'vendor-react'

          // ── SEO / head management ──────────────────────────────────────
          // react-helmet-async is eagerly loaded (providers.jsx root).
          // Isolating it lets the browser cache it independently of app code.
          if (id.includes('react-helmet-async') || id.includes('react-side-effect'))
            return 'vendor-helmet'

          // ── HTTP client ────────────────────────────────────────────────
          // axios is pulled into the main bundle via AdminShell → api.service.
          // Moving it here removes ~17 kB (gzip) from the critical-path index chunk.
          if (id.includes('/node_modules/axios/')) return 'vendor-axios'

          // ── Form handling & validation ─────────────────────────────────
          // react-hook-form + zod are used by ResumeBuilder and ContentWriter
          // (both lazy). Isolating them avoids duplicating this code in each
          // tool chunk and lets the browser cache it after the first form tool.
          if (
            id.includes('react-hook-form') ||
            id.includes('@hookform/resolvers') ||
            id.includes('/node_modules/zod/')
          ) return 'vendor-forms'

          // ── Charting ───────────────────────────────────────────────────
          if (id.includes('recharts') || id.includes('d3-') || id.includes('/d3/'))
            return 'vendor-charts'

          // ── canvg — SVG→Canvas renderer used by jspdf (150kB) ─────────────
          if (id.includes('canvg') || id.includes('rgbcolor') || id.includes('stackblur'))
            return 'vendor-canvg'

          // ── PDF libraries — each is large enough to warrant isolation ──
          if (id.includes('pdfjs-dist'))  return 'vendor-pdfjs'
          if (id.includes('pdf-lib'))     return 'vendor-pdf-lib'
          if (id.includes('jspdf'))       return 'vendor-jspdf'

          // ── Document processing ────────────────────────────────────────
          // mammoth (~370kB) is only used by WordToPDF — keep it isolated
          if (id.includes('mammoth'))     return 'vendor-mammoth'

          // html2canvas (~200kB) used by PDF tools and invoice
          if (id.includes('html2canvas')) return 'vendor-html2canvas'

          // ── Spreadsheets ───────────────────────────────────────────────
          if (id.includes('xlsx'))        return 'vendor-xlsx'

          // ── Archive ────────────────────────────────────────────────────
          if (id.includes('jszip'))       return 'vendor-jszip'

          // ── Image compression — ~150kB, only used by ImageCompressor ──
          // Isolated so the vendor hash doesn't change when the tool component changes
          if (id.includes('browser-image-compression')) return 'vendor-imgcompress'

          // ── QR code generation — only used by QRCodeGenerator ─────────
          if (id.includes('/node_modules/qrcode/')) return 'vendor-qrcode'

          // ── Icon library — tree-shaken but isolated for caching ────────
          if (id.includes('lucide-react')) return 'vendor-icons'
        },
      },
    },
  },
});
