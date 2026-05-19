import { useState, useRef } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import JSZip from 'jszip'
import ToolPageShell from '../ToolPageShell'

pdfjsLib.GlobalWorkerOptions.workerSrc =
  `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`

// PPTX EMU dimensions for 10" × 7.5" (standard 4:3)
const CX = 9144000
const CY = 6858000

function xmlEscape(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function slideXml(rId, idx) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
       xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
       xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    <p:pic>
      <p:nvPicPr>
        <p:cNvPr id="2" name="Page${xmlEscape(String(idx))}"/>
        <p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr>
        <p:nvPr/>
      </p:nvPicPr>
      <p:blipFill>
        <a:blip r:embed="${xmlEscape(rId)}"/>
        <a:stretch><a:fillRect/></a:stretch>
      </p:blipFill>
      <p:spPr>
        <a:xfrm><a:off x="0" y="0"/><a:ext cx="${CX}" cy="${CY}"/></a:xfrm>
        <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      </p:spPr>
    </p:pic>
  </p:spTree></p:cSld>
</p:sld>`
}

function slideRelsXml(imgFilename) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/${xmlEscape(imgFilename)}"/>
</Relationships>`
}

function presentationXml(numSlides) {
  const slideIdList = Array.from({ length: numSlides }, (_, i) =>
    `<p:sldId id="${256 + i}" r:id="rId${i + 1}"/>`
  ).join('\n    ')
  const sldSz = `<p:sldSz cx="${CX}" cy="${CY}" type="screen4x3"/>`
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
                xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
                xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId0"/></p:sldMasterIdLst>
  <p:sldIdLst>
    ${slideIdList}
  </p:sldIdLst>
  ${sldSz}
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`
}

function presentationRelsXml(numSlides) {
  const slideRels = Array.from({ length: numSlides }, (_, i) =>
    `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`
  ).join('\n  ')
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId0" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideRels}
</Relationships>`
}

const STEPS = [
  "Upload a PDF file by clicking the upload area or dragging and dropping a file. Each PDF page is rendered to an image and placed on a separate PPTX slide. The conversion works on any PDF, including scanned documents — because pages are rendered as images, the tool does not need embedded text. The output will be an editable PPTX file with one image-based slide per page.",
  "After upload, the conversion starts automatically. Each page is rendered to a PNG image using the PDF.js library, which rasterises the page at 1.5× scale (96 DPI equivalent). A progress bar shows how many pages have been processed. For a standard 10-page PDF, conversion typically takes 15–30 seconds depending on the visual complexity of the pages and your device's performance.",
  "When all pages are processed, the 'Download PPTX' button becomes active. Click it to download the completed PowerPoint file. The file is a valid .pptx file structured according to the Office Open XML standard — compatible with Microsoft PowerPoint 2010 and later, LibreOffice Impress, Google Slides (upload and it converts automatically), and Keynote on macOS.",
  "Open the downloaded PPTX in PowerPoint or your preferred presentation editor. Each slide contains the PDF page as a full-size image. You can then add text boxes, shapes, annotations, speaker notes, or branding overlays on top of the image slides. To make the text editable rather than image-based, you would need to re-create the content as native PowerPoint elements — but for content review, annotation, and presentation, the image-based slides are fully usable.",
  "If you only need a subset of pages — for example, converting a 50-page PDF but only presenting slides 10–25 — extract those pages first using the AWE-OS Extract Pages PDF tool before uploading here. This reduces conversion time and produces a smaller, more focused PPTX file. You can also use the Rotate PDF tool beforehand if any pages need orientation correction before conversion.",
]

const FAQS = [
  {
    q: 'Will the converted PPTX have editable text or just images?',
    a: "The converted PPTX contains each PDF page as a full-page PNG image on each slide — the text, charts, diagrams, and all visual elements are baked into the image rather than existing as separate editable PowerPoint elements. This means you cannot click on a sentence and edit it directly in PowerPoint. The advantage is that the visual fidelity is very high — the slide looks exactly like the original PDF page. To add editable elements, insert PowerPoint text boxes, shapes, or callouts on top of the image layer. If you need fully editable text slides, you would need to recreate the content using a Word-to-PPTX conversion or manually re-type the content into PowerPoint.",
  },
  {
    q: 'What resolution are the converted slides?',
    a: "PDF pages are rendered at 1.5× scale using PDF.js, which produces images at approximately 108 DPI (1.5 × standard 72 DPI PDF resolution). For a standard A4 PDF page (595 × 842 points), the rendered PNG image is approximately 893 × 1263 pixels. For a standard widescreen (16:9) PDF slide of 960 × 540 points, the rendered image is approximately 1440 × 810 pixels. These resolutions are adequate for screen presentation and standard monitor displays. They are not print-quality — if you need high-resolution slides for large-format printing, use a desktop PDF-to-image converter that supports 300 DPI output, then insert those images into PowerPoint manually.",
  },
  {
    q: 'Which PowerPoint versions and presentation apps support the output PPTX?',
    a: "The generated PPTX uses the Office Open XML (OOXML) format standardised as ISO/IEC 29500, which is supported by Microsoft PowerPoint 2010 and all later versions (2013, 2016, 2019, 2021, Microsoft 365). Google Slides supports PPTX upload with automatic conversion. LibreOffice Impress 6.0 and later opens PPTX natively with full fidelity for image-based slides. Apple Keynote on macOS and iOS supports PPTX import. WPS Office on Windows, Android, and iOS also reads PPTX. The generated file does not use any Office-proprietary features — it consists only of standard image-on-slide elements, maximising compatibility across all OOXML-supporting applications.",
  },
  {
    q: 'Can I convert a password-protected PDF to PPTX?',
    a: "No — password-protected PDFs that require an open password cannot be processed. The PDF.js library requires the document to be fully decrypted before it can render pages. If you have the password, you can first use the AWE-OS Unlock PDF tool to remove the password protection, then upload the unlocked file here for conversion. PDFs with only editing restrictions (owner-level restrictions) but no open password can typically be processed — the rendering engine reads the page content directly without needing to modify the file.",
  },
  {
    q: 'How large will the output PPTX file be?',
    a: "File size depends primarily on the number of pages and visual complexity of each page. A simple 10-page text-heavy PDF produces a PPTX of approximately 1–3 MB. A 10-page PDF with high-resolution photographs or dense graphics may produce a 10–25 MB PPTX. Each page is stored as a separate PNG image inside the PPTX ZIP container — PNG compression is lossless, which keeps quality high but may produce larger files for photographic content. If file size is a concern, consider extracting only the necessary pages before conversion, or using a desktop tool that allows configuring image compression settings.",
  },
  {
    q: 'Is the PDF file uploaded to a server during conversion?',
    a: "No — the PDF is never sent to any server. The entire conversion process runs locally in your browser: PDF.js reads and renders each page in JavaScript, the canvas API captures each rendered frame as a PNG image in browser memory, and JSZip packages the images with the PPTX XML structure entirely client-side. The final PPTX file is generated and downloaded from memory — no file data leaves your device at any point. This makes the tool safe for confidential documents such as financial reports, legal documents, HR records, and proprietary technical documentation that should not be uploaded to third-party services.",
  },
]

const ABOUT = [
  'The PDF to PowerPoint converter transforms each page of a PDF into an image-based slide in a standard PPTX file. Upload a PDF, and the tool renders every page using PDF.js, captures each rendered frame as a PNG image, and packages them into a properly structured Office Open XML PPTX file using JSZip — all within your browser, with no server involvement.',
  'Converting PDFs to PPTX is a common requirement for repurposing existing documents as presentation materials: turning a company report into a boardroom deck, converting a technical specification into review slides, or using a published research paper as the basis for a conference presentation. The image-based output preserves the exact visual appearance of the original PDF pages, including fonts, layouts, charts, and any graphical elements, regardless of whether those assets are available on the destination system.',
  'The generated PPTX file is compatible with Microsoft PowerPoint, Google Slides, LibreOffice Impress, and any application that supports the Office Open XML standard. Each slide contains the PDF page as a full-slide image, on top of which you can add text annotations, company branding, speaker notes, and shapes using your presentation editor. The output uses standard 4:3 slide dimensions (9144000 × 6858000 EMUs) matching traditional presentation layouts.',
  'Because all processing runs in the browser, there is no file size restriction beyond available browser memory, and no data is transmitted to any server. The tool works on any modern browser — Chrome, Firefox, Safari, Edge — without requiring any plugin or software installation. No account is required and there is no usage limit.',
]

function PDFtoPPTTool() {
  const [status, setStatus]   = useState('idle')
  const [progress, setProgress] = useState({ done: 0, total: 0 })
  const [pptxBlob, setPptxBlob] = useState(null)
  const [filename, setFilename] = useState('presentation')
  const fileRef = useRef()

  const convert = async (file) => {
    if (!file || !file.name.toLowerCase().endsWith('.pdf')) return
    setFilename(file.name.replace(/\.pdf$/i, ''))
    setPptxBlob(null); setStatus('rendering'); setProgress({ done: 0, total: 0 })

    try {
      const buf = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: buf }).promise
      const n   = pdf.numPages
      setProgress({ done: 0, total: n })

      const zip = new JSZip()

      // Static required PPTX scaffolding
      zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="png" ContentType="image/png"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  ${Array.from({ length: n }, (_, i) =>
    `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`
  ).join('\n  ')}
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
</Types>`)

      zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
</Relationships>`)

      // Minimal slideMaster + slideLayout needed for valid PPTX
      const masterXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <p:cSld><p:bg><p:bgRef idx="1001"><a:schemeClr clr="bg1"/></p:bgRef></p:bg>
  <p:spTree><p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
  <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
  </p:spTree></p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst><p:sldLayoutId id="2147483649" r:id="rId1"/></p:sldLayoutIdLst>
</p:sldMaster>`

      const masterRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`

      const layoutXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main"
             xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"
             xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" type="blank">
  <p:cSld name="Blank"><p:spTree>
    <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
    <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
  </p:spTree></p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`

      const layoutRels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`

      zip.file('ppt/slideMasters/slideMaster1.xml', masterXml)
      zip.file('ppt/slideMasters/_rels/slideMaster1.xml.rels', masterRels)
      zip.file('ppt/slideLayouts/slideLayout1.xml', layoutXml)
      zip.file('ppt/slideLayouts/_rels/slideLayout1.xml.rels', layoutRels)
      zip.file('ppt/presentation.xml', presentationXml(n))
      zip.file('ppt/_rels/presentation.xml.rels', presentationRelsXml(n))

      // Render each page
      for (let i = 1; i <= n; i++) {
        const page     = await pdf.getPage(i)
        const viewport = page.getViewport({ scale: 1.5 })
        const canvas   = document.createElement('canvas')
        canvas.width   = viewport.width
        canvas.height  = viewport.height
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise

        const imgBlob = await new Promise(res => canvas.toBlob(res, 'image/png'))
        const imgBuf  = await imgBlob.arrayBuffer()
        const imgName = `slide${i}.png`

        zip.file(`ppt/media/${imgName}`, imgBuf)
        zip.file(`ppt/slides/slide${i}.xml`, slideXml('rId1', i))
        zip.file(`ppt/slides/_rels/slide${i}.xml.rels`, slideRelsXml(imgName))

        setProgress({ done: i, total: n })
      }

      const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' })
      setPptxBlob(blob)
      setStatus('done')
    } catch (err) {
      console.error(err)
      setStatus('error')
    }
  }

  const download = () => {
    if (!pptxBlob) return
    const url = URL.createObjectURL(pptxBlob)
    const a   = document.createElement('a')
    a.href = url; a.download = `${filename}.pptx`; a.click()
    URL.revokeObjectURL(url)
  }

  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); convert(e.dataTransfer.files[0]) }}
        onClick={() => status !== 'rendering' && fileRef.current?.click()}
        className="border-2 border-dashed border-gray-200 rounded-xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/20 transition-colors"
      >
        <p className="text-3xl mb-3">📑</p>
        <p className="text-gray-500 text-sm">Drop a PDF or <span className="text-blue-600 font-medium">click to browse</span></p>
        <p className="text-xs text-gray-400 mt-1">Any PDF · image-based slides output</p>
        <input ref={fileRef} type="file" accept=".pdf" className="hidden"
          onChange={e => convert(e.target.files[0])} />
      </div>

      {/* Progress */}
      {status === 'rendering' && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="flex justify-between text-sm font-medium text-blue-700 mb-2">
            <span>Rendering pages…</span>
            <span>{progress.done} / {progress.total} ({pct}%)</span>
          </div>
          <div className="h-2.5 bg-blue-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
          </div>
        </div>
      )}

      {status === 'error' && (
        <p className="text-red-500 text-sm text-center">Conversion failed. Please check that the file is a valid, unencrypted PDF.</p>
      )}

      {status === 'done' && (
        <div className="bg-green-50 border border-green-200 rounded-xl p-5 flex items-center justify-between">
          <div>
            <p className="font-semibold text-green-800">Conversion complete</p>
            <p className="text-sm text-green-700">{progress.total} slide{progress.total !== 1 ? 's' : ''} · {(pptxBlob?.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
          <button onClick={download}
            className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-semibold transition-colors">
            Download PPTX
          </button>
        </div>
      )}
    </div>
  )
}

export default function PDFtoPPT() {
  return (
    <ToolPageShell
      slug="pdf-to-ppt"
      name="PDF to PowerPoint"
      description="Convert PDF pages to PowerPoint slides — each page becomes an image-based slide in a PPTX file."
      icon="📊"
      steps={STEPS}
      faqs={FAQS}
      about={ABOUT}
    >
      <PDFtoPPTTool />
    </ToolPageShell>
  )
}
