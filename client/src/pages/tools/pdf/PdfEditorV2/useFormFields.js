import { useCallback, useState } from 'react'
import { PDFDocument, PDFTextField, PDFCheckBox, PDFRadioGroup, PDFDropdown, PDFOptionList, PDFSignature } from 'pdf-lib'
import { RENDER_SCALE } from './constants'

// A widget's own /P entry is the fast path for finding which page it's on.
// Some PDF writers omit it, so this falls back to scanning every page's
// /Annots array and comparing dict identity — pdf-lib's PDFContext caches
// parsed indirect objects, so the same ref always resolves to the same JS
// object instance, making `dict === widget.dict` a reliable comparison.
function resolvePageIndex(pdfLibDoc, widget, pageRefToIndex) {
  const directRef = widget.P()
  if (directRef && pageRefToIndex.has(directRef)) return pageRefToIndex.get(directRef)

  const pages = pdfLibDoc.getPages()
  for (let i = 0; i < pages.length; i++) {
    const annots = pages[i].node.Annots()
    if (!annots) continue
    for (let j = 0; j < annots.size(); j++) {
      const ref = annots.get(j)
      const dict = pdfLibDoc.context.lookup(ref)
      if (dict === widget.dict) return i
    }
  }
  return null
}

/**
 * Detects a PDF's AcroForm fields (via a second, pdf-lib-side load alongside
 * usePdfDoc.js's pdf.js load) and owns their fill-in values, kept separate
 * from useAnnotations.js's state since these are the document's own fields,
 * not user-drawn shapes. FormFieldLayer.jsx renders `fields`/`values`; every
 * change goes through `setValue` so index.jsx's download step can read the
 * latest values when it fills and flattens the form.
 *
 * Out of scope for Phase 1 (see docs/backlog.md): multi-select option lists
 * and signature fields — pdf-lib can't fill a real digital signature anyway.
 */
export function useFormFields() {
  const [fields, setFields] = useState([])
  const [values, setValues] = useState({})

  const detect = useCallback(async (bytes) => {
    try {
      const pdfLibDoc = await PDFDocument.load(bytes.slice())
      const acroFields = pdfLibDoc.getForm().getFields()
      const pages = pdfLibDoc.getPages()
      const pageRefToIndex = new Map(pages.map((p, i) => [p.ref, i]))

      const detected = []
      const initialValues = {}

      for (const field of acroFields) {
        if (field instanceof PDFSignature || field instanceof PDFOptionList) continue

        const type = field instanceof PDFTextField ? 'text'
          : field instanceof PDFCheckBox ? 'checkbox'
          : field instanceof PDFRadioGroup ? 'radio'
          : field instanceof PDFDropdown ? 'dropdown'
          : null
        if (!type) continue

        const name = field.getName()
        const options = type === 'radio' || type === 'dropdown' ? field.getOptions() : undefined

        field.acroField.getWidgets().forEach((widget, widgetIndex) => {
          const pageIndex = resolvePageIndex(pdfLibDoc, widget, pageRefToIndex)
          if (pageIndex == null) return
          const page = pages[pageIndex]
          const { height: pageH } = page.getSize()
          const rect = widget.getRectangle()

          detected.push({
            id: `field_${pageIndex}_${name}_${widgetIndex}`,
            name,
            type,
            page: pageIndex + 1,
            x: rect.x * RENDER_SCALE,
            y: (pageH - rect.y - rect.height) * RENDER_SCALE,
            w: rect.width * RENDER_SCALE,
            h: rect.height * RENDER_SCALE,
            options,
            // getWidgets() and getOptions() both walk the field's Kids array
            // in the same order, so index-aligning them gives each on-page
            // radio button its own "on" export value.
            widgetValue: type === 'radio' ? options?.[widgetIndex] : undefined,
          })
        })

        if (type === 'text') initialValues[name] = field.getText() ?? ''
        else if (type === 'checkbox') initialValues[name] = field.isChecked()
        else if (type === 'radio') initialValues[name] = field.getSelected() ?? ''
        else if (type === 'dropdown') initialValues[name] = field.getSelected()?.[0] ?? ''
      }

      setFields(detected)
      setValues(initialValues)
    } catch {
      // Not every PDF has a form (or is one pdf-lib can parse) — that just
      // means no fields to fill, not an error the rest of the editor
      // (already loaded via pdf.js) needs to surface.
      setFields([])
      setValues({})
    }
  }, [])

  const setValue = useCallback((name, value) => {
    setValues((prev) => ({ ...prev, [name]: value }))
  }, [])

  const setValuesBulk = useCallback((patch) => {
    setValues((prev) => ({ ...prev, ...patch }))
  }, [])

  const getPageFields = useCallback(
    (page) => fields.filter((f) => f.page === page),
    [fields],
  )

  const reset = useCallback(() => {
    setFields([])
    setValues({})
  }, [])

  return {
    fields,
    values,
    hasFields: fields.length > 0,
    detect,
    setValue,
    setValuesBulk,
    getPageFields,
    reset,
  }
}
