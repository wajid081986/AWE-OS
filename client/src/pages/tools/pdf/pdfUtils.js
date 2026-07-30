export const downloadFile = (bytes, filename, type = 'application/pdf') => {
  const blob = new Blob([bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

// Browsers report `file.type` from OS/source metadata at drag-time, not by
// reading the file — it's frequently empty or generic (application/octet-stream)
// for files dropped from cloud-sync folders, email clients, etc., even for a
// genuinely valid PDF. Falling back to the .pdf extension avoids silently
// rejecting those files.
export const isPdfFile = (file) =>
  !!file && (file.type === 'application/pdf' || /\.pdf$/i.test(file.name || ''))

export const formatBytes = (bytes) => {
  if (!bytes || bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

export const readFileAsArrayBuffer = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = e => resolve(e.target.result)
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })

// pdf-lib can only embed PNG/JPEG (PdfEditorV2's Image tool) — same
// type-vs-extension fallback reasoning as isPdfFile above.
export const isImageFile = (file) =>
  !!file && (file.type === 'image/png' || file.type === 'image/jpeg' || /\.(png|jpe?g)$/i.test(file.name || ''))

export const readImageDimensions = (bytes, mimeType) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }))
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })

// Re-rasterizes a cropped region into new PNG bytes for PdfEditorV2's Image
// tool crop feature — cropping is implemented this way (rather than carrying
// crop-rect metadata through to the pdf-lib download step) because pdf-lib's
// drawImage always draws the whole embedded image scaled to a box; it has no
// source-rect parameter. `cropRect` (x, y, width, height) must be in the
// image's own natural pixel space, not display space.
export const cropImageToBytes = (bytes, mimeType, cropRect) =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }))
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(cropRect.width))
      canvas.height = Math.max(1, Math.round(cropRect.height))
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, cropRect.x, cropRect.y, cropRect.width, cropRect.height, 0, 0, canvas.width, canvas.height)
      canvas.toBlob((blob) => {
        if (!blob) { reject(new Error('Crop failed.')); return }
        blob.arrayBuffer()
          .then((buf) => resolve({ bytes: new Uint8Array(buf), width: canvas.width, height: canvas.height }))
          .catch(reject)
      }, 'image/png')
    }
    img.onerror = (err) => {
      URL.revokeObjectURL(url)
      reject(err)
    }
    img.src = url
  })

export const parsePageRanges = (rangeStr, totalPages) => {
  const pages = new Set()
  const parts = rangeStr.split(',').map(s => s.trim()).filter(Boolean)
  for (const part of parts) {
    if (part.includes('-')) {
      const [start, end] = part.split('-').map(Number)
      for (let i = Math.max(1, start); i <= Math.min(totalPages, end); i++) pages.add(i)
    } else {
      const n = parseInt(part)
      if (n >= 1 && n <= totalPages) pages.add(n)
    }
  }
  return [...pages].sort((a, b) => a - b)
}
