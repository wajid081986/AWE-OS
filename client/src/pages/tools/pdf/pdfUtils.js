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
