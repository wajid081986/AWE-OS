/**
 * PdfEditorComingSoon — temporary placeholder for /tools/pdf-editor while
 * v1 (DOM-driven annotations, new-tab editing) is retired and v2 (React
 * state-driven annotations, single-page) is rebuilt. See
 * docs/batches/batch-34-plan.md and docs/batches/batch-35-plan.md.
 */

import { Link } from 'react-router-dom'
import ToolPageShell from '../ToolPageShell'

export default function PdfEditorComingSoon() {
  return (
    <ToolPageShell
      slug="pdf-editor"
      name="PDF Editor"
      icon="✏️"
      description="Edit PDFs online free — add text, draw, highlight, sign, and annotate PDF files instantly in your browser."
    >
      <div className="bg-card border border-line rounded-m p-8 text-center">
        <h2 className="text-xl font-semibold text-ink mb-2">PDF Editor is getting a rebuild</h2>
        <p className="text-ink-soft leading-relaxed">
          We're rebuilding this tool from the ground up for a smoother, more reliable editing
          experience. Check back soon — in the meantime, try{' '}
          <Link to="/tools/watermark-pdf" className="text-cobalt hover:underline">Watermark PDF</Link> or{' '}
          <Link to="/tools/merge-pdf" className="text-cobalt hover:underline">Merge PDF</Link>.
        </p>
      </div>
    </ToolPageShell>
  )
}
