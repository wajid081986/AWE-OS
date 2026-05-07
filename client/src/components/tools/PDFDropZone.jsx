import { useRef, useState } from 'react'
import { formatBytes } from '../../pages/tools/pdf/pdfUtils'

export default function PDFDropZone({
  onFiles,
  files = [],
  onRemove,
  multiple = false,
  accept = '.pdf,application/pdf',
  label = 'Drop your PDF here',
  hint = 'or click to browse',
  maxSize = 100 * 1024 * 1024,
}) {
  const inputRef = useRef(null)
  const [dragging, setDragging] = useState(false)
  const [sizeError, setSizeError] = useState('')

  const validate = (fileList) => {
    setSizeError('')
    const valid = fileList.filter(f => {
      if (f.size > maxSize) { setSizeError(`File "${f.name}" exceeds ${formatBytes(maxSize)} limit.`); return false }
      return true
    })
    if (valid.length) onFiles(multiple ? valid : [valid[0]])
  }

  const handleDrop = (e) => {
    e.preventDefault(); setDragging(false)
    const dropped = Array.from(e.dataTransfer.files)
    validate(dropped)
  }

  const handleChange = (e) => validate(Array.from(e.target.files))

  const openPicker = () => inputRef.current?.click()

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        role="button" tabIndex={0}
        onClick={openPicker}
        onKeyDown={e => e.key === 'Enter' && openPicker()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className={`relative border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all select-none
          ${dragging ? 'border-blue-400 bg-blue-50 scale-[1.01]' : 'border-gray-300 bg-gray-50 hover:border-blue-300 hover:bg-blue-50/40'}`}
      >
        <input
          ref={inputRef} type="file"
          accept={accept} multiple={multiple}
          className="hidden"
          onChange={handleChange}
        />
        <p className="text-4xl mb-3">📄</p>
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <p className="text-xs text-gray-400 mt-1">{hint}</p>
        <p className="text-xs text-gray-400 mt-0.5">Max {formatBytes(maxSize)}</p>
      </div>

      {sizeError && <p className="text-xs text-red-600 font-medium">{sizeError}</p>}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((file, i) => (
            <div key={`${file.name}-${i}`}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <span className="text-2xl shrink-0">📄</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{formatBytes(file.size)}</p>
              </div>
              {onRemove && (
                <button
                  onClick={e => { e.stopPropagation(); onRemove(i) }}
                  className="text-gray-400 hover:text-red-500 transition-colors text-lg leading-none shrink-0"
                >×</button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
