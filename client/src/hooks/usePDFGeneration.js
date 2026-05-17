import { useState, useCallback } from 'react'
import { generateContractPDF, downloadPDF } from '../utils/pdfGenerator'

export function usePDFGeneration() {
  const [status, setStatus] = useState('idle') // idle | generating | done | error
  const [error, setError]   = useState(null)

  const generate = useCallback(async (contractData, formData) => {
    setStatus('generating')
    setError(null)
    try {
      const doc = await generateContractPDF(contractData, formData)
      downloadPDF(doc, contractData.title, formData.contractDate)
      setStatus('done')
      setTimeout(() => setStatus('idle'), 3000)
    } catch (err) {
      console.error('PDF generation error:', err)
      setError('PDF generation failed. Please try again.')
      setStatus('error')
    }
  }, [])

  return { generate, status, error }
}
