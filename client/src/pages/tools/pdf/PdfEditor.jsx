import { useState, useRef, useEffect, useCallback } from 'react'
import * as pdfjsLib from 'pdfjs-dist'
import pdfjsWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url'
import { PDFDocument, rgb, StandardFonts, degrees } from 'pdf-lib'
import ToolPageShell from '../ToolPageShell'
import { downloadFile, downloadBlob, isPdfFile } from './pdfUtils'
import { savePdfSession, evictOldPdfSessions } from './pdfEditorSession'
import { TOOL_ABOUT } from '../../../data/toolPageContent'
import DisabledToolButton from '../../../components/pdf-editor/DisabledToolButton'

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerSrc

// ── Helpers ──────────────────────────────────────────────────────────────────
const uid   = () => Math.random().toString(36).slice(2, 10)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))
function hex2rgb(hex) {
  const h = (hex || '#000000').replace('#', '').padEnd(6, '0')
  return { r: parseInt(h.slice(0,2),16)/255, g: parseInt(h.slice(2,4),16)/255, b: parseInt(h.slice(4,6),16)/255 }
}
function starPts(cx, cy, r1, r2, n = 5) {
  const pts = []
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2
    const a = (i * Math.PI / n) - Math.PI / 2
    pts.push(`${cx + r * Math.cos(a)},${cy + r * Math.sin(a)}`)
  }
  return pts.join(' ')
}

// Encode Uint8Array → base64 in chunks (avoids call-stack overflow on large files)
function uint8ToBase64(arr) {
  let str = ''
  const chunk = 8192
  for (let i = 0; i < arr.length; i += chunk) {
    str += String.fromCharCode(...arr.subarray(i, i + chunk))
  }
  return btoa(str)
}

// ── Design Tokens ─────────────────────────────────────────────────────────────
const C = {
  topBar:'#1f2937', sidebar:'#111827', canvas:'#e5e7eb',
  ribbon:'#f9fafb', download:'#16a34a', downloadH:'#15803d',
}

// ── Constants ─────────────────────────────────────────────────────────────────
const MAX_PDF_SIZE_MB = 25
const PALETTE       = ['#111827','#ef4444','#f97316','#eab308','#22c55e','#3b82f6','#8b5cf6','#ec4899','#1e3a8a','#065f46','#fef08a','#ffffff']
const FONT_SIZES    = [8,10,12,14,16,18,20,24,28,32,36,48,60,72]
const FONT_FAMILIES = ['Helvetica','Times New Roman','Courier New','Georgia','Verdana','Arial']
const STROKE_WIDTHS = [1,2,3,4,6,8,12]
const ZOOM_LEVELS   = [0.25,0.5,0.75,1.0,1.25,1.5,2.0,2.5,3.0]
const HL_COLORS     = ['#fef08a','#bbf7d0','#bfdbfe','#fecaca','#e9d5ff','#fed7aa','#f5d0fe','#ccfbf1']
const STAMP_TYPES   = ['APPROVED','REJECTED','CONFIDENTIAL','DRAFT','REVISED','VOID','COPY','FINAL']
const STAMP_COLS    = { red:'#dc2626', blue:'#1d4ed8', green:'#15803d', purple:'#7c3aed' }
const CURSORS = {
  text:'text', typewriter:'text', draw:'crosshair', hlpen:'crosshair', eraser:'cell',
  highlight:'crosshair', underline:'crosshair', strikethrough:'crosshair',
  rect:'crosshair', circle:'crosshair', triangle:'crosshair', diamond:'crosshair',
  star:'crosshair', cloud:'crosshair', cross:'crosshair', checkmark:'crosshair',
  polyline:'crosshair', dashed:'crosshair', measure:'crosshair',
  arrow:'crosshair', line:'crosshair', note:'copy', callout:'crosshair',
  image:'copy', signature:'copy', stamp:'copy', whiteout:'crosshair', redact:'crosshair',
  'edit-text':'crosshair', 'edit-image':'crosshair',
  hand:'grab',
}

// ── Ribbon Tabs ───────────────────────────────────────────────────────────────
const RIBBON_TABS = [
  { id:'home', label:'Home', tools:[
    { id:'select',    icon:'↖',  label:'Select',    key:'V', cls:'text-xl' },
    'sep',
    { id:'hand',      icon:'✋', label:'Hand',      key:'H', cls:'text-xl' },
    'sep',
    { id:'_zoom-in',  icon:'⊕',  label:'Zoom In',   act:'zoom-in',  cls:'text-xl' },
    { id:'_zoom-out', icon:'⊖',  label:'Zoom Out',  act:'zoom-out', cls:'text-xl' },
    { id:'_fit-w',    icon:'⊡',  label:'Fit Width', act:'fit-w',    cls:'text-xl' },
    { id:'_fit-p',    icon:'⊞',  label:'Fit Page',  act:'fit-p',    cls:'text-xl' },
  ]},
  { id:'annotate', label:'Annotate', tools:[
    { id:'text',          icon:'T',  label:'Text',       key:'T', cls:'text-xl font-bold' },
    { id:'typewriter',    icon:'⌨',  label:'Typewriter', key:'',  cls:'text-xl' },
    'sep',
    { id:'highlight',     icon:'▬',  label:'Highlight',  key:'I', cls:'text-xl', isHL:true },
    { id:'underline',     icon:'U',  label:'Underline',  key:'U', cls:'text-xl font-bold underline decoration-2' },
    { id:'strikethrough', icon:'S',  label:'Strikeout',  key:'',  cls:'text-xl line-through' },
    'sep',
    { id:'note',          icon:'📝', label:'Note',       key:'N', cls:'text-lg' },
    { id:'callout',       icon:'💬', label:'Callout',    key:'',  cls:'text-lg' },
    'sep',
    { id:'stamp',         icon:'⬛', label:'Stamp',      key:'S', cls:'text-xl' },
  ]},
  { id:'draw', label:'Draw', tools:[
    { id:'draw',     icon:'✏️', label:'Pencil',   key:'D', cls:'text-lg' },
    { id:'hlpen',    icon:'🖍', label:'Marker',   key:'',  cls:'text-xl' },
    { id:'eraser',   icon:'◻',  label:'Eraser',   key:'E', cls:'text-xl' },
    'sep',
    { id:'arrow',    icon:'↗',  label:'Arrow',    key:'A', cls:'text-xl' },
    { id:'line',     icon:'—',  label:'Line',     key:'',  cls:'text-xl font-bold' },
    { id:'dashed',   icon:'╌',  label:'Dashed',   key:'',  cls:'text-xl font-bold' },
    'sep',
    { id:'polyline', icon:'⌒',  label:'Polyline', key:'',  cls:'text-xl' },
    { id:'measure',  icon:'↔',  label:'Measure',  key:'',  cls:'text-xl' },
  ]},
  { id:'shapes', label:'Shapes', tools:[
    { id:'rect',      icon:'▭',  label:'Rect',     key:'R', cls:'text-xl' },
    { id:'circle',    icon:'◯',  label:'Ellipse',  key:'',  cls:'text-xl' },
    { id:'triangle',  icon:'△',  label:'Triangle', key:'',  cls:'text-xl' },
    { id:'diamond',   icon:'◇',  label:'Diamond',  key:'',  cls:'text-xl' },
    'sep',
    { id:'star',      icon:'★',  label:'Star',     key:'',  cls:'text-xl' },
    { id:'cloud',     icon:'☁',  label:'Cloud',    key:'',  cls:'text-xl' },
    'sep',
    { id:'cross',     icon:'✕',  label:'Cross',    key:'',  cls:'text-xl font-bold' },
    { id:'checkmark', icon:'✓',  label:'Check',    key:'',  cls:'text-2xl font-bold' },
  ]},
  { id:'insert', label:'Insert', tools:[
    { id:'image',       icon:'🖼️', label:'Image',     key:'',  cls:'text-lg' },
    { id:'signature',   icon:'✍️', label:'Signature', key:'',  cls:'text-lg' },
    'sep',
    { id:'_page-num',   icon:'#',  label:'Page Nos.', act:'page-num',       cls:'text-xl font-bold' },
    { id:'_watermark',  icon:'⌁',  label:'Watermark', act:'watermark-open', cls:'text-xl' },
    { id:'_hf',         icon:'≡',  label:'Hdr/Ftr',   act:'hf-open',        cls:'text-xl' },
    'sep',
    { id:'_blank',      icon:'+',  label:'Blank Page',act:'blank-page',     cls:'text-2xl font-bold' },
    { id:'_from-file',  icon:'📂', label:'From File',  act:'from-file',      cls:'text-lg' },
  ]},
  { id:'edit', label:'Edit PDF', tools:[
    { id:'edit-text',   icon:'📝', label:'Edit Text',  key:'',  cls:'text-lg' },
    { id:'edit-image',  icon:'🖼', label:'Edit Image', key:'',  cls:'text-lg' },
    'sep',
    { id:'whiteout',    icon:'□',  label:'Whiteout',   key:'W', cls:'text-xl' },
    { id:'redact',      icon:'■',  label:'Redact',     key:'',  cls:'text-xl' },
    'sep',
    { id:'_rot-cw',     icon:'↻',  label:'Rotate CW',  act:'rot-cw',  cls:'text-2xl' },
    { id:'_rot-ccw',    icon:'↺',  label:'Rotate CCW', act:'rot-ccw', cls:'text-2xl' },
    { id:'_del-page',   icon:'🗑', label:'Del Page',   act:'del-page',cls:'text-lg' },
  ]},
  { id:'pages', label:'Pages', tools:[
    { id:'_pg-ins-b',   icon:'⊞',  label:'Ins. Before', act:'pg-ins-before', cls:'text-lg' },
    { id:'_pg-ins-a',   icon:'⊞',  label:'Ins. After',  act:'pg-ins-after',  cls:'text-lg' },
    'sep',
    { id:'_pg-dup',     icon:'⧉',  label:'Duplicate',   act:'pg-dup',    cls:'text-xl' },
    { id:'_pg-del',     icon:'🗑', label:'Delete',      act:'pg-del',    cls:'text-lg' },
    'sep',
    { id:'_pg-up',      icon:'↑',  label:'Move Up',     act:'pg-up',     cls:'text-2xl' },
    { id:'_pg-down',    icon:'↓',  label:'Move Down',   act:'pg-down',   cls:'text-2xl' },
    'sep',
    { id:'_pg-extr',    icon:'📤', label:'Extract',     act:'pg-extract',cls:'text-lg' },
  ]},
  { id:'security', label:'Security', tools:[
    { id:'_password',   icon:'🔒', label:'Password',   act:'pwd-open',    cls:'text-lg' },
    { id:'_strip-meta', icon:'🧹', label:'Strip Meta', act:'toggle-meta', cls:'text-lg' },
    'sep',
    { id:'redact-s',    icon:'■',  label:'Redact',     toolId:'redact',   cls:'text-xl' },
  ]},
  { id:'view', label:'View', tools:[
    { id:'_fit-w2',     icon:'⊡',  label:'Fit Width', act:'fit-w',       cls:'text-xl' },
    { id:'_fit-p2',     icon:'⊞',  label:'Fit Page',  act:'fit-p',       cls:'text-xl' },
    'sep',
    { id:'_v-single',   icon:'▬',  label:'Single',    act:'view-single', cls:'text-xl' },
    { id:'_v-cont',     icon:'≡',  label:'Scroll',    act:'view-cont',   cls:'text-xl' },
    { id:'_v-two',      icon:'⊟',  label:'Two-Page',  act:'view-two',    cls:'text-xl' },
    'sep',
    { id:'_dark',       icon:'🌙', label:'Dark Mode', act:'dark-mode',   cls:'text-lg' },
    'sep',
    { id:'_extract-txt',icon:'📋', label:'Extract Text', act:'extract-text', cls:'text-lg' },
  ]},
]

// ── Signature Modal ───────────────────────────────────────────────────────────
function SignatureModal({ onInsert, onClose }) {
  const [tab, setTab]     = useState('draw')
  const [typed, setTyped] = useState('')
  const [sigFont, setSigFont] = useState('italic 52px Georgia,serif')
  const canvasRef = useRef(null)
  const drawing   = useRef(false)
  const lastPt    = useRef(null)
  const uploadRef = useRef(null)

  useEffect(() => {
    if (tab !== 'draw') return
    const c = canvasRef.current; if (!c) return
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.strokeStyle = '#1e3a8a'; ctx.lineWidth = 2.5; ctx.lineCap = 'round'; ctx.lineJoin = 'round'
  }, [tab])

  const pt = (e, c) => {
    const r = c.getBoundingClientRect(); const src = e.touches?.[0] || e
    return { x:(src.clientX-r.left)*(c.width/r.width), y:(src.clientY-r.top)*(c.height/r.height) }
  }
  const onDown = e => { e.preventDefault(); drawing.current=true; lastPt.current=pt(e,canvasRef.current) }
  const onMove = e => {
    e.preventDefault(); if (!drawing.current) return
    const c=canvasRef.current, ctx=c.getContext('2d'), p=pt(e,c)
    ctx.beginPath(); ctx.moveTo(lastPt.current.x,lastPt.current.y); ctx.lineTo(p.x,p.y); ctx.stroke()
    lastPt.current=p
  }
  const onUp = () => { drawing.current=false }
  const clearCanvas = () => {
    const c=canvasRef.current, ctx=c.getContext('2d')
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,c.width,c.height)
    ctx.strokeStyle='#1e3a8a'; ctx.lineWidth=2.5; ctx.lineCap='round'; ctx.lineJoin='round'
  }
  const insert = () => {
    if (tab === 'draw') { onInsert(canvasRef.current.toDataURL('image/png')); return }
    if (tab === 'type') {
      if (!typed.trim()) return
      const c=document.createElement('canvas'); c.width=420; c.height=110
      const ctx=c.getContext('2d')
      ctx.fillStyle='#fff'; ctx.fillRect(0,0,420,110)
      ctx.fillStyle='#1e3a8a'; ctx.font=sigFont; ctx.textBaseline='middle'; ctx.textAlign='center'
      ctx.fillText(typed.slice(0,40), 210, 55)
      onInsert(c.toDataURL('image/png'))
    }
  }
  const FONTS = [
    { label:'Cursive',f:'italic 52px Georgia,serif' },
    { label:'Bold',   f:'bold 44px Arial,sans-serif' },
    { label:'Script', f:'italic 48px "Comic Sans MS",cursive' },
  ]
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Add Signature</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="flex border-b">
          {[['draw','✍️ Draw'],['type','⌨️ Type'],['upload','📁 Upload']].map(([t,l]) => (
            <button key={t} onClick={()=>setTab(t)}
              className={`flex-1 py-2.5 text-sm font-medium transition-colors ${tab===t?'border-b-2 border-blue-600 text-blue-600':'text-gray-500 hover:text-gray-700'}`}>{l}</button>
          ))}
        </div>
        <div className="p-5">
          {tab==='draw' && <>
            <p className="text-xs text-gray-500 mb-2">Draw your signature below</p>
            <canvas ref={canvasRef} width={440} height={130} className="border-2 border-dashed border-gray-300 rounded-lg w-full touch-none cursor-crosshair"
              onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onDown} onTouchMove={onMove} onTouchEnd={onUp} />
            <button onClick={clearCanvas} className="mt-2 text-xs text-red-500 hover:underline">Clear</button>
          </>}
          {tab==='type' && <>
            <p className="text-xs text-gray-500 mb-2">Type your name</p>
            <input value={typed} onChange={e=>setTyped(e.target.value)} placeholder="Your name"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-gray-800 mb-3"
              style={{ fontFamily:'Georgia,serif', fontStyle:'italic', fontSize:28 }} />
            <div className="flex gap-2 mb-3">
              {FONTS.map(({label,f})=>(
                <button key={f} onClick={()=>setSigFont(f)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${sigFont===f?'bg-blue-50 border-blue-400 text-blue-700':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{label}</button>
              ))}
            </div>
            {typed && <div className="border border-dashed border-gray-300 rounded-lg p-3 text-center"
              style={{ font:sigFont, color:'#1e3a8a' }}>{typed}</div>}
          </>}
          {tab==='upload' && <>
            <p className="text-xs text-gray-500 mb-3">Upload a PNG or JPG signature image</p>
            <input ref={uploadRef} type="file" accept="image/png,image/jpeg" className="hidden"
              onChange={e => { const f=e.target.files[0]; if(f){const r=new FileReader();r.onload=ev=>onInsert(ev.target.result);r.readAsDataURL(f)} }} />
            <button onClick={()=>uploadRef.current?.click()}
              className="w-full py-10 border-2 border-dashed border-gray-300 rounded-xl text-center text-gray-500 hover:border-blue-400 hover:bg-blue-50 transition-colors text-sm">
              📁 Click to browse image
            </button>
          </>}
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          {tab!=='upload' && <button onClick={insert} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Insert</button>}
        </div>
      </div>
    </div>
  )
}

// ── Watermark Modal ───────────────────────────────────────────────────────────
function WatermarkModal({ s, set, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Watermark Settings</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Text</label>
            <input value={s.text} onChange={e=>set({text:e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Size: {s.size}px</label>
              <input type="range" min={16} max={120} value={s.size} onChange={e=>set({size:+e.target.value})} className="w-full accent-blue-600" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Opacity: {Math.round(s.opacity*100)}%</label>
              <input type="range" min={5} max={80} value={Math.round(s.opacity*100)} onChange={e=>set({opacity:e.target.value/100})} className="w-full accent-blue-600" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Angle: {s.angle}°</label>
            <input type="range" min={-90} max={90} value={s.angle} onChange={e=>set({angle:+e.target.value})} className="w-full accent-blue-600" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Color</label>
              <input type="color" value={s.color} onChange={e=>set({color:e.target.value})} className="w-full h-9 rounded cursor-pointer border border-gray-200" />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Pages</label>
              <div className="flex gap-1 h-9">
                {['all','current'].map(p=>(
                  <button key={p} onClick={()=>set({pages:p})}
                    className={`flex-1 text-xs rounded-lg border font-medium transition-colors ${s.pages===p?'bg-blue-600 text-white border-blue-600':'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
                    {p==='all'?'All':'Current'}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="border border-gray-200 rounded-xl h-28 relative bg-gray-50 overflow-hidden flex items-center justify-center">
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none"
              style={{ transform:`rotate(${s.angle}deg)` }}>
              <span style={{ color:s.color, fontSize:Math.min(s.size/2,22), opacity:s.opacity, fontWeight:'bold', whiteSpace:'nowrap', letterSpacing:'0.1em' }}>
                {s.text||'WATERMARK'}
              </span>
            </div>
            <span className="text-[10px] text-gray-400 z-10 absolute bottom-1 right-2">preview</span>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={()=>{set({enabled:false});onClose()}} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Disable</button>
          <button onClick={()=>{set({enabled:true});onClose()}} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Apply</button>
        </div>
      </div>
    </div>
  )
}

// ── Header/Footer Modal ───────────────────────────────────────────────────────
function HFModal({ s, set, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Header &amp; Footer</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center gap-3">
            <input type="checkbox" id="hdr-en" checked={s.hdrOn} onChange={e=>set({hdrOn:e.target.checked})} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="hdr-en" className="text-sm font-medium text-gray-700">Enable Header</label>
          </div>
          {s.hdrOn && <input value={s.hdrText} onChange={e=>set({hdrText:e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Header text (e.g. Company Name)" />}
          <div className="flex items-center gap-3">
            <input type="checkbox" id="ftr-en" checked={s.ftrOn} onChange={e=>set({ftrOn:e.target.checked})} className="w-4 h-4 accent-blue-600" />
            <label htmlFor="ftr-en" className="text-sm font-medium text-gray-700">Enable Footer</label>
          </div>
          {s.ftrOn && <input value={s.ftrText} onChange={e=>set({ftrText:e.target.value})}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Footer text (e.g. Confidential)" />}
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Password Modal ────────────────────────────────────────────────────────────
function PwdModal({ s, set, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Set Password</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700 leading-relaxed">
            ⚠️ Browser-based PDF encryption is limited. This appends a password note to the filename. For real encryption, use Adobe Acrobat or a server-side tool.
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input type="password" value={s.pwd} onChange={e=>set({pwd:e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter password" />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Confirm</label>
            <input type="password" value={s.confirm} onChange={e=>set({confirm:e.target.value})}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Confirm password" />
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={()=>{set({enabled:false,pwd:'',confirm:''});onClose()}} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Clear</button>
          <button onClick={()=>{if(s.pwd&&s.pwd===s.confirm){set({enabled:true});onClose()}}}
            disabled={!s.pwd||s.pwd!==s.confirm}
            className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">Set</button>
        </div>
      </div>
    </div>
  )
}

// ── Download Range Modal ──────────────────────────────────────────────────────
function DlRangeModal({ total, from, to, setFrom, setTo, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xs shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Download Page Range</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-gray-500">Pages 1–{total}</p>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">From</label>
              <input type="number" min={1} max={total} value={from}
                onChange={e=>setFrom(clamp(+e.target.value,1,total))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <span className="mt-4 text-gray-400">→</span>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">To</label>
              <input type="number" min={from} max={total} value={to}
                onChange={e=>setTo(clamp(+e.target.value,from,total))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium">Download</button>
        </div>
      </div>
    </div>
  )
}

// ── Extract Text Modal ────────────────────────────────────────────────────────
function ExtractTextModal({ text, loading, onClose }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    try { navigator.clipboard.writeText(text) } catch {}
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }
  const download = () => downloadBlob(new Blob([text], { type: 'text/plain' }), 'extracted-text.txt')
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Extracted Text</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>
        <div className="p-5">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <span className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <textarea readOnly value={text} rows={12}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-xs text-gray-700 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">Close</button>
          <button onClick={download} disabled={loading} className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50">Download .txt</button>
          <button onClick={copy} disabled={loading} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg font-medium">{copied ? '✓ Copied!' : 'Copy to Clipboard'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Resize Handles ────────────────────────────────────────────────────────────
function ResizeHandles({ onResize, onDelete }) {
  return (
    <>
      <div className="absolute inset-0 border-2 border-blue-500 rounded pointer-events-none" style={{ zIndex:1 }} />
      {['nw','ne','sw','se'].map(h => (
        <div key={h} className="absolute w-3 h-3 bg-white border-2 border-blue-500 rounded-sm"
          style={{ zIndex:2, top:h.startsWith('n')?-5:undefined, bottom:h.startsWith('s')?-5:undefined, left:h.endsWith('w')?-5:undefined, right:h.endsWith('e')?-5:undefined, cursor:`${h}-resize` }}
          onMouseDown={e=>{e.stopPropagation();onResize(e,h)}} />
      ))}
      <button onClick={e=>{e.stopPropagation();onDelete()}} onMouseDown={e=>e.stopPropagation()}
        className="absolute flex items-center justify-center w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px]"
        style={{ top:-10, right:-10, zIndex:3 }} title="Delete">✕</button>
    </>
  )
}

// ── Annotation Element ────────────────────────────────────────────────────────
function AnnotationEl({ ann, zoom, pageW, pageH, selected, onSelect, onDragStart, onResizeStart, onDelete, onChange, onContextMenu }) {
  const L = ann.x * pageW * zoom
  const T = ann.y * pageH * zoom
  const W = Math.max(4, ann.w * pageW * zoom)
  const H = Math.max(4, ann.h * pageH * zoom)
  const base = { position:'absolute', left:L, top:T, width:W, height:H, zIndex:selected?15:5, cursor:'move', boxSizing:'border-box' }
  const onDown = e => { e.stopPropagation(); onSelect(); onDragStart(e) }
  const onCtx  = e => { e.preventDefault(); e.stopPropagation(); onContextMenu(e.clientX, e.clientY) }

  const { type } = ann
  const sc = ann.strokeColor || '#1e3a8a'
  const sw = ann.strokeWidth || 2

  // Highlight / Underline / Strikethrough
  if (type==='highlight') return (
    <div style={{ ...base, background:ann.color||'#fef08a', opacity:ann.opacity??0.5 }} onMouseDown={onDown} onContextMenu={onCtx}>
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )
  if (type==='underline') return (
    <div style={{ ...base, background:'transparent', borderBottom:`${sw+1}px solid ${ann.color||'#1d4ed8'}`, opacity:0.9 }} onMouseDown={onDown} onContextMenu={onCtx}>
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )
  if (type==='strikethrough') return (
    <div style={{ ...base, background:'transparent' }} onMouseDown={onDown} onContextMenu={onCtx}>
      <div style={{ position:'absolute', top:'50%', left:0, right:0, height:sw+1, background:ann.color||'#ef4444', transform:'translateY(-50%)' }} />
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  // Whiteout / Redact
  if (type==='whiteout') return (
    <div style={{ ...base, background:'#ffffff', opacity:ann.opacity??1 }} onMouseDown={onDown} onContextMenu={onCtx}>
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )
  if (type==='redact') return (
    <div style={{ ...base, background:'#000000' }} onMouseDown={onDown} onContextMenu={onCtx}>
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  // Rect / Circle
  if (type==='rect') return (
    <div style={{ ...base, border:`${sw}px solid ${sc}`, background:ann.fillColor||'transparent', borderRadius:ann.cornerRadius||0 }} onMouseDown={onDown} onContextMenu={onCtx}>
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )
  if (type==='circle') return (
    <div style={{ ...base, border:`${sw}px solid ${sc}`, background:ann.fillColor||'transparent', borderRadius:'50%' }} onMouseDown={onDown} onContextMenu={onCtx}>
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  // SVG Shapes
  if (['triangle','diamond','star','cloud','cross','checkmark'].includes(type)) {
    const fc = ann.fillColor || 'transparent'
    let shape = null
    if (type==='triangle') shape = <polygon points={`${W/2},${sw} ${sw},${H-sw} ${W-sw},${H-sw}`} fill={fc} stroke={sc} strokeWidth={sw} />
    if (type==='diamond')  shape = <polygon points={`${W/2},${sw} ${W-sw},${H/2} ${W/2},${H-sw} ${sw},${H/2}`} fill={fc} stroke={sc} strokeWidth={sw} />
    if (type==='star')     shape = <polygon points={starPts(W/2,H/2,Math.min(W,H)/2-sw,Math.min(W,H)/4.2)} fill={fc} stroke={sc} strokeWidth={sw} />
    if (type==='cloud') shape = <>
      <rect x={sw} y={H*0.38} width={W-sw*2} height={H*0.56} rx={Math.min(W,H)*0.15} fill={fc} stroke={sc} strokeWidth={sw} />
      <ellipse cx={W*0.25} cy={H*0.41} rx={W*0.17} ry={H*0.15} fill={fc} stroke={sc} strokeWidth={sw} />
      <ellipse cx={W*0.5}  cy={H*0.25} rx={W*0.2}  ry={H*0.2}  fill={fc} stroke={sc} strokeWidth={sw} />
      <ellipse cx={W*0.75} cy={H*0.41} rx={W*0.17} ry={H*0.15} fill={fc} stroke={sc} strokeWidth={sw} />
    </>
    if (type==='cross') shape = <>
      <line x1={sw} y1={sw} x2={W-sw} y2={H-sw} stroke={sc} strokeWidth={sw*1.5} strokeLinecap="round" />
      <line x1={W-sw} y1={sw} x2={sw} y2={H-sw} stroke={sc} strokeWidth={sw*1.5} strokeLinecap="round" />
    </>
    if (type==='checkmark') shape = <polyline points={`${sw*2},${H/2} ${W*0.38},${H-sw*2} ${W-sw*2},${sw*2}`} fill="none" stroke={sc} strokeWidth={sw*1.5} strokeLinecap="round" strokeLinejoin="round" />
    return (
      <div style={{ ...base }} onMouseDown={onDown} onContextMenu={onCtx}>
        <svg width={W} height={H} style={{ position:'absolute', top:0, left:0, overflow:'visible', pointerEvents:'none' }}>{shape}</svg>
        {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
      </div>
    )
  }

  // Line / Arrow / Dashed / Measure
  if (['line','arrow','dashed','measure'].includes(type)) {
    const dx = ((ann.x2f??ann.x+ann.w) - ann.x) * pageW * zoom
    const dy = ((ann.y2f??ann.y+ann.h) - ann.y) * pageH * zoom
    const ox = dx < 0 ? -dx : 0, oy = dy < 0 ? -dy : 0
    const angle = Math.atan2(dy, dx), ah = 12
    const dash = type==='dashed' ? `${sw*4} ${sw*3}` : undefined
    const labelPx = Math.round(Math.sqrt(dx*dx+dy*dy))
    return (
      <div style={{ position:'absolute', left:L, top:T, zIndex:selected?15:5, overflow:'visible', pointerEvents:'none' }} onContextMenu={onCtx}>
        <svg style={{ position:'absolute', overflow:'visible', pointerEvents:'all', cursor:'move' }} onMouseDown={onDown}>
          <line x1={ox} y1={oy} x2={ox+dx} y2={oy+dy} stroke={sc} strokeWidth={sw} strokeDasharray={dash} />
          {type==='arrow' && <>
            <line x1={ox+dx} y1={oy+dy} x2={ox+dx+Math.cos(angle+2.4)*ah} y2={oy+dy+Math.sin(angle+2.4)*ah} stroke={sc} strokeWidth={sw} />
            <line x1={ox+dx} y1={oy+dy} x2={ox+dx+Math.cos(angle-2.4)*ah} y2={oy+dy+Math.sin(angle-2.4)*ah} stroke={sc} strokeWidth={sw} />
          </>}
          {type==='measure' && <text x={ox+dx/2} y={oy+dy/2-6} fill={sc} fontSize="10" textAnchor="middle" style={{ userSelect:'none' }}>{labelPx}px</text>}
        </svg>
        {selected && <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDelete()}}
          className="absolute flex items-center justify-center w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px]"
          style={{ top:-10, right:-10, zIndex:3 }}>✕</button>}
      </div>
    )
  }

  // Polyline
  if (type==='polyline') {
    const pts = (ann.points||[]).map(p=>`${p.xf*pageW*zoom},${p.yf*pageH*zoom}`).join(' ')
    return (
      <div style={{ position:'absolute', left:0, top:0, width:pageW*zoom, height:pageH*zoom, zIndex:selected?15:5, pointerEvents:'none' }} onContextMenu={onCtx}>
        <svg style={{ position:'absolute', top:0, left:0, overflow:'visible', pointerEvents:'all', cursor:'move', width:'100%', height:'100%' }} onMouseDown={onDown}>
          <polyline points={pts} fill="none" stroke={sc} strokeWidth={sw} />
        </svg>
        {selected && <button onMouseDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onDelete()}}
          className="absolute flex items-center justify-center w-5 h-5 bg-red-500 hover:bg-red-600 text-white rounded-full text-[10px]"
          style={{ top:ann.y*pageH*zoom-10, left:ann.x*pageW*zoom+10, zIndex:3 }}>✕</button>}
      </div>
    )
  }

  // Draw / Image / Signature / Hlpen
  if (['draw','image','signature','hlpen'].includes(type)) return (
    <div style={{ ...base, opacity:ann.opacity??1 }} onMouseDown={onDown} onContextMenu={onCtx}>
      {ann.imageUrl && <img src={ann.imageUrl} alt="" className="w-full h-full object-contain pointer-events-none select-none" draggable={false} />}
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  // Text / Typewriter
  if (type==='text' || type==='typewriter') {
    const isTypew = type==='typewriter'
    return (
      <div style={{ ...base, minWidth:60, minHeight:18 }} onMouseDown={onDown} onContextMenu={onCtx}>
        <textarea defaultValue={ann.text} key={ann.id}
          onChange={e=>onChange({text:e.target.value})}
          onMouseDown={e=>e.stopPropagation()}
          placeholder="Type here…"
          style={{ width:'100%', height:'100%', fontSize:`${(ann.fontSize||14)*zoom*0.85}px`,
            fontFamily:ann.fontFamily||'Helvetica,Arial,sans-serif', color:ann.fontColor||'#111827',
            fontWeight:ann.bold?'bold':'normal', fontStyle:ann.italic?'italic':'normal',
            textDecoration:ann.underlineText?'underline':undefined, textAlign:ann.textAlign||'left',
            background:isTypew?'transparent':'rgba(255,255,255,0.9)',
            border:selected?(isTypew?'1px dashed #93c5fd':'2px solid #3b82f6'):(isTypew?'none':'1px dashed #93c5fd'),
            borderRadius:3, resize:'none', padding:'2px 4px', cursor:'text', outline:'none', overflow:'hidden' }} />
        {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
      </div>
    )
  }

  // Note
  if (type==='note') return (
    <div style={{ ...base, background:ann.fillColor||'#fef9c3', border:'1px solid #d97706', borderRadius:3, boxShadow:'2px 2px 6px rgba(0,0,0,0.18)' }} onMouseDown={onDown} onContextMenu={onCtx}>
      <div style={{ height:`${14*zoom}px`, background:'rgba(234,179,8,0.35)', borderRadius:'2px 2px 0 0', display:'flex', alignItems:'center', padding:'0 4px', userSelect:'none' }}>
        <span style={{ fontSize:`${9*zoom}px` }}>📝</span>
      </div>
      <textarea defaultValue={ann.text} key={ann.id}
        onChange={e=>onChange({text:e.target.value})}
        onMouseDown={e=>e.stopPropagation()}
        style={{ width:'100%', height:`calc(100% - ${14*zoom}px)`, fontSize:`${(ann.fontSize||11)*zoom*0.85}px`, color:ann.fontColor||'#78350f', background:'transparent', border:'none', resize:'none', padding:'2px 4px', cursor:'text', outline:'none' }} />
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  // Callout
  if (type==='callout') return (
    <div style={{ ...base, minWidth:80, minHeight:30 }} onMouseDown={onDown} onContextMenu={onCtx}>
      <div style={{ position:'absolute', top:0, left:0, width:W, height:H, background:'rgba(255,255,255,0.96)', border:`2px solid ${ann.strokeColor||'#3b82f6'}`, borderRadius:6, padding:4 }}>
        <textarea defaultValue={ann.text} key={ann.id}
          onChange={e=>onChange({text:e.target.value})}
          onMouseDown={e=>e.stopPropagation()}
          placeholder="Callout text…"
          style={{ width:'100%', height:'100%', fontSize:`${(ann.fontSize||13)*zoom*0.85}px`, color:ann.fontColor||'#111827', background:'transparent', border:'none', resize:'none', outline:'none', overflow:'hidden' }} />
      </div>
      <div style={{ position:'absolute', bottom:-9, left:18, width:0, height:0, borderLeft:'9px solid transparent', borderRight:'9px solid transparent', borderTop:`9px solid ${ann.strokeColor||'#3b82f6'}` }} />
      {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
    </div>
  )

  // Stamp
  if (type==='stamp') {
    const color = ann.stampColor || STAMP_COLS.red
    return (
      <div style={{ ...base, border:`3px solid ${color}`, borderRadius:4, display:'flex', alignItems:'center', justifyContent:'center',
        background:`${color}18`, opacity:ann.opacity??0.85, transform:ann.rotation?`rotate(${ann.rotation}deg)`:undefined }}
        onMouseDown={onDown} onContextMenu={onCtx}>
        <span style={{ color, fontWeight:900, fontSize:`${Math.min(W/(ann.stampText?.length||8)*1.15, H*0.52)}px`, fontFamily:'Arial,sans-serif', letterSpacing:'0.08em', userSelect:'none' }}>
          {ann.stampText||'APPROVED'}
        </span>
        {selected && <ResizeHandles onResize={onResizeStart} onDelete={onDelete} />}
      </div>
    )
  }

  return null
}

// ── Draw Preview ──────────────────────────────────────────────────────────────
function DrawPreview({ tool, start, end, pageW, pageH, zoom, strokeColor, fillColor, strokeWidth, highlightColor, opacity, polyPts }) {
  if (!start || !end) return null
  const x = Math.min(start.xf, end.xf) * pageW * zoom
  const y = Math.min(start.yf, end.yf) * pageH * zoom
  const w = Math.abs(end.xf - start.xf) * pageW * zoom
  const h = Math.abs(end.yf - start.yf) * pageH * zoom
  const base = { position:'absolute', left:x, top:y, width:w, height:h, zIndex:18, pointerEvents:'none' }
  const sc = strokeColor || '#1e3a8a', sw = strokeWidth || 2

  if (tool==='highlight'||tool==='underline'||tool==='strikethrough'||tool==='whiteout'||tool==='redact') {
    const bg = tool==='whiteout'?'#ffffff':tool==='redact'?'#000000':tool==='underline'?'transparent':highlightColor
    const op = tool==='underline'||tool==='strikethrough'?0.9:tool==='whiteout'||tool==='redact'?0.8:opacity
    const extra = tool==='underline'?{borderBottom:`${sw+1}px solid ${highlightColor}`}:tool==='strikethrough'?{}:{}
    return (
      <div style={{ ...base, background:bg, opacity:op, ...extra }}>
        {tool==='strikethrough' && <div style={{ position:'absolute', top:'50%', left:0, right:0, height:sw+1, background:highlightColor, transform:'translateY(-50%)' }} />}
      </div>
    )
  }
  if (tool==='rect')   return <div style={{ ...base, border:`${sw}px solid ${sc}`, background:fillColor }} />
  if (tool==='circle') return <div style={{ ...base, border:`${sw}px solid ${sc}`, background:fillColor, borderRadius:'50%' }} />
  if (['triangle','diamond','star','cloud','cross','checkmark'].includes(tool)) {
    let shape = null
    if (tool==='triangle') shape = <polygon points={`${w/2},${sw} ${sw},${h-sw} ${w-sw},${h-sw}`} fill={fillColor} stroke={sc} strokeWidth={sw} />
    if (tool==='diamond')  shape = <polygon points={`${w/2},${sw} ${w-sw},${h/2} ${w/2},${h-sw} ${sw},${h/2}`} fill={fillColor} stroke={sc} strokeWidth={sw} />
    if (tool==='star')     shape = <polygon points={starPts(w/2,h/2,Math.min(w,h)/2-sw,Math.min(w,h)/4.2)} fill={fillColor} stroke={sc} strokeWidth={sw} />
    if (tool==='cloud') shape = <>
      <rect x={sw} y={h*0.38} width={w-sw*2} height={h*0.56} rx={Math.min(w,h)*0.15} fill={fillColor} stroke={sc} strokeWidth={sw} />
      <ellipse cx={w*0.25} cy={h*0.41} rx={w*0.17} ry={h*0.15} fill={fillColor} stroke={sc} strokeWidth={sw} />
      <ellipse cx={w*0.5}  cy={h*0.25} rx={w*0.2}  ry={h*0.2}  fill={fillColor} stroke={sc} strokeWidth={sw} />
      <ellipse cx={w*0.75} cy={h*0.41} rx={w*0.17} ry={h*0.15} fill={fillColor} stroke={sc} strokeWidth={sw} />
    </>
    if (tool==='cross') shape = <>
      <line x1={sw} y1={sw} x2={w-sw} y2={h-sw} stroke={sc} strokeWidth={sw*1.5} strokeLinecap="round" />
      <line x1={w-sw} y1={sw} x2={sw} y2={h-sw} stroke={sc} strokeWidth={sw*1.5} strokeLinecap="round" />
    </>
    if (tool==='checkmark') shape = <polyline points={`${sw*2},${h/2} ${w*0.38},${h-sw*2} ${w-sw*2},${sw*2}`} fill="none" stroke={sc} strokeWidth={sw*1.5} strokeLinecap="round" strokeLinejoin="round" />
    return (
      <div style={{ ...base }}>
        <svg width={w} height={h} style={{ position:'absolute', overflow:'visible' }}>{shape}</svg>
      </div>
    )
  }
  if (['line','arrow','dashed','measure'].includes(tool)) {
    const dx=(end.xf-start.xf)*pageW*zoom, dy=(end.yf-start.yf)*pageH*zoom
    const ox=dx<0?-dx:0, oy=dy<0?-dy:0
    const angle=Math.atan2(dy,dx), ah=12
    const dash=tool==='dashed'?`${sw*4} ${sw*3}`:undefined
    return (
      <div style={{ position:'absolute', left:start.xf*pageW*zoom, top:start.yf*pageH*zoom, zIndex:18, overflow:'visible', pointerEvents:'none' }}>
        <svg style={{ overflow:'visible' }}>
          <line x1={ox} y1={oy} x2={ox+dx} y2={oy+dy} stroke={sc} strokeWidth={sw} strokeDasharray={dash} />
          {tool==='arrow' && <>
            <line x1={ox+dx} y1={oy+dy} x2={ox+dx+Math.cos(angle+2.4)*ah} y2={oy+dy+Math.sin(angle+2.4)*ah} stroke={sc} strokeWidth={sw} />
            <line x1={ox+dx} y1={oy+dy} x2={ox+dx+Math.cos(angle-2.4)*ah} y2={oy+dy+Math.sin(angle-2.4)*ah} stroke={sc} strokeWidth={sw} />
          </>}
        </svg>
      </div>
    )
  }
  if (tool==='polyline' && polyPts && polyPts.length > 0) {
    const allPts = [...polyPts, end]
    const pts = allPts.map(p=>`${p.xf*pageW*zoom},${p.yf*pageH*zoom}`).join(' ')
    return (
      <div style={{ position:'absolute', left:0, top:0, zIndex:18, overflow:'visible', pointerEvents:'none' }}>
        <svg style={{ overflow:'visible' }}>
          <polyline points={pts} fill="none" stroke={sc} strokeWidth={sw} />
        </svg>
      </div>
    )
  }
  return null
}

// ── Embed Annotation (pdf-lib) ────────────────────────────────────────────────
async function embedAnnotation(page, ann, W, H, font, fontB, pdfDoc) {
  const xPt = ann.x * W, yBL = (1 - ann.y - ann.h) * H
  const wPt = ann.w * W,  hPt = ann.h * H
  const sc  = hex2rgb(ann.strokeColor || '#000000')
  const fc  = hex2rgb(ann.fillColor && ann.fillColor !== 'transparent' ? ann.fillColor : '#ffffff')
  const { type } = ann

  if (type==='text' || type==='typewriter' || type==='note') {
    const f    = ann.bold ? fontB : font
    const size = ann.fontSize || (type==='note'?11:14)
    const tc   = hex2rgb(ann.fontColor || (type==='note'?'#78350f':'#000000'))
    if (type==='note') {
      const nc = hex2rgb(ann.fillColor||'#fef9c3')
      page.drawRectangle({ x:xPt, y:yBL, width:wPt, height:hPt, color:rgb(nc.r,nc.g,nc.b), borderColor:rgb(0.85,0.6,0.1), borderWidth:1 })
    }
    const lines=(ann.text||'').split('\n'); let ly=yBL+hPt-size*1.4
    for (const line of lines) {
      if (!line.trim()) { ly-=size*1.2; continue }
      page.drawText(line, { x:xPt+3, y:Math.max(2,ly), size, font:f, color:rgb(tc.r,tc.g,tc.b), maxWidth:wPt-6 })
      ly-=size*1.4; if (ly<yBL) break
    }
  } else if (type==='callout') {
    page.drawRectangle({ x:xPt, y:yBL, width:wPt, height:hPt, borderColor:rgb(sc.r,sc.g,sc.b), borderWidth:2, color:rgb(1,1,1) })
    const size = ann.fontSize || 13
    const tc   = hex2rgb(ann.fontColor||'#000000')
    const lines=(ann.text||'').split('\n'); let ly=yBL+hPt-size*1.4
    for (const line of lines) {
      if (!line.trim()) { ly-=size*1.2; continue }
      page.drawText(line, { x:xPt+4, y:Math.max(yBL+2,ly), size, font, color:rgb(tc.r,tc.g,tc.b), maxWidth:wPt-8 })
      ly-=size*1.4; if (ly<yBL) break
    }
  } else if (type==='stamp') {
    const c = hex2rgb(ann.stampColor||STAMP_COLS.red)
    page.drawRectangle({ x:xPt, y:yBL, width:wPt, height:hPt, borderColor:rgb(c.r,c.g,c.b), borderWidth:3, color:rgb(1,1,1), opacity:0.12 })
    const text = ann.stampText||'APPROVED'
    const sz   = Math.max(6, Math.min(wPt/(text.length*0.65), hPt*0.52))
    page.drawText(text, { x:xPt+4, y:yBL+hPt/2-sz/2, size:sz, font:fontB, color:rgb(c.r,c.g,c.b) })
  } else if (type==='highlight') {
    const c = hex2rgb(ann.color||'#fef08a')
    page.drawRectangle({ x:xPt, y:yBL, width:wPt, height:hPt, color:rgb(c.r,c.g,c.b), opacity:ann.opacity??0.5 })
  } else if (type==='underline') {
    const c = hex2rgb(ann.color||'#1d4ed8')
    page.drawLine({ start:{x:xPt,y:yBL+(ann.strokeWidth||2)}, end:{x:xPt+wPt,y:yBL+(ann.strokeWidth||2)}, thickness:(ann.strokeWidth||2)+1, color:rgb(c.r,c.g,c.b) })
  } else if (type==='strikethrough') {
    const c = hex2rgb(ann.color||'#ef4444')
    const yM = yBL+hPt/2
    page.drawLine({ start:{x:xPt,y:yM}, end:{x:xPt+wPt,y:yM}, thickness:(ann.strokeWidth||2)+1, color:rgb(c.r,c.g,c.b) })
  } else if (type==='rect') {
    const opts = { x:xPt, y:yBL, width:wPt, height:hPt, borderColor:rgb(sc.r,sc.g,sc.b), borderWidth:ann.strokeWidth||2 }
    if (ann.fillColor && ann.fillColor!=='transparent') opts.color=rgb(fc.r,fc.g,fc.b)
    page.drawRectangle(opts)
  } else if (type==='circle') {
    const opts = { x:xPt+wPt/2, y:yBL+hPt/2, xScale:wPt/2, yScale:hPt/2, borderColor:rgb(sc.r,sc.g,sc.b), borderWidth:ann.strokeWidth||2 }
    if (ann.fillColor && ann.fillColor!=='transparent') opts.color=rgb(fc.r,fc.g,fc.b)
    page.drawEllipse(opts)
  } else if (type==='triangle') {
    const cx=xPt+wPt/2
    page.drawLine({ start:{x:cx,y:yBL+hPt}, end:{x:xPt,y:yBL}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
    page.drawLine({ start:{x:xPt,y:yBL}, end:{x:xPt+wPt,y:yBL}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
    page.drawLine({ start:{x:xPt+wPt,y:yBL}, end:{x:cx,y:yBL+hPt}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
  } else if (type==='diamond') {
    const cx=xPt+wPt/2, cy=yBL+hPt/2
    page.drawLine({ start:{x:cx,y:yBL}, end:{x:xPt,y:cy}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
    page.drawLine({ start:{x:xPt,y:cy}, end:{x:cx,y:yBL+hPt}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
    page.drawLine({ start:{x:cx,y:yBL+hPt}, end:{x:xPt+wPt,y:cy}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
    page.drawLine({ start:{x:xPt+wPt,y:cy}, end:{x:cx,y:yBL}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
  } else if (type==='star' || type==='cloud') {
    const opts = { x:xPt+wPt/2, y:yBL+hPt/2, xScale:wPt/2, yScale:hPt/2, borderColor:rgb(sc.r,sc.g,sc.b), borderWidth:ann.strokeWidth||2 }
    page.drawEllipse(opts)
  } else if (type==='cross') {
    const t = (ann.strokeWidth||2)*1.5
    page.drawLine({ start:{x:xPt,y:yBL}, end:{x:xPt+wPt,y:yBL+hPt}, thickness:t, color:rgb(sc.r,sc.g,sc.b) })
    page.drawLine({ start:{x:xPt+wPt,y:yBL}, end:{x:xPt,y:yBL+hPt}, thickness:t, color:rgb(sc.r,sc.g,sc.b) })
  } else if (type==='checkmark') {
    const t = (ann.strokeWidth||2)*1.5
    page.drawLine({ start:{x:xPt,y:yBL+hPt*0.5}, end:{x:xPt+wPt*0.38,y:yBL}, thickness:t, color:rgb(sc.r,sc.g,sc.b) })
    page.drawLine({ start:{x:xPt+wPt*0.38,y:yBL}, end:{x:xPt+wPt,y:yBL+hPt}, thickness:t, color:rgb(sc.r,sc.g,sc.b) })
  } else if (type==='line' || type==='arrow' || type==='measure') {
    const x1=ann.x*W, y1=(1-ann.y)*H
    const x2=(ann.x2f??(ann.x+ann.w))*W, y2=(1-(ann.y2f??(ann.y+ann.h)))*H
    page.drawLine({ start:{x:x1,y:y1}, end:{x:x2,y:y2}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
    if (type==='arrow') {
      const angle=Math.atan2(y2-y1,x2-x1), ah=14
      page.drawLine({ start:{x:x2,y:y2}, end:{x:x2+Math.cos(angle+2.4)*ah,y:y2+Math.sin(angle+2.4)*ah}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
      page.drawLine({ start:{x:x2,y:y2}, end:{x:x2+Math.cos(angle-2.4)*ah,y:y2+Math.sin(angle-2.4)*ah}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
    }
    if (type==='measure') {
      const lx=(x1+x2)/2, ly=(y1+y2)/2
      const dist=Math.round(Math.sqrt((x2-x1)**2+(y2-y1)**2))
      page.drawText(`${dist}px`, { x:lx-15, y:ly+4, size:9, font, color:rgb(sc.r,sc.g,sc.b) })
    }
  } else if (type==='dashed') {
    const x1=ann.x*W, y1=(1-ann.y)*H
    const x2=(ann.x2f??(ann.x+ann.w))*W, y2=(1-(ann.y2f??(ann.y+ann.h)))*H
    const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy)
    const ux=dx/len,uy=dy/len,dashL=8,gapL=5
    let dist=0
    while(dist<len) {
      const d1=Math.min(dist+dashL,len)
      page.drawLine({ start:{x:x1+ux*dist,y:y1+uy*dist}, end:{x:x1+ux*d1,y:y1+uy*d1}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
      dist+=dashL+gapL
    }
  } else if (type==='polyline') {
    const pts=ann.points||[]
    for (let i=0;i<pts.length-1;i++) {
      page.drawLine({ start:{x:pts[i].xf*W,y:(1-pts[i].yf)*H}, end:{x:pts[i+1].xf*W,y:(1-pts[i+1].yf)*H}, thickness:ann.strokeWidth||2, color:rgb(sc.r,sc.g,sc.b) })
    }
  } else if (type==='whiteout') {
    page.drawRectangle({ x:xPt, y:yBL, width:wPt, height:hPt, color:rgb(1,1,1) })
  } else if (type==='redact') {
    page.drawRectangle({ x:xPt, y:yBL, width:wPt, height:hPt, color:rgb(0,0,0) })
  } else if ((type==='draw'||type==='hlpen'||type==='image'||type==='signature') && ann.imageUrl) {
    const b64 = ann.imageUrl.split(',')[1]
    const bytes = Uint8Array.from(atob(b64), c=>c.charCodeAt(0))
    const img = ann.imageUrl.startsWith('data:image/png') ? await pdfDoc.embedPng(bytes) : await pdfDoc.embedJpg(bytes)
    page.drawImage(img, { x:xPt, y:yBL, width:Math.max(1,wPt), height:Math.max(1,hPt) })
  }
}

// ── Apply Global Download Settings ────────────────────────────────────────────
async function applyGlobalSettings(doc, font, wm, hf, pgNum) {
  const pages = doc.getPages()
  if (wm.enabled && wm.text) {
    for (const page of pages) {
      const { width:W, height:H } = page.getSize()
      const c = hex2rgb(wm.color||'#888888')
      try {
        page.drawText(wm.text, { x:W/2-(wm.text.length*wm.size*0.28), y:H/2, size:wm.size||60,
          font, color:rgb(c.r,c.g,c.b), opacity:wm.opacity??0.25, rotate:degrees(wm.angle??-45) })
      } catch {}
    }
  }
  if (pgNum.enabled) {
    pages.forEach((page, i) => {
      const { width:W } = page.getSize()
      const num = String(i + (pgNum.start||1))
      const pos = pgNum.pos||'bottom-center'
      const x = pos.includes('center') ? W/2-8 : pos.includes('left') ? 30 : W-30
      const y = pos.includes('top') ? (page.getSize().height - 28) : 15
      try { page.drawText(num, { x, y, size:pgNum.size||12, font, color:rgb(0,0,0) }) } catch {}
    })
  }
  if (hf.hdrOn && hf.hdrText) {
    pages.forEach(page => {
      const { width:W, height:H } = page.getSize()
      try { page.drawText(hf.hdrText, { x:40, y:H-26, size:10, font, color:rgb(0.3,0.3,0.3) }) } catch {}
    })
  }
  if (hf.ftrOn && hf.ftrText) {
    pages.forEach(page => {
      try { page.drawText(hf.ftrText, { x:40, y:14, size:10, font, color:rgb(0.3,0.3,0.3) }) } catch {}
    })
  }
}

// ── Main Editor Component ─────────────────────────────────────────────────────
function PdfEditorTool({ initialBytes = null, initialFileName = '', openNewTabOnUpload = false, fullScreen = false }) {
  // File
  const [pdfFile, setPdfFile]             = useState(null)
  const [pdfBytes, setPdfBytes]           = useState(null)
  const [pdfjsDoc, setPdfjsDoc]           = useState(null)
  const [pageDims, setPageDims]           = useState({})
  const [pageOrder, setPageOrder]         = useState([])
  const [pageRotations, setPageRotations] = useState({})
  const [phase, setPhase]                 = useState('idle')

  // View
  const [zoom, setZoom]               = useState(1.0)
  const [currentPage, setCurrentPage] = useState(0)
  const [activeTool, setActiveTool]   = useState(null)
  const [activeTab, setActiveTab]     = useState('home')
  const [viewMode, setViewMode]       = useState('continuous')
  const [darkCanvas, setDarkCanvas]   = useState(false)
  const [cursorPos, setCursorPos]     = useState({ x:0, y:0 })

  // Tool properties
  const [fontColor, setFontColor]           = useState('#111827')
  const [fontSize, setFontSize]             = useState(14)
  const [fontFamily, setFontFamily]         = useState('Helvetica')
  const [textAlign, setTextAlign]           = useState('left')
  const [bold, setBold]                     = useState(false)
  const [italic, setItalic]                 = useState(false)
  const [underlineText, setUnderlineText]   = useState(false)
  const [strokeColor, setStrokeColor]       = useState('#1e3a8a')
  const [fillColor, setFillColor]           = useState('#ffffff')
  const [hasFill, setHasFill]               = useState(false)
  const [strokeWidth, setStrokeWidth]       = useState(2)
  const [highlightColor, setHighlightColor] = useState('#fef08a')
  const [hlOpacity, setHlOpacity]           = useState(0.5)
  const [drawOpacity, setDrawOpacity]       = useState(1.0)
  const [eraserSize, setEraserSize]         = useState(20)
  const [stampType, setStampType]           = useState('APPROVED')
  const [stampColorKey, setStampColorKey]   = useState('red')
  const [stampOpacity, setStampOpacity]     = useState(0.85)
  const [stampRotation, setStampRotation]   = useState(0)

  // Annotations
  const [annotations, setAnnotations] = useState({})
  const [selectedId, setSelectedId]   = useState(null)
  const [copiedAnn, setCopiedAnn]     = useState(null)
  const [past, setPast]               = useState([])
  const [future, setFuture]           = useState([])

  // Drawing
  const [isDrawing, setIsDrawing] = useState(false)
  const [drawPage, setDrawPage]   = useState(null)
  const [drawStart, setDrawStart] = useState(null)
  const [drawEnd, setDrawEnd]     = useState(null)
  const [polyPts, setPolyPts]     = useState([])

  // Download settings
  const [downloadName, setDownloadName] = useState('')
  const [downloadOpen, setDownloadOpen] = useState(false)
  const [dlRangeOpen, setDlRangeOpen]   = useState(false)
  const [dlFrom, setDlFrom]             = useState(1)
  const [dlTo, setDlTo]                 = useState(1)

  // Watermark
  const [wm, setWmState] = useState({ enabled:false, text:'WATERMARK', opacity:0.25, angle:-45, color:'#888888', size:60, pages:'all' })
  const setWm = patch => setWmState(s => ({ ...s, ...patch }))
  const [wmOpen, setWmOpen] = useState(false)

  // Header/Footer
  const [hf, setHfState] = useState({ hdrOn:false, hdrText:'', ftrOn:false, ftrText:'' })
  const setHf = patch => setHfState(s => ({ ...s, ...patch }))
  const [hfOpen, setHfOpen] = useState(false)

  // Password
  const [pwd, setPwdState] = useState({ enabled:false, pwd:'', confirm:'' })
  const setPwd = patch => setPwdState(s => ({ ...s, ...patch }))
  const [pwdOpen, setPwdOpen] = useState(false)

  // Page numbers
  const [pgNum, setPgNumState] = useState({ enabled:false, pos:'bottom-center', size:12, start:1 })
  const setPgNum = patch => setPgNumState(s => ({ ...s, ...patch }))
  const [showPgNumPanel, setShowPgNumPanel] = useState(false)

  // Strip metadata
  const [stripMeta, setStripMeta] = useState(false)

  // Context menu
  const [ctxMenu, setCtxMenu] = useState(null)

  // Overlays
  const [sigOpen, setSigOpen]       = useState(false)
  const [pendingSig, setPendingSig] = useState(null)

  // Extract text
  const [extractOpen, setExtractOpen]     = useState(false)
  const [extractedText, setExtractedText] = useState('')
  const [extracting, setExtracting]       = useState(false)

  // Upload state — new-tab flow
  const [uploadError,  setUploadError]  = useState(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [popupBlocked, setPopupBlocked] = useState(false)
  const [pendingUrl,   setPendingUrl]   = useState(null)

  // Refs
  const canvasRefs    = useRef({})
  const thumbRefs     = useRef({})
  const drawRefs      = useRef({})
  const pageElRefs    = useRef({})
  const dragRef       = useRef(null)
  const resizeRef     = useRef(null)
  const imageInputRef = useRef(null)
  const fromFileRef   = useRef(null)
  const pendingImg    = useRef(null)
  const centerRef     = useRef(null)
  const downloadRef   = useRef(null)
  const initLoadDone  = useRef(false)

  // Close menus on outside click
  useEffect(() => {
    if (!downloadOpen && !ctxMenu) return
    const h = e => {
      if (downloadRef.current && !downloadRef.current.contains(e.target)) setDownloadOpen(false)
      setCtxMenu(null)
    }
    document.addEventListener('mousedown', h)
    return () => document.removeEventListener('mousedown', h)
  }, [downloadOpen, ctxMenu])

  // Auto-load bytes when mounted as standalone (new-tab) editor
  useEffect(() => {
    if (initialBytes?.length && !initLoadDone.current) {
      initLoadDone.current = true
      loadPdfFromBytes(initialBytes, initialFileName)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Load PDF ────────────────────────────────────────────────────────────────
  async function loadPdfFromBytes(buf, fileName) {
    setPhase('loading')
    try {
      const doc = await pdfjsLib.getDocument({ data: buf.slice(0) }).promise
      const dims = {}
      for (let i = 0; i < doc.numPages; i++) {
        const pg = await doc.getPage(i + 1)
        const vp = pg.getViewport({ scale: 1 })
        dims[i] = { width: vp.width, height: vp.height }
      }
      setPdfBytes(buf); setPdfjsDoc(doc); setPageDims(dims)
      setPageOrder(Array.from({ length: doc.numPages }, (_, i) => i))
      setPageRotations({}); setAnnotations({})
      setPast([]); setFuture([])
      setCurrentPage(0)
      setDownloadName((fileName || 'document').replace(/\.pdf$/i, '') + '-edited')
      setDlTo(doc.numPages)
      setPhase('ready')
    } catch (err) {
      console.error('[pdf-editor] load error:', err); setPhase('idle')
    }
  }

  async function handleFile(file) {
    setUploadError(null); setPopupBlocked(false); setPendingUrl(null)

    if (!isPdfFile(file)) {
      setUploadError('Please upload a valid PDF file.')
      return
    }
    const sizeMB = file.size / (1024 * 1024)
    if (sizeMB > MAX_PDF_SIZE_MB) {
      setUploadError(`File too large (${sizeMB.toFixed(1)} MB). Maximum is ${MAX_PDF_SIZE_MB} MB. Try compressing your PDF first.`)
      return
    }

    // In standalone (fullScreen) mode — load in same tab, no new-tab flow
    if (fullScreen) {
      const ab = await file.arrayBuffer()
      await loadPdfFromBytes(new Uint8Array(ab), file.name)
      return
    }

    // Main page — store + open new tab
    setIsProcessing(true)
    try {
      const arrayBuffer = await file.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)

      // Unique session key
      const sessionKey = `awe_pdf_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

      // IndexedDB (not localStorage) — stores the raw bytes directly (no
      // base64 bloat) and its quota is far above localStorage's ~5-10MB
      // per-origin cap, which a base64'd file anywhere near MAX_PDF_SIZE_MB
      // would otherwise exceed. Shared across tabs of the same origin, same
      // as localStorage was, so the handoff to the new tab still works.
      await evictOldPdfSessions().catch(() => {})
      await savePdfSession(sessionKey, { name: file.name, bytes, createdAt: Date.now() })

      const editorUrl = `/tools/pdf-editor/editor?session=${sessionKey}`
      const newTab    = window.open(editorUrl, '_blank')

      if (!newTab || newTab.closed || typeof newTab.closed === 'undefined') {
        // Popup blocked — surface a manual link the user can click
        setPendingUrl(editorUrl)
        setPopupBlocked(true)
      }
    } catch (err) {
      console.error('[AWE PDF] Upload error:', err)
      setUploadError('Failed to process PDF. Try a smaller file or a different browser.')
    } finally {
      setIsProcessing(false)
    }
  }

  // ── Insert from File ────────────────────────────────────────────────────────
  async function onFromFile(e) {
    const file = e.target.files[0]; if (!file) return; e.target.value = ''
    try {
      const newAb  = await file.arrayBuffer()
      const srcDoc = await PDFDocument.load(new Uint8Array(newAb), { ignoreEncryption:true })
      const mainDoc= await PDFDocument.load(pdfBytes, { ignoreEncryption:true })
      const orig   = mainDoc.getPageCount()
      const numNew = srcDoc.getPageCount()
      const copied = await mainDoc.copyPages(srcDoc, [...Array(numNew).keys()])
      copied.forEach(p => mainDoc.addPage(p))
      const newBytes = await mainDoc.save()
      const newDoc   = await pdfjsLib.getDocument({ data: new Uint8Array(newBytes) }).promise
      const newDims  = { ...pageDims }
      for (let i = orig; i < orig + numNew; i++) {
        const pg = await newDoc.getPage(i + 1)
        const vp = pg.getViewport({ scale: 1 })
        newDims[i] = { width: vp.width, height: vp.height }
      }
      const newIndices = Array.from({ length: numNew }, (_, i) => orig + i)
      const newOrder   = [...pageOrder]
      newOrder.splice(currentPage + 1, 0, ...newIndices)
      setPdfBytes(newBytes); setPdfjsDoc(newDoc); setPageDims(newDims); setPageOrder(newOrder)
    } catch (err) { console.error('[pdf-editor] from-file error', err) }
  }

  // ── Render pages / thumbs ───────────────────────────────────────────────────
  const renderPage = useCallback(async (pi) => {
    const canvas = canvasRefs.current[pi]
    if (!canvas || !pdfjsDoc) return
    if (pi < 0) {
      const dim = pageDims[pi] || { width:595, height:842 }
      canvas.width = Math.round(dim.width*zoom); canvas.height = Math.round(dim.height*zoom)
      const ctx = canvas.getContext('2d'); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height)
      return
    }
    try {
      const pg = await pdfjsDoc.getPage(pi + 1)
      const vp = pg.getViewport({ scale: zoom, rotation: pageRotations[pi]||0 })
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height)
      const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height)
      await pg.render({ canvasContext: ctx, viewport: vp }).promise
    } catch {}
  }, [pdfjsDoc, zoom, pageRotations, pageDims])

  const renderThumb = useCallback(async (pi) => {
    const canvas = thumbRefs.current[pi]
    if (!canvas || !pdfjsDoc) return
    if (pi < 0) {
      const dim = pageDims[pi] || { width:595, height:842 }
      canvas.width = Math.round(dim.width*0.2); canvas.height = Math.round(dim.height*0.2)
      const ctx = canvas.getContext('2d'); ctx.fillStyle='#ffffff'; ctx.fillRect(0,0,canvas.width,canvas.height)
      return
    }
    try {
      const pg = await pdfjsDoc.getPage(pi + 1)
      const vp = pg.getViewport({ scale: 0.2 })
      canvas.width = Math.round(vp.width); canvas.height = Math.round(vp.height)
      await pg.render({ canvasContext: canvas.getContext('2d'), viewport: vp }).promise
    } catch {}
  }, [pdfjsDoc, pageDims])

  useEffect(() => { if (phase==='ready') pageOrder.forEach(pi => renderPage(pi)) }, [phase, pageOrder, zoom, pageRotations, renderPage])
  useEffect(() => { if (phase==='ready') pageOrder.forEach(pi => renderThumb(pi)) }, [phase, pdfjsDoc, pageOrder, renderThumb])

  // ── Undo / Redo ─────────────────────────────────────────────────────────────
  const pushHistory = useCallback((snap) => { setPast(p => [...p.slice(-49), snap]); setFuture([]) }, [])
  const undo = useCallback(() => {
    setPast(p => {
      if (!p.length) return p
      setFuture(f => [annotations, ...f]); setAnnotations(p[p.length-1]); setSelectedId(null)
      return p.slice(0, -1)
    })
  }, [annotations])
  const redo = useCallback(() => {
    setFuture(f => {
      if (!f.length) return f
      setPast(p => [...p, annotations]); setAnnotations(f[0]); setSelectedId(null)
      return f.slice(1)
    })
  }, [annotations])

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const h = e => {
      const meta = e.ctrlKey || e.metaKey
      const tag  = document.activeElement?.tagName
      if (meta && e.key==='z' && !e.shiftKey) { e.preventDefault(); undo(); return }
      if (meta && (e.key==='y' || (e.key==='z' && e.shiftKey))) { e.preventDefault(); redo(); return }
      if (meta && e.key==='s') { e.preventDefault(); handleDownload(); return }
      if (meta && (e.key==='+'||e.key==='=')) { e.preventDefault(); setZoom(z=>Math.min(3.0,+(z+0.25).toFixed(2))); return }
      if (meta && e.key==='-') { e.preventDefault(); setZoom(z=>Math.max(0.25,+(z-0.25).toFixed(2))); return }
      if (meta && e.key==='0') { e.preventDefault(); setZoom(1.0); return }
      if (meta && e.key==='c' && selectedId) {
        e.preventDefault()
        const a=Object.values(annotations).flat().find(x=>x.id===selectedId); if(a) setCopiedAnn({...a})
        return
      }
      if (meta && e.key==='v' && copiedAnn) {
        e.preventDefault()
        const n={...copiedAnn,id:uid(),x:Math.min(0.9,copiedAnn.x+0.03),y:Math.min(0.9,copiedAnn.y+0.03)}
        pushHistory(annotations)
        setAnnotations(prev=>({...prev,[n.page]:[...(prev[n.page]||[]),n]}))
        setSelectedId(n.id); return
      }
      if (meta && e.key==='d' && selectedId) { e.preventDefault(); duplicateAnn(selectedId); return }
      if (e.key==='Escape') { setDownloadOpen(false); setSelectedId(null); setActiveTool(null); setPolyPts([]); return }
      if ((e.key==='Delete'||e.key==='Backspace') && selectedId && tag!=='INPUT' && tag!=='TEXTAREA') {
        e.preventDefault(); deleteAnn(selectedId); return
      }
      if (e.key==='[' && !meta) { e.preventDefault(); goToPage(currentPage-1); return }
      if (e.key===']' && !meta) { e.preventDefault(); goToPage(currentPage+1); return }
      if (tag!=='INPUT' && tag!=='TEXTAREA' && tag!=='SELECT') {
        const km = { v:'select', h:'hand', t:'text', i:'highlight', u:'underline', d:'draw', e:'eraser', n:'note', a:'arrow', r:'rect', w:'whiteout', s:'stamp' }
        const k = e.key.toLowerCase()
        if (km[k] && !meta) {
          e.preventDefault()
          if (k==='v') setActiveTool(null)
          else setActiveTool(prev=>prev===km[k]?null:km[k])
          return
        }
        if ((e.key==='+'||e.key==='=') && !meta) { e.preventDefault(); setZoom(z=>Math.min(3.0,+(z+0.25).toFixed(2))); return }
        if (e.key==='-' && !meta) { e.preventDefault(); setZoom(z=>Math.max(0.25,+(z-0.25).toFixed(2))); return }
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [undo, redo, selectedId, copiedAnn, annotations, currentPage])

  // ── Annotation Helpers ──────────────────────────────────────────────────────
  function addAnn(pi, ann) { pushHistory(annotations); setAnnotations(prev=>({...prev,[pi]:[...(prev[pi]||[]),ann]})); setSelectedId(ann.id) }
  function updateAnn(pi, id, upd) { setAnnotations(prev=>({...prev,[pi]:(prev[pi]||[]).map(a=>a.id===id?{...a,...upd}:a)})) }
  function deleteAnn(id) { pushHistory(annotations); setAnnotations(prev=>{const n={};for(const[k,arr]of Object.entries(prev))n[k]=arr.filter(a=>a.id!==id);return n}); setSelectedId(null) }
  function duplicateAnn(id) {
    const ann=Object.values(annotations).flat().find(a=>a.id===id); if(!ann) return
    pushHistory(annotations)
    const n={...ann,id:uid(),x:Math.min(0.9,ann.x+0.02),y:Math.min(0.9,ann.y+0.02)}
    setAnnotations(prev=>({...prev,[ann.page]:[...(prev[ann.page]||[]),n]})); setSelectedId(n.id)
  }
  function bringToFront(id) {
    setAnnotations(prev=>{
      const n={}; for(const[k,arr] of Object.entries(prev)){
        const idx=arr.findIndex(a=>a.id===id)
        if(idx>=0){const a=[...arr];const[item]=a.splice(idx,1);a.push(item);n[k]=a} else n[k]=arr
      }; return n
    })
  }
  function sendToBack(id) {
    setAnnotations(prev=>{
      const n={}; for(const[k,arr] of Object.entries(prev)){
        const idx=arr.findIndex(a=>a.id===id)
        if(idx>=0){const a=[...arr];const[item]=a.splice(idx,1);a.unshift(item);n[k]=a} else n[k]=arr
      }; return n
    })
  }

  // ── Tool / Action Selection ─────────────────────────────────────────────────
  const handleToolSelect = useCallback((id) => {
    if (id==='select') setActiveTool(null)
    else setActiveTool(prev => prev===id ? null : id)
  }, [])

  const handleAction = useCallback((act) => {
    switch(act) {
      case 'zoom-in':   setZoom(z=>Math.min(3.0,+(z+0.25).toFixed(2))); break
      case 'zoom-out':  setZoom(z=>Math.max(0.25,+(z-0.25).toFixed(2))); break
      case 'fit-w':     fitToWidth(); break
      case 'fit-p':     fitToPage(); break
      case 'rot-cw':    rotatePage(pageOrder[currentPage],'cw'); break
      case 'rot-ccw':   rotatePage(pageOrder[currentPage],'ccw'); break
      case 'del-page':  deletePage(pageOrder[currentPage]); break
      case 'pg-dup':    duplicatePage(); break
      case 'pg-del':    deletePage(pageOrder[currentPage]); break
      case 'pg-up':     movePageUp(); break
      case 'pg-down':   movePageDown(); break
      case 'pg-ins-before': insertBlankPage('before'); break
      case 'pg-ins-after':  insertBlankPage('after'); break
      case 'pg-extract':    extractCurrentPage(); break
      case 'watermark-open':setWmOpen(true); break
      case 'hf-open':       setHfOpen(true); break
      case 'pwd-open':      setPwdOpen(true); break
      case 'blank-page':    insertBlankPage('after'); break
      case 'from-file':     fromFileRef.current?.click(); break
      case 'page-num':      setShowPgNumPanel(v=>!v); break
      case 'view-single':   setViewMode('single'); break
      case 'view-cont':     setViewMode('continuous'); break
      case 'view-two':      setViewMode('two-page'); break
      case 'dark-mode':     setDarkCanvas(v=>!v); break
      case 'toggle-meta':   setStripMeta(v=>!v); break
      case 'extract-text':  extractAllText(); break
      case 'edit-text-hint':  break  // disabled — button shows tooltip instead
      case 'edit-image-hint': break  // disabled — button shows tooltip instead
      default: break
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageOrder, currentPage, pdfjsDoc])

  // ── Position Fractional Helper ──────────────────────────────────────────────
  function posFrac(e, pi) {
    const el=pageElRefs.current[pi]; if(!el) return {xf:0,yf:0}
    const r=el.getBoundingClientRect()
    const dim=pageDims[pi]||{width:595,height:842}
    return {
      xf:clamp((e.clientX-r.left)*(dim.width*zoom/r.width)/(dim.width*zoom),0,1),
      yf:clamp((e.clientY-r.top)*(dim.height*zoom/r.height)/(dim.height*zoom),0,1),
    }
  }

  // ── Page Interactions ───────────────────────────────────────────────────────
  function onPageDown(e, pi) {
    if (!activeTool || activeTool==='hand') return
    e.stopPropagation()
    const {xf,yf} = posFrac(e,pi)

    if (activeTool==='text'||activeTool==='typewriter') {
      addAnn(pi,{id:uid(),type:activeTool,page:pi,x:xf,y:yf,w:0.25,h:0.05,text:'',fontSize,fontFamily,fontColor,bold,italic,underlineText,textAlign})
      setActiveTool(null)   // one-shot: auto-return to Select after placing
      return
    }
    if (activeTool==='note') {
      addAnn(pi,{id:uid(),type:'note',page:pi,x:xf,y:yf,w:0.2,h:0.15,text:'Click to edit note…',fontSize:11,fontColor:'#78350f',fillColor:'#fef9c3'}); return
    }
    if (activeTool==='callout') {
      addAnn(pi,{id:uid(),type:'callout',page:pi,x:xf,y:yf,w:0.22,h:0.1,text:'',fontSize,fontColor,strokeColor}); return
    }
    if (activeTool==='stamp') {
      addAnn(pi,{id:uid(),type:'stamp',page:pi,x:xf,y:yf,w:0.22,h:0.07,stampText:stampType,stampColor:STAMP_COLS[stampColorKey],opacity:stampOpacity,rotation:stampRotation}); return
    }
    if (activeTool==='image') { pendingImg.current={pi,xf,yf}; imageInputRef.current?.click(); return }
    if (activeTool==='signature') { setPendingSig({pi,xf,yf}); setSigOpen(true); return }

    setIsDrawing(true); setDrawPage(pi); setDrawStart({xf,yf}); setDrawEnd({xf,yf})

    if (['draw','hlpen','eraser'].includes(activeTool)) {
      const dc=drawRefs.current[pi]; if(!dc) return
      const dim=pageDims[pi]||{width:595,height:842}
      dc.width=Math.round(dim.width*zoom); dc.height=Math.round(dim.height*zoom)
      const ctx=dc.getContext('2d'); ctx.clearRect(0,0,dc.width,dc.height)
      if (activeTool==='eraser') {
        ctx.strokeStyle='#ffffff'; ctx.lineWidth=eraserSize; ctx.lineCap='round'; ctx.lineJoin='round'
      } else if (activeTool==='hlpen') {
        ctx.strokeStyle=highlightColor; ctx.lineWidth=strokeWidth*5; ctx.lineCap='round'; ctx.globalAlpha=0.35
      } else {
        ctx.strokeStyle=strokeColor; ctx.lineWidth=strokeWidth; ctx.lineCap='round'; ctx.lineJoin='round'
      }
      const r=pageElRefs.current[pi].getBoundingClientRect()
      const x=(e.clientX-r.left)*(dim.width*zoom/r.width), y=(e.clientY-r.top)*(dim.height*zoom/r.height)
      ctx.beginPath(); ctx.moveTo(x,y); dc._lastX=x; dc._lastY=y
    }
    if (activeTool==='polyline') { setPolyPts([{xf,yf}]) }
  }

  function onPageMove(e, pi) {
    const dim=pageDims[pi]||{width:595,height:842}
    // Update cursor position
    if (pageElRefs.current[pi]) {
      const r=pageElRefs.current[pi].getBoundingClientRect()
      setCursorPos({ x:Math.round((e.clientX-r.left)*(dim.width/r.width)), y:Math.round((e.clientY-r.top)*(dim.height/r.height)) })
    }
    if (!isDrawing || drawPage!==pi) return
    const {xf,yf} = posFrac(e,pi); setDrawEnd({xf,yf})

    if (['draw','hlpen','eraser'].includes(activeTool)) {
      const dc=drawRefs.current[pi]; if(!dc) return
      const r=pageElRefs.current[pi].getBoundingClientRect()
      const x=(e.clientX-r.left)*(dim.width*zoom/r.width), y=(e.clientY-r.top)*(dim.height*zoom/r.height)
      const ctx=dc.getContext('2d')
      ctx.beginPath(); ctx.moveTo(dc._lastX??x,dc._lastY??y); ctx.lineTo(x,y); ctx.stroke()
      dc._lastX=x; dc._lastY=y
    }
    if (activeTool==='polyline') {
      const {xf:nx,yf:ny}=posFrac(e,pi)
      setPolyPts(prev=>{
        const last=prev[prev.length-1]
        if(last&&Math.abs(nx-last.xf)<0.004&&Math.abs(ny-last.yf)<0.004) return prev
        return [...prev,{xf:nx,yf:ny}]
      })
    }
  }

  function onPageUp(e, pi) {
    if (!isDrawing || drawPage!==pi) { setIsDrawing(false); return }
    setIsDrawing(false)
    const s=drawStart, en=drawEnd||drawStart; if(!s) return

    if (['draw','hlpen','eraser'].includes(activeTool)) {
      const dc=drawRefs.current[pi]; if(!dc) return
      const ctx=dc.getContext('2d'); ctx.globalAlpha=1.0
      addAnn(pi,{id:uid(),type:activeTool==='hlpen'?'hlpen':'draw',page:pi,x:0,y:0,w:1,h:1,imageUrl:dc.toDataURL('image/png'),opacity:activeTool==='hlpen'?0.35:drawOpacity})
      dc.getContext('2d').clearRect(0,0,dc.width,dc.height)
      setDrawStart(null); setDrawEnd(null); return
    }

    if (activeTool==='polyline') {
      if(polyPts.length>=2){
        const xs=polyPts.map(p=>p.xf),ys=polyPts.map(p=>p.yf)
        addAnn(pi,{id:uid(),type:'polyline',page:pi,x:Math.min(...xs),y:Math.min(...ys),w:Math.max(...xs)-Math.min(...xs)||0.01,h:Math.max(...ys)-Math.min(...ys)||0.01,points:polyPts,strokeColor,strokeWidth})
      }
      setPolyPts([]); setDrawStart(null); setDrawEnd(null); return
    }

    const xf=Math.min(s.xf,en.xf),yf=Math.min(s.yf,en.yf)
    const wf=Math.abs(en.xf-s.xf),hf=Math.abs(en.yf-s.yf)
    if(wf<0.004&&hf<0.004){setDrawStart(null);setDrawEnd(null);return}
    const base={id:uid(),page:pi,x:xf,y:yf,w:wf,h:hf}

    if (activeTool==='highlight'||activeTool==='underline'||activeTool==='strikethrough')
      addAnn(pi,{...base,type:activeTool,color:highlightColor,opacity:hlOpacity,strokeWidth})
    else if (activeTool==='whiteout')  addAnn(pi,{...base,type:'whiteout',opacity:1})
    else if (activeTool==='redact')    addAnn(pi,{...base,type:'redact'})
    else if (activeTool==='edit-text') {
      addAnn(pi,{...base,type:'whiteout',opacity:1})
      addAnn(pi,{id:uid(),page:pi,type:'text',x:xf,y:yf,w:wf,h:hf,text:'',fontSize,fontFamily,fontColor,bold,italic,underlineText,textAlign})
      setActiveTool(null)   // one-shot, like the plain Text tool — lets the user click straight into the textarea
    }
    else if (activeTool==='edit-image') {
      addAnn(pi,{...base,type:'whiteout',opacity:1})
      pendingImg.current={pi,xf:s.xf,yf:s.yf,wf,hf}
      imageInputRef.current?.click()
    }
    else if (activeTool==='rect')      addAnn(pi,{...base,type:'rect',strokeColor,fillColor:hasFill?fillColor:'transparent',strokeWidth})
    else if (activeTool==='circle')    addAnn(pi,{...base,type:'circle',strokeColor,fillColor:hasFill?fillColor:'transparent',strokeWidth})
    else if (['triangle','diamond','star','cloud','cross','checkmark'].includes(activeTool))
      addAnn(pi,{...base,type:activeTool,strokeColor,fillColor:hasFill?fillColor:'transparent',strokeWidth})
    else if (activeTool==='line'||activeTool==='arrow'||activeTool==='dashed'||activeTool==='measure')
      addAnn(pi,{...base,type:activeTool,x:s.xf,y:s.yf,w:wf,h:hf,x2f:en.xf,y2f:en.yf,strokeColor,strokeWidth})
    setDrawStart(null); setDrawEnd(null)
  }

  // ── Global Drag / Resize ────────────────────────────────────────────────────
  useEffect(() => {
    const onMove = e => {
      if(dragRef.current) {
        const{id,pi,sx,sy,ox,oy}=dragRef.current
        const dim=pageDims[pi]||{width:595,height:842}
        updateAnn(pi,id,{x:clamp(ox+(e.clientX-sx)/(dim.width*zoom),0,0.98),y:clamp(oy+(e.clientY-sy)/(dim.height*zoom),0,0.98)})
      }
      if(resizeRef.current) {
        const{id,pi,handle,sx,sy,ox,oy,ow,oh}=resizeRef.current
        const dim=pageDims[pi]||{width:595,height:842}
        const dx=(e.clientX-sx)/(dim.width*zoom),dy=(e.clientY-sy)/(dim.height*zoom)
        let nx=ox,ny=oy,nw=ow,nh=oh
        if(handle.includes('e'))nw=Math.max(0.02,ow+dx)
        if(handle.includes('s'))nh=Math.max(0.01,oh+dy)
        if(handle.includes('w')){nx=ox+dx;nw=Math.max(0.02,ow-dx)}
        if(handle.includes('n')){ny=oy+dy;nh=Math.max(0.01,oh-dy)}
        updateAnn(pi,id,{x:nx,y:ny,w:nw,h:nh})
      }
    }
    const onUp=()=>{dragRef.current=null;resizeRef.current=null}
    window.addEventListener('mousemove',onMove); window.addEventListener('mouseup',onUp)
    return()=>{window.removeEventListener('mousemove',onMove);window.removeEventListener('mouseup',onUp)}
  },[pageDims,zoom])

  // ── Image / Signature Insert ────────────────────────────────────────────────
  function onImageSelect(e) {
    const file=e.target.files[0]; if(!file||!pendingImg.current) return
    const reader=new FileReader()
    reader.onload=ev=>{
      const{pi,xf,yf,wf,hf}=pendingImg.current
      addAnn(pi,{id:uid(),type:'image',page:pi,x:xf,y:yf,w:wf??0.22,h:hf??0.18,imageUrl:ev.target.result})
      pendingImg.current=null
    }
    reader.readAsDataURL(file); e.target.value=''
  }
  function onSigInsert(dataUrl) {
    if(!pendingSig) return
    const{pi,xf,yf}=pendingSig
    addAnn(pi,{id:uid(),type:'signature',page:pi,x:xf,y:yf,w:0.28,h:0.09,imageUrl:dataUrl})
    setSigOpen(false); setPendingSig(null)
  }

  // ── Page Operations ─────────────────────────────────────────────────────────
  function rotatePage(pi, dir) { pushHistory(annotations); setPageRotations(prev=>({...prev,[pi]:((prev[pi]||0)+(dir==='cw'?90:270))%360})) }
  function deletePage(pi) {
    if(pageOrder.length<=1) return
    pushHistory(annotations)
    setPageOrder(prev=>prev.filter(i=>i!==pi))
    setAnnotations(prev=>{const n={...prev};delete n[pi];return n})
    setCurrentPage(c=>Math.min(c,pageOrder.length-2))
  }
  function insertBlankPage(position) {
    const newPi=-(Date.now())
    const refDim=pageDims[pageOrder[0]]||{width:595,height:842}
    pushHistory(annotations)
    setPageDims(prev=>({...prev,[newPi]:refDim}))
    const idx=Math.max(0,currentPage)
    const newOrder=[...pageOrder]
    newOrder.splice(position==='before'?idx:idx+1,0,newPi)
    setPageOrder(newOrder)
  }
  function duplicatePage() {
    pushHistory(annotations)
    const pi=pageOrder[currentPage]
    const newOrder=[...pageOrder]
    newOrder.splice(currentPage+1,0,pi)
    setPageOrder(newOrder)
  }
  function movePageUp() {
    if(currentPage<=0) return
    pushHistory(annotations)
    const newOrder=[...pageOrder]
    ;[newOrder[currentPage-1],newOrder[currentPage]]=[newOrder[currentPage],newOrder[currentPage-1]]
    setPageOrder(newOrder); setCurrentPage(c=>c-1)
  }
  function movePageDown() {
    if(currentPage>=pageOrder.length-1) return
    pushHistory(annotations)
    const newOrder=[...pageOrder]
    ;[newOrder[currentPage],newOrder[currentPage+1]]=[newOrder[currentPage+1],newOrder[currentPage]]
    setPageOrder(newOrder); setCurrentPage(c=>c+1)
  }
  async function extractCurrentPage() {
    if(!pdfBytes) return; setPhase('saving')
    try {
      const pi=pageOrder[currentPage]
      if(pi<0){setPhase('ready');return}
      const srcDoc=await PDFDocument.load(pdfBytes,{ignoreEncryption:true})
      const newDoc=await PDFDocument.create()
      const[copiedPage]=await newDoc.copyPages(srcDoc,[pi])
      newDoc.addPage(copiedPage)
      const font=await newDoc.embedFont(StandardFonts.Helvetica)
      const fontB=await newDoc.embedFont(StandardFonts.HelveticaBold)
      const page=newDoc.getPages()[0]; const{width:W,height:H}=page.getSize()
      const rot=pageRotations[pi]||0; if(rot)page.setRotation(degrees(rot))
      for(const ann of(annotations[pi]||[])){try{await embedAnnotation(page,ann,W,H,font,fontB,newDoc)}catch{}}
      downloadFile(await newDoc.save(),`${downloadName}-p${pi+1}.pdf`)
    } catch{}
    setPhase('ready')
  }

  // ── Extract Text (all pages, via pdf.js text layer) ─────────────────────────
  async function extractAllText() {
    if (!pdfjsDoc) return
    setExtracting(true); setExtractOpen(true)
    try {
      let out = ''
      for (let i = 0; i < pdfjsDoc.numPages; i++) {
        const pg = await pdfjsDoc.getPage(i + 1)
        const content = await pg.getTextContent()
        const pageText = content.items.map(it => it.str).join(' ')
        out += `── Page ${i + 1} ──\n${pageText.trim()}\n\n`
      }
      setExtractedText(out.trim() || 'No extractable text found — this PDF may be a scanned image without a text layer.')
    } catch (err) {
      console.error('[pdf-editor] extract text error:', err)
      setExtractedText('Could not extract text from this PDF — it may be a scanned image without a text layer.')
    }
    setExtracting(false)
  }

  // ── Navigation / Fit ────────────────────────────────────────────────────────
  function goToPage(di) {
    const c=Math.max(0,Math.min(pageOrder.length-1,di)); setCurrentPage(c)
    pageElRefs.current[pageOrder[c]]?.scrollIntoView({behavior:'smooth',block:'start'})
  }
  function fitToWidth() {
    if(!Object.keys(pageDims).length||!centerRef.current) return
    const dim=pageDims[pageOrder[currentPage]]||pageDims[0]||{width:595}
    setZoom(Math.max(0.25,Math.min(3.0,+((centerRef.current.clientWidth-80)/dim.width).toFixed(2))))
  }
  function fitToPage() {
    if(!Object.keys(pageDims).length||!centerRef.current) return
    const dim=pageDims[pageOrder[currentPage]]||pageDims[0]||{width:595,height:842}
    setZoom(Math.max(0.25,Math.min(3.0,+(Math.min((centerRef.current.clientWidth-80)/dim.width,(centerRef.current.clientHeight-80)/dim.height)).toFixed(2))))
  }

  // ── Download ─────────────────────────────────────────────────────────────────
  async function buildDoc(diRange) {
    const srcDoc=await PDFDocument.load(pdfBytes,{ignoreEncryption:true})
    const newDoc=await PDFDocument.create()
    const font=await newDoc.embedFont(StandardFonts.Helvetica)
    const fontB=await newDoc.embedFont(StandardFonts.HelveticaBold)
    for(const di of diRange) {
      const pi=pageOrder[di]
      if(pi===undefined) continue
      if(pi<0) {
        const dim=pageDims[pi]||{width:595,height:842}
        const blk=newDoc.addPage([dim.width,dim.height])
        blk.drawRectangle({x:0,y:0,width:dim.width,height:dim.height,color:rgb(1,1,1)})
      } else {
        const[copied]=await newDoc.copyPages(srcDoc,[pi]); newDoc.addPage(copied)
        const page=newDoc.getPages()[newDoc.getPageCount()-1]
        const{width:W,height:H}=page.getSize()
        const rot=pageRotations[pi]||0; if(rot)page.setRotation(degrees(rot))
        for(const ann of(annotations[pi]||[])){try{await embedAnnotation(page,ann,W,H,font,fontB,newDoc)}catch{}}
      }
    }
    await applyGlobalSettings(newDoc,font,wm,hf,pgNum)
    if(stripMeta){newDoc.setTitle('');newDoc.setAuthor('');newDoc.setSubject('');newDoc.setKeywords([]);newDoc.setCreator('AWE-OS');newDoc.setProducer('')}
    return newDoc.save()
  }

  async function handleDownload() {
    if(!pdfBytes) return; setPhase('saving'); setDownloadOpen(false)
    try {
      const bytes=await buildDoc(Array.from({length:pageOrder.length},(_,i)=>i))
      const fname=`${downloadName||'edited'}${pwd.enabled?'_protected':''}.pdf`
      downloadFile(bytes,fname)
    } catch(err){console.error('[pdf-editor] download error',err)}
    setPhase('ready')
  }
  async function handleDownloadRange() {
    if(!pdfBytes) return; setPhase('saving'); setDlRangeOpen(false)
    try {
      const bytes=await buildDoc(Array.from({length:dlTo-dlFrom+1},(_,i)=>dlFrom-1+i))
      downloadFile(bytes,`${downloadName}-pages${dlFrom}-${dlTo}.pdf`)
    } catch(err){console.error('[pdf-editor] range download error',err)}
    setPhase('ready')
  }
  async function handleDownloadCurrentPage() {
    if(!pdfBytes) return; setPhase('saving'); setDownloadOpen(false)
    try {
      const bytes=await buildDoc([currentPage])
      downloadFile(bytes,`${downloadName}-p${currentPage+1}.pdf`)
    } catch(err){console.error('[pdf-editor] page download error',err)}
    setPhase('ready')
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  const totalAnns = Object.values(annotations).reduce((s,a)=>s+a.length,0)
  const selAnn    = selectedId ? Object.values(annotations).flat().find(a=>a.id===selectedId) : null
  const activeTools = RIBBON_TABS.find(t=>t.id===activeTab)?.tools || []

  // Which pages to show
  const pagesToShow = viewMode==='single'
    ? [pageOrder[currentPage]].filter(pi=>pi!==undefined)
    : viewMode==='two-page'
    ? [pageOrder[currentPage],pageOrder[currentPage+1]].filter(pi=>pi!==undefined)
    : pageOrder

  // Upload / loading
  if (phase==='idle'||phase==='loading') return (
    <div className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center bg-gray-50 hover:border-blue-400 transition-colors"
      onDragOver={e=>e.preventDefault()}
      onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleFile(f)}}>
      {(phase==='loading' || isProcessing) ? (
        <div className="space-y-3">
          <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">{phase==='loading' ? 'Loading PDF…' : 'Processing PDF…'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="text-5xl">✏️</div>
          <div>
            <p className="text-lg font-semibold text-gray-800">Upload PDF to Edit</p>
            <p className="text-sm text-gray-500 mt-1">Drag & drop or click to browse.</p>
            <p className="text-xs text-gray-400 mt-0.5">Max {MAX_PDF_SIZE_MB} MB · PDF only</p>
            <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 bg-green-50 border border-green-200 rounded-full text-xs font-semibold text-green-700">
              🔒 Your PDF stays on your device
            </span>
          </div>
          <label className="inline-block cursor-pointer">
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={e=>{const f=e.target.files[0];if(f)handleFile(f)}} />
            <span className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium text-sm transition-colors">Choose PDF File</span>
          </label>
          {uploadError && (
            <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 text-left">
              ⚠️ {uploadError}
            </div>
          )}
          {popupBlocked && pendingUrl && (
            <div className="mt-2 p-4 bg-amber-50 border border-amber-200 rounded-xl text-left">
              <p className="text-sm font-semibold text-amber-800">⚠️ Popup blocked by your browser</p>
              <p className="text-xs text-amber-600 mt-1">Allow popups for this site, or open the editor manually:</p>
              <a href={pendingUrl} target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 underline underline-offset-2"
                onClick={()=>setPopupBlocked(false)}>
                Open PDF Editor →
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  )

  return (
    <div className={fullScreen ? 'flex flex-col w-full h-screen overflow-hidden' : 'overflow-hidden rounded-xl border border-gray-200 shadow-2xl flex flex-col'} style={{ background:'#fff', ...(fullScreen ? {} : { minWidth:900 }) }}>
      <input ref={imageInputRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={onImageSelect} />
      <input ref={fromFileRef} type="file" accept=".pdf,application/pdf" className="hidden" onChange={onFromFile} />

      {/* ══ TOP BAR ═══════════════════════════════════════════════════════════ */}
      <div className="flex items-center h-12 px-3 gap-2 flex-shrink-0" style={{ background:C.topBar }}>
        <button onClick={()=>{setPdfFile(null);setPhase('idle')}}
          className="flex items-center gap-1.5 flex-shrink-0 px-2 py-1.5 rounded-lg hover:bg-white/10 transition-colors" title="Open new file">
          <span className="text-base leading-none">✏️</span>
          <span className="text-white text-sm font-bold tracking-tight hidden sm:block">AWE</span>
        </button>
        <div className="h-5 w-px bg-white/20 flex-shrink-0" />
        <div className="flex items-center gap-0.5 min-w-0 flex-1 max-w-[220px]">
          <input value={downloadName} onChange={e=>setDownloadName(e.target.value)}
            onMouseDown={e=>e.stopPropagation()}
            className="bg-transparent text-gray-200 text-sm px-1.5 py-0.5 rounded outline-none border border-transparent hover:border-white/20 focus:border-blue-400 transition-colors min-w-0 w-full truncate"
            title="Click to rename" />
          <span className="text-gray-500 text-sm flex-shrink-0">.pdf</span>
        </div>
        <div className="flex items-center gap-0.5 mx-auto flex-shrink-0">
          <button onClick={undo} disabled={!past.length} title={`Undo (Ctrl+Z)${past.length?' — '+past.length+' steps':''}`}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors text-base relative group">
            ↩
            {past.length>0&&<span className="absolute -top-1 -right-1 text-[9px] bg-blue-500 text-white rounded-full w-4 h-4 flex items-center justify-center">{past.length>9?'9+':past.length}</span>}
          </button>
          <button onClick={redo} disabled={!future.length} title="Redo (Ctrl+Y)"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors text-base">↪</button>
          <div className="h-5 w-px bg-white/20 mx-1" />
          <button onClick={()=>setZoom(z=>Math.max(0.25,+(z-0.25).toFixed(2)))} title="Zoom out"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-white hover:bg-white/10 font-bold transition-colors">−</button>
          <select value={ZOOM_LEVELS.includes(zoom)?zoom:ZOOM_LEVELS.reduce((a,b)=>Math.abs(b-zoom)<Math.abs(a-zoom)?b:a)}
            onChange={e=>setZoom(+e.target.value)}
            className="rounded text-xs px-1 py-1 cursor-pointer w-[58px] text-center border"
            style={{background:'#374151',color:'#e5e7eb',borderColor:'#4b5563'}}>
            {ZOOM_LEVELS.map(z=><option key={z} value={z}>{Math.round(z*100)}%</option>)}
          </select>
          <button onClick={()=>setZoom(z=>Math.min(3.0,+(z+0.25).toFixed(2)))} title="Zoom in"
            className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-white hover:bg-white/10 font-bold transition-colors">+</button>
          <div className="h-5 w-px bg-white/20 mx-1" />
          <button onClick={()=>goToPage(currentPage-1)} disabled={currentPage===0}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors text-xl leading-none">‹</button>
          <span className="text-xs text-gray-400 px-1.5 whitespace-nowrap select-none tabular-nums">{currentPage+1} / {pageOrder.length}</span>
          <button onClick={()=>goToPage(currentPage+1)} disabled={currentPage>=pageOrder.length-1}
            className="w-7 h-7 flex items-center justify-center rounded text-gray-300 hover:text-white hover:bg-white/10 disabled:opacity-25 transition-colors text-xl leading-none">›</button>
        </div>
        {totalAnns>0&&<span className="text-[10px] bg-blue-600/40 text-blue-200 rounded-full px-2 py-0.5 flex-shrink-0 hidden sm:inline">{totalAnns} ann</span>}
        <div ref={downloadRef} className="relative flex-shrink-0 ml-1">
          <button onClick={()=>setDownloadOpen(v=>!v)} disabled={phase==='saving'}
            className="flex items-center gap-2 px-4 h-8 rounded-lg text-white text-sm font-semibold disabled:opacity-50 transition-colors"
            style={{background:C.download}}
            onMouseEnter={e=>{if(!e.currentTarget.disabled)e.currentTarget.style.background=C.downloadH}}
            onMouseLeave={e=>{e.currentTarget.style.background=C.download}}>
            {phase==='saving'?<span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin inline-block"/>:<span>⬇</span>}
            <span className="hidden sm:inline">Download</span>
            <span className="text-[10px] opacity-60">▾</span>
          </button>
          {downloadOpen&&(
            <div className="absolute right-0 top-full mt-2 w-60 bg-white rounded-xl shadow-2xl border border-gray-200 p-4 z-50">
              <p className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-3">Save PDF</p>
              <div className="mb-3">
                <label className="text-[10px] text-gray-500 block mb-1 font-medium">Filename</label>
                <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-blue-500">
                  <input value={downloadName} onChange={e=>setDownloadName(e.target.value)}
                    onMouseDown={e=>e.stopPropagation()}
                    className="flex-1 px-2.5 py-1.5 text-xs text-gray-800 outline-none" placeholder="filename" />
                  <span className="px-2 text-[10px] text-gray-400 bg-gray-50 border-l border-gray-200 py-1.5 select-none">.pdf</span>
                </div>
              </div>
              {[
                ['⬇ All ' + pageOrder.length + ' page' + (pageOrder.length!==1?'s':''), handleDownload, C.download, C.downloadH],
                ['⬇ Current page only', handleDownloadCurrentPage, '#374151', '#1f2937'],
              ].map(([label,fn,bg,bgh])=>(
                <button key={label} onClick={fn}
                  className="w-full py-2 mb-1.5 text-xs font-semibold text-white rounded-lg transition-colors"
                  style={{background:bg}}
                  onMouseEnter={e=>e.currentTarget.style.background=bgh}
                  onMouseLeave={e=>e.currentTarget.style.background=bg}>{label}</button>
              ))}
              <button onClick={()=>{setDownloadOpen(false);setDlRangeOpen(true)}}
                className="w-full py-2 text-xs text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors font-medium">
                ⬇ Page range…
              </button>
              {(wm.enabled||pgNum.enabled||hf.hdrOn||hf.ftrOn||stripMeta||pwd.enabled)&&(
                <div className="mt-2 pt-2 border-t border-gray-100 space-y-0.5">
                  {wm.enabled&&<p className="text-[10px] text-blue-600">✓ Watermark: "{wm.text}"</p>}
                  {pgNum.enabled&&<p className="text-[10px] text-blue-600">✓ Page numbers ({pgNum.pos})</p>}
                  {hf.hdrOn&&<p className="text-[10px] text-blue-600">✓ Header: "{hf.hdrText}"</p>}
                  {hf.ftrOn&&<p className="text-[10px] text-blue-600">✓ Footer: "{hf.ftrText}"</p>}
                  {stripMeta&&<p className="text-[10px] text-orange-600">✓ Metadata stripped</p>}
                  {pwd.enabled&&<p className="text-[10px] text-orange-600">⚠ Password: limited</p>}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ══ RIBBON TABS ═══════════════════════════════════════════════════════ */}
      <div className="flex border-b border-gray-200 flex-shrink-0" style={{background:'#f1f5f9'}}>
        {RIBBON_TABS.map(tab=>(
          <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
            className={`px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap border-b-2 ${activeTab===tab.id?'bg-white border-blue-600 text-blue-700':'border-transparent text-gray-500 hover:text-gray-800 hover:bg-white/60'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ══ TOOL RIBBON ═══════════════════════════════════════════════════════ */}
      <div className="flex items-center h-14 px-3 border-b border-gray-200 gap-0.5 overflow-x-auto flex-shrink-0"
        style={{background:C.ribbon}}>
        {activeTools.map((item,i)=>
          item==='sep'
            ? <div key={`s${i}`} className="h-8 w-px bg-gray-300 mx-1.5 flex-shrink-0" />
            : item.disabled
              ? <DisabledToolButton key={item.id} icon={item.icon} label={item.label} tooltip={item.disabledTip || item.label} />
              : <ToolBtn key={item.id} tool={item} activeTool={activeTool} viewMode={viewMode} darkCanvas={darkCanvas} stripMeta={stripMeta} onSelect={handleToolSelect} onAction={handleAction} />
        )}
      </div>

      {/* ══ MAIN CONTENT ══════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0" style={fullScreen ? {} : {height:600}}>

        {/* LEFT SIDEBAR */}
        <div className="w-[200px] flex-shrink-0 flex flex-col" style={{background:C.sidebar}}>
          <div className="px-3 py-2.5 border-b border-white/10 flex-shrink-0">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest select-none">Pages ({pageOrder.length})</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2 px-2 space-y-1.5">
            {pageOrder.map((pi,di)=>{
              const dim=pageDims[pi]||{width:100,height:130}
              const annCount=annotations[pi]?.length||0
              const isCurrent=currentPage===di
              return (
                <div key={`${pi}-${di}`}
                  className={`relative group cursor-pointer rounded-lg overflow-hidden transition-all duration-150 ${isCurrent?'ring-2 ring-blue-400 ring-offset-2 ring-offset-gray-900':'hover:ring-1 hover:ring-white/30 hover:ring-offset-1 hover:ring-offset-gray-900'}`}
                  onClick={()=>{setCurrentPage(di);pageElRefs.current[pi]?.scrollIntoView({behavior:'smooth',block:'start'})}}>
                  <div className="bg-white overflow-hidden relative" style={{paddingBottom:`${(dim.height/dim.width)*100}%`}}>
                    <canvas ref={el=>{if(el){thumbRefs.current[pi]=el;renderThumb(pi)}}} className="absolute inset-0 w-full h-full" />
                    {pi<0&&<div className="absolute inset-0 flex items-center justify-center bg-white"><span className="text-xs text-gray-400">Blank</span></div>}
                  </div>
                  <div className={`px-2 py-1 flex items-center justify-between transition-colors ${isCurrent?'bg-blue-600':'bg-gray-800 group-hover:bg-gray-700'}`}>
                    <span className="text-[10px] font-medium text-gray-300 select-none">Page {di+1}</span>
                    {annCount>0&&<span className="text-[9px] bg-blue-500 text-white rounded-full px-1.5 py-0.5 font-bold leading-none">{annCount>9?'9+':annCount}</span>}
                  </div>
                  <div className="absolute top-1 right-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={e=>{e.stopPropagation();rotatePage(pi,'cw')}} title="Rotate CW"
                      className="w-5 h-5 bg-black/60 hover:bg-blue-600 text-white rounded text-[10px] flex items-center justify-center transition-colors">↻</button>
                    {pageOrder.length>1&&<button onClick={e=>{e.stopPropagation();deletePage(pi)}} title="Delete"
                      className="w-5 h-5 bg-black/60 hover:bg-red-600 text-white rounded text-[10px] flex items-center justify-center transition-colors">✕</button>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* CENTER CANVAS */}
        <div ref={centerRef} className="flex-1 overflow-auto p-6" style={{background:darkCanvas?'#374151':C.canvas}}
          onClick={()=>{setSelectedId(null);setCtxMenu(null)}}>
          <div className={viewMode==='two-page'?'flex flex-wrap gap-8 justify-center':'flex flex-col items-center gap-10'}>
            {pagesToShow.map(pi=>{
              const di=pageOrder.indexOf(pi)
              const dim=pageDims[pi]||{width:595,height:842}
              const rot=pageRotations[pi]||0
              const isR=rot===90||rot===270
              const pxW=Math.round((isR?dim.height:dim.width)*zoom)
              const pxH=Math.round((isR?dim.width:dim.height)*zoom)
              const pageAnns=annotations[pi]||[]
              return (
                <div key={`${pi}-${di}`} className="flex flex-col items-center">
                  <div className="text-xs mb-2 font-medium select-none flex items-center gap-2"
                    style={{color:darkCanvas?'#9ca3af':'#6b7280'}}>
                    <span>Page {di+1}</span>
                    {pageAnns.length>0&&<span className="bg-blue-600 text-white text-[10px] rounded-full px-1.5 py-0.5 leading-none">{pageAnns.length}</span>}
                  </div>
                  <div ref={el=>{if(el)pageElRefs.current[pi]=el}}
                    className="relative bg-white"
                    style={{width:pxW,height:pxH,boxShadow:'0 4px 24px rgba(0,0,0,0.18),0 1px 4px rgba(0,0,0,0.10)'}}
                    onClick={e=>e.stopPropagation()}>
                    <canvas ref={el=>{if(el){canvasRefs.current[pi]=el;renderPage(pi)}}} className="absolute inset-0" style={{display:'block'}} />
                    <canvas ref={el=>{if(el)drawRefs.current[pi]=el}} width={pxW} height={pxH}
                      className="absolute inset-0 pointer-events-none" style={{zIndex:12}} />
                    {pageAnns.map(ann=>(
                      <AnnotationEl key={ann.id} ann={ann} zoom={zoom} pageW={dim.width} pageH={dim.height}
                        selected={selectedId===ann.id}
                        onSelect={()=>setSelectedId(ann.id)}
                        onDelete={()=>deleteAnn(ann.id)}
                        onDragStart={e=>{e.stopPropagation();setSelectedId(ann.id);dragRef.current={id:ann.id,pi,sx:e.clientX,sy:e.clientY,ox:ann.x,oy:ann.y}}}
                        onResizeStart={(e,handle)=>{e.stopPropagation();resizeRef.current={id:ann.id,pi,handle,sx:e.clientX,sy:e.clientY,ox:ann.x,oy:ann.y,ow:ann.w,oh:ann.h}}}
                        onChange={upd=>{pushHistory(annotations);updateAnn(pi,ann.id,upd)}}
                        onContextMenu={(cx,cy)=>setCtxMenu({x:cx,y:cy,id:ann.id})}
                      />
                    ))}
                    {isDrawing&&drawPage===pi&&!['draw','hlpen','eraser'].includes(activeTool)&&(
                      <DrawPreview tool={activeTool} start={drawStart} end={drawEnd}
                        pageW={dim.width} pageH={dim.height} zoom={zoom}
                        strokeColor={strokeColor} fillColor={hasFill?fillColor:'transparent'}
                        strokeWidth={strokeWidth} highlightColor={highlightColor} opacity={hlOpacity}
                        polyPts={polyPts} />
                    )}
                    <div className="absolute inset-0"
                      style={{zIndex:activeTool&&activeTool!=='hand'?20:0,cursor:activeTool?(CURSORS[activeTool]||'crosshair'):'default',pointerEvents:activeTool&&activeTool!=='hand'?'auto':'none'}}
                      onMouseDown={e=>onPageDown(e,pi)}
                      onMouseMove={e=>onPageMove(e,pi)}
                      onMouseUp={e=>onPageUp(e,pi)} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT PROPERTIES PANEL */}
        <div className="w-[220px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-hidden">
          {(activeTool||selAnn||showPgNumPanel) ? (
            <>
              <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0 flex items-center justify-between">
                <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                  {showPgNumPanel?'Page Numbers':activeTool?(activeTool.charAt(0).toUpperCase()+activeTool.slice(1)+' Tool'):'Selected'}
                </p>
                <button onClick={()=>{setActiveTool(null);setShowPgNumPanel(false)}}
                  className="text-[10px] text-gray-400 hover:text-gray-600 px-1.5 py-0.5 rounded hover:bg-gray-100">Esc</button>
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">

                {/* Page Numbers panel */}
                {showPgNumPanel && <>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="pgn-en" checked={pgNum.enabled} onChange={e=>setPgNum({enabled:e.target.checked})} className="w-4 h-4 accent-blue-600" />
                    <label htmlFor="pgn-en" className="text-sm font-medium text-gray-700">Enable Page Numbers</label>
                  </div>
                  {pgNum.enabled && <>
                    <PropSection label="Position">
                      <select value={pgNum.pos} onChange={e=>setPgNum({pos:e.target.value})}
                        className="w-full border border-gray-200 rounded-lg text-xs px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {['bottom-center','bottom-left','bottom-right','top-center','top-left','top-right'].map(p=><option key={p} value={p}>{p.replace('-',' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>)}
                      </select>
                    </PropSection>
                    <PropSection label={`Font Size: ${pgNum.size}px`}>
                      <input type="range" min={8} max={24} value={pgNum.size} onChange={e=>setPgNum({size:+e.target.value})} className="w-full accent-blue-600" />
                    </PropSection>
                    <PropSection label="Start At">
                      <input type="number" min={1} value={pgNum.start} onChange={e=>setPgNum({start:+e.target.value})}
                        className="w-full border border-gray-200 rounded-lg text-xs px-2 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </PropSection>
                  </>}
                </>}

                {/* Text / Typewriter */}
                {(activeTool==='text'||activeTool==='typewriter'||activeTool==='callout'||activeTool==='edit-text')&&!showPgNumPanel&&<>
                  <PropSection label="Font">
                    <select value={fontFamily} onChange={e=>setFontFamily(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg text-xs px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2">
                      {FONT_FAMILIES.map(f=><option key={f} value={f}>{f}</option>)}
                    </select>
                    <select value={fontSize} onChange={e=>setFontSize(+e.target.value)}
                      className="w-full border border-gray-200 rounded-lg text-xs px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {FONT_SIZES.map(s=><option key={s} value={s}>{s}px</option>)}
                    </select>
                  </PropSection>
                  <PropSection label="Color"><ColorGrid value={fontColor} onChange={setFontColor} /></PropSection>
                  <PropSection label="Style">
                    <div className="flex gap-1.5 mb-2">
                      {[['B','Bold',bold,setBold,'font-bold'],['I','Italic',italic,setItalic,'italic'],['U','Underline',underlineText,setUnderlineText,'underline']].map(([l,t,v,fn,cls])=>(
                        <button key={l} onClick={()=>fn(x=>!x)} title={t}
                          className={`flex-1 py-2 text-xs rounded-lg border transition-colors ${cls} ${v?'bg-gray-900 text-white border-gray-900':'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{l}</button>
                      ))}
                    </div>
                    <div className="flex gap-1">
                      {[['left','←'],['center','↔'],['right','→']].map(([a,l])=>(
                        <button key={a} onClick={()=>setTextAlign(a)}
                          className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors ${textAlign===a?'bg-gray-900 text-white border-gray-900':'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>{l}</button>
                      ))}
                    </div>
                  </PropSection>
                  {activeTool==='callout'&&<PropSection label="Border Color"><ColorGrid value={strokeColor} onChange={setStrokeColor} /></PropSection>}
                </>}

                {/* Highlight / Underline / Strikethrough */}
                {(activeTool==='highlight'||activeTool==='underline'||activeTool==='strikethrough')&&!showPgNumPanel&&<>
                  <PropSection label="Color">
                    <div className="flex flex-wrap gap-1.5">
                      {HL_COLORS.map(c=>(
                        <button key={c} onClick={()=>setHighlightColor(c)} style={{background:c}}
                          className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${highlightColor===c?'border-blue-500 scale-110':'border-gray-200'}`} title={c} />
                      ))}
                    </div>
                    <input type="color" value={highlightColor} onChange={e=>setHighlightColor(e.target.value)}
                      className="w-full h-8 mt-1.5 rounded-lg cursor-pointer border border-gray-200" />
                  </PropSection>
                  <PropSection label="Opacity">
                    <div className="flex gap-1">
                      {[0.25,0.5,0.75,1.0].map(o=>(
                        <button key={o} onClick={()=>setHlOpacity(o)}
                          className={`flex-1 py-1.5 text-xs rounded-lg border transition-colors font-medium ${hlOpacity===o?'bg-gray-900 text-white border-gray-900':'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                          {Math.round(o*100)}%
                        </button>
                      ))}
                    </div>
                  </PropSection>
                  <PropSection label="Width"><WidthPicker value={strokeWidth} onChange={setStrokeWidth} /></PropSection>
                </>}

                {/* Stamp */}
                {activeTool==='stamp'&&!showPgNumPanel&&<>
                  <PropSection label="Stamp Type">
                    <select value={stampType} onChange={e=>setStampType(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg text-xs px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {STAMP_TYPES.map(s=><option key={s} value={s}>{s}</option>)}
                    </select>
                  </PropSection>
                  <PropSection label="Color">
                    <div className="grid grid-cols-4 gap-1.5">
                      {Object.entries(STAMP_COLS).map(([k,c])=>(
                        <button key={k} onClick={()=>setStampColorKey(k)}
                          style={{background:c}}
                          className={`h-8 rounded-lg border-2 transition-all ${stampColorKey===k?'border-gray-900 scale-105':'border-transparent'}`} title={k} />
                      ))}
                    </div>
                  </PropSection>
                  <PropSection label={`Opacity: ${Math.round(stampOpacity*100)}%`}>
                    <input type="range" min={20} max={100} value={Math.round(stampOpacity*100)} onChange={e=>setStampOpacity(e.target.value/100)} className="w-full accent-blue-600" />
                  </PropSection>
                  <PropSection label={`Rotation: ${stampRotation}°`}>
                    <input type="range" min={-45} max={45} value={stampRotation} onChange={e=>setStampRotation(+e.target.value)} className="w-full accent-blue-600" />
                  </PropSection>
                  <div className="p-3 border border-gray-100 rounded-xl bg-gray-50 flex items-center justify-center" style={{height:56}}>
                    <span style={{color:STAMP_COLS[stampColorKey],fontWeight:900,fontSize:14,fontFamily:'Arial,sans-serif',letterSpacing:'0.08em',opacity:stampOpacity,transform:`rotate(${stampRotation}deg)`,display:'inline-block'}}>
                      {stampType}
                    </span>
                  </div>
                </>}

                {/* Shapes */}
                {(['rect','circle','triangle','diamond','star','cloud','cross','checkmark'].includes(activeTool))&&!showPgNumPanel&&<>
                  <PropSection label="Stroke Color"><ColorGrid value={strokeColor} onChange={setStrokeColor} /></PropSection>
                  <PropSection label="Stroke Width"><WidthPicker value={strokeWidth} onChange={setStrokeWidth} /></PropSection>
                  <PropSection label="Fill">
                    <div className="flex items-center gap-2 mb-2">
                      <input type="checkbox" id="hf-fill" checked={hasFill} onChange={e=>setHasFill(e.target.checked)} className="w-3.5 h-3.5 rounded accent-blue-600" />
                      <label htmlFor="hf-fill" className="text-xs text-gray-600 cursor-pointer select-none">Fill color</label>
                    </div>
                    {hasFill&&<ColorGrid value={fillColor} onChange={setFillColor} />}
                  </PropSection>
                </>}

                {/* Draw / Arrow / Line / Dashed / Measure / Polyline */}
                {(['draw','arrow','line','dashed','measure','polyline'].includes(activeTool))&&!showPgNumPanel&&<>
                  <PropSection label="Color"><ColorGrid value={strokeColor} onChange={setStrokeColor} /></PropSection>
                  <PropSection label="Width"><WidthPicker value={strokeWidth} onChange={setStrokeWidth} /></PropSection>
                  {activeTool==='draw'&&(
                    <PropSection label={`Opacity: ${Math.round(drawOpacity*100)}%`}>
                      <input type="range" min={10} max={100} value={Math.round(drawOpacity*100)} onChange={e=>setDrawOpacity(e.target.value/100)} className="w-full accent-blue-600" />
                    </PropSection>
                  )}
                  {activeTool==='polyline'&&<p className="text-[10px] text-gray-400 bg-gray-50 rounded-lg p-2">Drag to draw a freehand polyline path. For click-by-click lines, chain multiple Line tools.</p>}
                  {activeTool==='measure'&&<p className="text-[10px] text-gray-400 bg-gray-50 rounded-lg p-2">Draws a line with a pixel-length label. Actual measurement depends on page DPI.</p>}
                </>}

                {/* Highlighter Pen */}
                {activeTool==='hlpen'&&!showPgNumPanel&&<>
                  <PropSection label="Color">
                    <div className="flex flex-wrap gap-1.5">
                      {HL_COLORS.map(c=>(
                        <button key={c} onClick={()=>setHighlightColor(c)} style={{background:c}}
                          className={`w-8 h-8 rounded-lg border-2 transition-all hover:scale-110 ${highlightColor===c?'border-blue-500 scale-110':'border-gray-200'}`} />
                      ))}
                    </div>
                  </PropSection>
                  <PropSection label="Width"><WidthPicker value={strokeWidth} onChange={setStrokeWidth} /></PropSection>
                </>}

                {/* Eraser */}
                {activeTool==='eraser'&&!showPgNumPanel&&(
                  <PropSection label={`Eraser Size: ${eraserSize}px`}>
                    <input type="range" min={5} max={80} value={eraserSize} onChange={e=>setEraserSize(+e.target.value)} className="w-full accent-blue-600" />
                    <p className="text-[10px] text-gray-400 mt-1">Draws white strokes to cover marks.</p>
                  </PropSection>
                )}

                {/* Whiteout / Redact */}
                {(activeTool==='whiteout'||activeTool==='redact')&&!showPgNumPanel&&(
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 leading-relaxed">
                    {activeTool==='whiteout'?'Drag to draw a white rectangle that permanently covers content on download.':'Drag to draw a black rectangle that permanently redacts content on download.'}
                  </p>
                )}

                {/* Edit Text / Edit Image */}
                {(activeTool==='edit-text'||activeTool==='edit-image')&&!showPgNumPanel&&(
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 leading-relaxed">
                    {activeTool==='edit-text'
                      ? 'Drag over existing text to cover it and type a replacement using the font settings below.'
                      : 'Drag over an existing image to cover it, then choose a replacement image to place in the same spot.'}
                  </p>
                )}

                {/* Hand tool */}
                {activeTool==='hand'&&!showPgNumPanel&&(
                  <p className="text-xs text-gray-500 bg-gray-50 rounded-xl p-3 leading-relaxed">Hand/Pan mode: scroll the canvas freely without accidentally selecting or placing annotations.</p>
                )}

                {/* Note */}
                {activeTool==='note'&&!showPgNumPanel&&<>
                  <PropSection label="Color"><ColorGrid value={fontColor} onChange={setFontColor} /></PropSection>
                  <PropSection label="Font Size">
                    <select value={fontSize} onChange={e=>setFontSize(+e.target.value)}
                      className="w-full border border-gray-200 rounded-lg text-xs px-2 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {FONT_SIZES.map(s=><option key={s} value={s}>{s}px</option>)}
                    </select>
                  </PropSection>
                </>}

                {/* Selected annotation actions */}
                {selAnn&&!showPgNumPanel&&(
                  <div className={`space-y-2 ${activeTool?'border-t border-gray-100 pt-4':''}`}>
                    {!activeTool&&<div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-700 capitalize">{selAnn.type}</span>
                      <button onClick={()=>setSelectedId(null)} className="text-[10px] text-gray-400 hover:text-gray-600">✕</button>
                    </div>}
                    <button onClick={()=>duplicateAnn(selectedId)} className="w-full py-2 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors font-medium">⧉ Duplicate</button>
                    <button onClick={()=>bringToFront(selectedId)} className="w-full py-2 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors font-medium">↑ Bring to Front</button>
                    <button onClick={()=>sendToBack(selectedId)}  className="w-full py-2 text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 transition-colors font-medium">↓ Send to Back</button>
                    <button onClick={()=>deleteAnn(selectedId)}   className="w-full py-2 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 transition-colors font-medium">🗑 Delete</button>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Empty state shortcuts */
            <div className="flex-1 flex flex-col items-center justify-center p-5 text-center">
              <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center text-2xl mb-3 shadow-sm">✏️</div>
              <p className="text-sm font-semibold text-gray-700 mb-0.5">No Tool Selected</p>
              <p className="text-xs text-gray-400 leading-relaxed mb-4">Pick a tool from the ribbon to annotate</p>
              <div className="w-full space-y-1 text-left border border-gray-100 rounded-xl p-3 bg-gray-50">
                <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-2">Shortcuts</p>
                {[['V','Select'],['H','Hand/Pan'],['T','Text'],['I','Highlight'],['U','Underline'],['D','Pencil'],['E','Eraser'],['S','Stamp'],['W','Whiteout'],['N','Note'],['A','Arrow'],['R','Rect'],['[/]','Prev/Next page'],['Del','Delete'],['Ctrl+Z','Undo'],['Ctrl+Y','Redo'],['Ctrl+C/V','Copy/Paste'],['Ctrl+S','Download']].map(([k,d])=>(
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-[10px] text-gray-500">{d}</span>
                    <kbd className="text-[9px] bg-white border border-gray-200 text-gray-500 rounded px-1.5 py-0.5 font-mono shadow-sm">{k}</kbd>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══ BOTTOM STATUS BAR ════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-3 flex-shrink-0 border-t border-gray-200 select-none"
        style={{height:30,background:'#f8fafc',fontSize:11}}>
        <div className="flex items-center gap-2 text-gray-500">
          <button onClick={()=>goToPage(currentPage-1)} disabled={currentPage===0}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30 transition-colors text-base leading-none">‹</button>
          <span className="tabular-nums">Page {currentPage+1} of {pageOrder.length}</span>
          <button onClick={()=>goToPage(currentPage+1)} disabled={currentPage>=pageOrder.length-1}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 disabled:opacity-30 transition-colors text-base leading-none">›</button>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          <button onClick={()=>setZoom(z=>Math.max(0.25,+(z-0.25).toFixed(2)))}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 font-bold transition-colors">−</button>
          <input type="range" min={25} max={300} value={Math.round(zoom*100)} onChange={e=>setZoom(+e.target.value/100)}
            className="w-24 accent-blue-600" style={{height:3}} />
          <button onClick={()=>setZoom(z=>Math.min(3.0,+(z+0.25).toFixed(2)))}
            className="w-5 h-5 flex items-center justify-center rounded hover:bg-gray-200 font-bold transition-colors">+</button>
          <span className="tabular-nums w-9 text-center">{Math.round(zoom*100)}%</span>
          <button onClick={fitToWidth} className="px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors text-[10px]">Fit W</button>
          <button onClick={fitToPage}  className="px-1.5 py-0.5 rounded hover:bg-gray-200 transition-colors text-[10px]">Fit P</button>
        </div>
        <div className="flex items-center gap-1.5 text-gray-500">
          {[['S','single'],['C','continuous'],['2','two-page']].map(([l,m])=>(
            <button key={m} onClick={()=>setViewMode(m)}
              className={`px-1.5 py-0.5 rounded transition-colors text-[10px] font-medium ${viewMode===m?'bg-blue-100 text-blue-700':'hover:bg-gray-200'}`}>{l}</button>
          ))}
          <span className="text-gray-400 tabular-nums text-[10px] ml-1">{cursorPos.x},{cursorPos.y}</span>
        </div>
      </div>

      {/* ══ CONTEXT MENU ═════════════════════════════════════════════════════ */}
      {ctxMenu&&(
        <div className="fixed bg-white border border-gray-200 rounded-xl shadow-2xl py-1 z-[9999]"
          style={{left:ctxMenu.x,top:ctxMenu.y,minWidth:180}}
          onMouseDown={e=>e.stopPropagation()}>
          {[
            ['⧉ Duplicate',()=>duplicateAnn(ctxMenu.id)],
            ['↑ Bring to Front',()=>bringToFront(ctxMenu.id)],
            ['↓ Send to Back',()=>sendToBack(ctxMenu.id)],
            null,
            ['📋 Copy',()=>{const a=Object.values(annotations).flat().find(x=>x.id===ctxMenu.id);if(a)setCopiedAnn({...a})}],
            null,
            ['🗑 Delete',()=>{deleteAnn(ctxMenu.id)},true],
          ].map((item,i)=>
            item===null
              ? <div key={i} className="border-t border-gray-100 my-1" />
              : <button key={item[0]} onClick={()=>{item[1]();setCtxMenu(null)}}
                  className={`w-full text-left px-4 py-1.5 text-xs hover:bg-gray-50 transition-colors ${item[2]?'text-red-600 hover:bg-red-50':''}`}>
                  {item[0]}
                </button>
          )}
        </div>
      )}

      {/* ══ MODALS ════════════════════════════════════════════════════════════ */}
      {sigOpen&&<SignatureModal onInsert={onSigInsert} onClose={()=>{setSigOpen(false);setPendingSig(null)}} />}
      {wmOpen&&<WatermarkModal s={wm} set={setWm} onClose={()=>setWmOpen(false)} />}
      {hfOpen&&<HFModal s={hf} set={setHf} onClose={()=>setHfOpen(false)} />}
      {pwdOpen&&<PwdModal s={pwd} set={setPwd} onClose={()=>setPwdOpen(false)} />}
      {dlRangeOpen&&<DlRangeModal total={pageOrder.length} from={dlFrom} to={dlTo}
        setFrom={setDlFrom} setTo={setDlTo}
        onConfirm={handleDownloadRange} onClose={()=>setDlRangeOpen(false)} />}
      {extractOpen&&<ExtractTextModal text={extractedText} loading={extracting} onClose={()=>setExtractOpen(false)} />}
    </div>
  )
}

// ── Sub-components ────────────────────────────────────────────────────────────
function ToolBtn({ tool, activeTool, viewMode, darkCanvas, stripMeta, onSelect, onAction }) {
  // Buttons marked disabled show a tooltip but are not clickable (no alert popup)
  if (tool.disabled) return (
    <button
      disabled
      title={tool.disabledTip || tool.label}
      className="flex flex-col items-center justify-center gap-0.5 rounded-xl min-w-[52px] px-2 py-1.5 select-none flex-shrink-0 border border-transparent opacity-40 cursor-not-allowed text-gray-400">
      <span className={`leading-none ${tool.cls||'text-lg'}`}>{tool.icon}</span>
      <span className="text-[10px] font-medium leading-none whitespace-nowrap">{tool.label}</span>
    </button>
  )
  const targetId  = tool.toolId || tool.id
  const isAction  = !!tool.act
  const isActive  = isAction
    ? (tool.act==='view-single'&&viewMode==='single')||(tool.act==='view-cont'&&viewMode==='continuous')||(tool.act==='view-two'&&viewMode==='two-page')||(tool.act==='dark-mode'&&darkCanvas)||(tool.act==='toggle-meta'&&stripMeta)
    : (targetId==='select' ? activeTool===null : activeTool===targetId)
  const isHL = tool.isHL
  return (
    <button
      onClick={()=>isAction?onAction(tool.act):onSelect(targetId)}
      title={tool.key?`${tool.label} (${tool.key})`:tool.label}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-xl min-w-[52px] px-2 py-1.5 transition-all select-none flex-shrink-0 border ${
        isActive?'bg-blue-600 text-white border-blue-700 shadow-md shadow-blue-200':'text-gray-600 border-transparent hover:bg-blue-50 hover:text-blue-700 hover:border-blue-100'
      }`}>
      {isHL&&!isActive
        ? <span className="relative leading-none text-xl font-bold text-gray-600">H<span className="absolute inset-x-0 bottom-0 h-1 rounded-sm" style={{background:'#fef08a'}} /></span>
        : <span className={`leading-none ${tool.cls||'text-lg'}`}>{tool.icon}</span>
      }
      <span className="text-[10px] font-medium leading-none whitespace-nowrap">{tool.label}</span>
    </button>
  )
}

function ColorGrid({ value, onChange }) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-1 mb-1.5">
        {PALETTE.map(c=>(
          <button key={c} onClick={()=>onChange(c)} title={c}
            style={{background:c,boxShadow:value===c?'0 0 0 2px #3b82f6':c==='#ffffff'?'0 0 0 1px #d1d5db':'none'}}
            className="w-6 h-6 rounded-md hover:scale-110 transition-transform" />
        ))}
      </div>
      <input type="color" value={value} onChange={e=>onChange(e.target.value)} className="w-full h-8 rounded-lg cursor-pointer border border-gray-200" title="Custom color" />
    </div>
  )
}

function WidthPicker({ value, onChange }) {
  return (
    <div className="flex gap-1">
      {[1,2,4,6,8,12].map(w=>(
        <button key={w} onClick={()=>onChange(w)}
          className={`flex-1 py-1.5 text-xs rounded-lg border font-medium transition-colors ${value===w?'bg-gray-900 text-white border-gray-900':'border-gray-200 text-gray-700 hover:bg-gray-50'}`}>
          {w}
        </button>
      ))}
    </div>
  )
}

function PropSection({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">{label}</label>
      {children}
    </div>
  )
}

// ── Page Shell ────────────────────────────────────────────────────────────────
const STEPS = [
  'Upload your PDF by clicking "Choose PDF File" or dragging it into the upload area.',
  'Select a tab (Annotate, Draw, Shapes, Insert, etc.) then click a tool from the ribbon. Press V to return to select mode, Escape to deselect.',
  'Click or drag on the PDF page to place annotations. Text and Note tools place on click; shape and highlight tools require a drag.',
  'Use the left sidebar to navigate pages. Hover a thumbnail to rotate or delete that page. The Pages tab adds, duplicates, moves, and extracts pages.',
  'Set watermark, header/footer, and page numbers from the Insert tab — they apply on download without modifying the view.',
  'Click "Download ▾" to save — choose all pages, current page, or a custom page range.',
]
const FAQS = [
  { q:'Is my PDF uploaded to any server?', a:'No. The AWE-OS PDF Editor runs entirely in your browser using PDF.js and pdf-lib. Your file is never transmitted to any server.' },
  { q:'How do I sign a PDF?', a:'Select the Sign tool from the Insert tab and click anywhere on the page. Draw your signature, type it in cursive, or upload a signature image. Drag to reposition and resize.' },
  { q:'What does Whiteout do?', a:'Whiteout draws a permanent white rectangle over selected content. On download, pdf-lib embeds it as a white filled rectangle, covering the original content.' },
  { q:'Can I add a watermark to every page?', a:'Yes. Click Watermark in the Insert tab, configure text, opacity, angle, and color, then click Apply. The watermark is embedded into all pages when you download.' },
  { q:'Will annotations survive a browser refresh?', a:'No — annotations live in browser memory for the current session only. Always download before refreshing or closing.' },
  { q:'What is the Stamp tool?', a:'Stamp places pre-built legal/document stamps (APPROVED, CONFIDENTIAL, DRAFT, etc.) as colored rectangle overlays on your PDF pages.' },
]
const ABOUT = TOOL_ABOUT['pdf-editor']

export default function PdfEditor() {
  return (
    <ToolPageShell slug="pdf-editor" name="PDF Editor" icon="✏️"
      description="Edit PDFs online free — annotate, highlight, draw, sign, add stamps, watermarks, and more. 100% browser-based."
      steps={STEPS} faqs={FAQS} about={ABOUT}
      limitation={"Adds new text, drawings, and highlights on top of the PDF — it cannot edit or delete the PDF's original text."}>
      <PdfEditorTool />
    </ToolPageShell>
  )
}

// Named export so the standalone (new-tab) page can import the tool directly
export { PdfEditorTool }
