import { useState } from 'react'
import { jsPDF } from 'jspdf'
import api from '../../../services/api.service'
import ProGate from '../../../components/ProGate'
import ToolLayout from '../../../components/tool-engine/ToolLayout'
import ToolLoadingState from '../../../components/tool-engine/ToolLoadingState'
import { Button, Input, Textarea } from '../../../components/ui'
import { getToolBySlug } from '../../../data/toolRegistry'

const STEPS_META = [
  { id: 1, label: 'Personal Info', icon: '👤' },
  { id: 2, label: 'Experience',   icon: '💼' },
  { id: 3, label: 'Education',    icon: '🎓' },
  { id: 4, label: 'Skills',       icon: '🛠️' },
  { id: 5, label: 'Generate',     icon: '✨' },
]

const EMPTY = {
  fullName: '', email: '', phone: '', location: '', linkedin: '', summary: '',
  experience: [{ company: '', role: '', period: '', description: '' }],
  education:  [{ institution: '', degree: '', year: '' }],
  skills: '',
}

const HOW_TO_STEPS = [
  'Fill in your personal information: name, email, phone, and location.',
  'Add your work experience — company, role, period, and key achievements.',
  'Enter your education history — institution, degree, and graduation year.',
  'List your technical and soft skills, separated by commas.',
  'Click "Generate Resume" and let AI craft your professional resume.',
  'Review the output, then download as PDF.',
]

const FAQS = [
  {
    q: 'How does the AI write my resume?',
    a: 'The AI uses the information you provide to generate a professionally formatted resume with action verbs, quantified achievements, and relevant language for your field.',
  },
  {
    q: 'Can I edit the generated resume?',
    a: 'Yes — the result is displayed in a text area you can edit directly before downloading.',
  },
  {
    q: 'What format is the PDF download?',
    a: 'A standard A4 PDF with clean typography, suitable for most job application portals.',
  },
  {
    q: 'Is my data stored anywhere?',
    a: 'No data is stored server-side. Your resume information is only used during the current session to generate the document.',
  },
]

// Thin wrapper that uses ui/Input and ui/Textarea internally
// while keeping the same (label, value, onChange, placeholder) API
function Field({ label, value, onChange, placeholder, type = 'text', rows }) {
  if (rows) {
    return (
      <Textarea
        label={label}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
      />
    )
  }
  return (
    <Input
      label={label}
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
    />
  )
}

function ResumeBuilderTool() {
  const [step, setStep]     = useState(1)
  const [data, setData]     = useState(EMPTY)
  const [result, setResult] = useState('')
  const [status, setStatus] = useState('idle')
  const [error, setError]   = useState('')

  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }))

  const updateExp = (i, key, val) => {
    const exp = [...data.experience]; exp[i] = { ...exp[i], [key]: val }
    setData(prev => ({ ...prev, experience: exp }))
  }
  const addExp    = () => setData(prev => ({ ...prev, experience: [...prev.experience, { company: '', role: '', period: '', description: '' }] }))
  const removeExp = (i) => setData(prev => ({ ...prev, experience: prev.experience.filter((_, idx) => idx !== i) }))

  const updateEdu = (i, key, val) => {
    const edu = [...data.education]; edu[i] = { ...edu[i], [key]: val }
    setData(prev => ({ ...prev, education: edu }))
  }
  const addEdu    = () => setData(prev => ({ ...prev, education: [...prev.education, { institution: '', degree: '', year: '' }] }))
  const removeEdu = (i) => setData(prev => ({ ...prev, education: prev.education.filter((_, idx) => idx !== i) }))

  const generate = async () => {
    setStatus('generating'); setError(''); setResult('')
    try {
      const res = await api.post('/api/tools/generate', { tool: 'resume-builder', data })
      setResult(res.data.content || res.data.result || '')
      setStatus('done')
    } catch {
      setError('Failed to generate resume. Please try again.')
      setStatus('idle')
    }
  }

  const downloadPDF = () => {
    const doc    = new jsPDF({ unit: 'mm', format: 'a4' })
    const margin = 15
    const maxW   = doc.internal.pageSize.getWidth() - margin * 2
    let y = margin
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    for (const line of result.split('\n')) {
      const wrapped = doc.splitTextToSize(line || ' ', maxW)
      for (const wl of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin }
        if (line.startsWith('##'))     { doc.setFont('helvetica', 'bold'); doc.setFontSize(11) }
        else if (line.startsWith('#')) { doc.setFont('helvetica', 'bold'); doc.setFontSize(13) }
        else                           { doc.setFont('helvetica', 'normal'); doc.setFontSize(10) }
        doc.text(wl.replace(/^#+\s*/, ''), margin, y); y += 6
      }
      y += 1
    }
    doc.save(`${data.fullName || 'resume'}.pdf`)
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
        {STEPS_META.map((s, i) => (
          <div key={s.id} className="flex items-center">
            <button
              onClick={() => (step > s.id || status === 'done') ? setStep(s.id) : null}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                step === s.id  ? 'bg-blue-600 text-white' :
                step > s.id   ? 'bg-blue-100 text-blue-700 cursor-pointer' :
                                 'bg-gray-100 text-gray-400'
              }`}
            >
              {s.icon} {s.label}
            </button>
            {i < STEPS_META.length - 1 && <div className="w-4 h-px bg-gray-300 mx-0.5 shrink-0" />}
          </div>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">

        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Personal Information</h2>
            <Field label="Full Name"            value={data.fullName}  onChange={v => set('fullName', v)}  placeholder="Jane Smith" />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Email" type="email" value={data.email}     onChange={v => set('email', v)}     placeholder="jane@example.com" />
              <Field label="Phone"              value={data.phone}     onChange={v => set('phone', v)}     placeholder="+1 555 000 0000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Location"           value={data.location}  onChange={v => set('location', v)}  placeholder="New York, NY" />
              <Field label="LinkedIn"           value={data.linkedin}  onChange={v => set('linkedin', v)}  placeholder="linkedin.com/in/jane" />
            </div>
            <Field label="Professional Summary" value={data.summary}   onChange={v => set('summary', v)}   placeholder="Experienced software engineer with 5+ years…" rows={3} />
          </div>
        )}

        {/* Step 2: Experience */}
        {step === 2 && (
          <div className="space-y-5">
            <h2 className="font-bold text-gray-900 text-lg">Work Experience</h2>
            {data.experience.map((exp, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                {data.experience.length > 1 && (
                  <button onClick={() => removeExp(i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 text-lg leading-none">✕</button>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Company"        value={exp.company}     onChange={v => updateExp(i, 'company', v)}     placeholder="Acme Inc." />
                  <Field label="Role / Title"   value={exp.role}        onChange={v => updateExp(i, 'role', v)}        placeholder="Senior Developer" />
                </div>
                <Field label="Period"           value={exp.period}      onChange={v => updateExp(i, 'period', v)}      placeholder="Jan 2022 – Present" />
                <Field label="Key Achievements" value={exp.description} onChange={v => updateExp(i, 'description', v)} placeholder="Describe responsibilities and achievements…" rows={3} />
              </div>
            ))}
            <button onClick={addExp} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
              + Add Another Experience
            </button>
          </div>
        )}

        {/* Step 3: Education */}
        {step === 3 && (
          <div className="space-y-5">
            <h2 className="font-bold text-gray-900 text-lg">Education</h2>
            {data.education.map((edu, i) => (
              <div key={i} className="border border-gray-200 rounded-xl p-4 space-y-3 relative">
                {data.education.length > 1 && (
                  <button onClick={() => removeEdu(i)} className="absolute top-3 right-3 text-gray-300 hover:text-red-500 text-lg leading-none">✕</button>
                )}
                <Field label="Institution"      value={edu.institution} onChange={v => updateEdu(i, 'institution', v)} placeholder="MIT" />
                <div className="grid grid-cols-2 gap-3">
                  <Field label="Degree / Field" value={edu.degree}      onChange={v => updateEdu(i, 'degree', v)}      placeholder="B.Sc. Computer Science" />
                  <Field label="Year"           value={edu.year}        onChange={v => updateEdu(i, 'year', v)}        placeholder="2018" />
                </div>
              </div>
            ))}
            <button onClick={addEdu} className="w-full py-2.5 border-2 border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors">
              + Add Another Education
            </button>
          </div>
        )}

        {/* Step 4: Skills */}
        {step === 4 && (
          <div className="space-y-4">
            <h2 className="font-bold text-gray-900 text-lg">Skills</h2>
            <Field
              label="Technical & Soft Skills (comma-separated)"
              value={data.skills}
              onChange={v => set('skills', v)}
              placeholder="React, Node.js, Python, Leadership, Communication…"
              rows={4}
            />
          </div>
        )}

        {/* Step 5: Generate */}
        {step === 5 && (
          <div className="space-y-5">
            <h2 className="font-bold text-gray-900 text-lg">Generate Your Resume</h2>

            {status === 'idle' && (
              <div className="text-center py-6 space-y-3">
                <p className="text-4xl">✨</p>
                <p className="text-gray-600">Everything looks good! Click below to generate your AI-powered resume.</p>
                <Button variant="primary" size="lg" onClick={generate}>Generate Resume</Button>
              </div>
            )}

            {status === 'generating' && (
              <ToolLoadingState title="AI is crafting your resume…" description="This may take 15–30 seconds" />
            )}

            {status === 'done' && result && (
              <div className="space-y-4">
                <div className="border border-gray-200 rounded-xl p-5 max-h-96 overflow-y-auto bg-gray-50">
                  <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{result}</pre>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Button variant="primary"   size="lg" fullWidth onClick={downloadPDF}>Download PDF</Button>
                  <Button variant="secondary" size="lg" fullWidth onClick={() => { setStatus('idle'); setResult('') }}>Regenerate</Button>
                </div>
              </div>
            )}

            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
          </div>
        )}

        {/* Step navigation */}
        {step < 5 && (
          <div className="flex justify-between mt-6 pt-5 border-t border-gray-100">
            <Button variant="secondary" size="md" onClick={() => setStep(s => s - 1)} disabled={step === 1}>
              ← Back
            </Button>
            <Button variant="primary" size="md" onClick={() => setStep(s => s + 1)}>
              {step === 4 ? 'Review →' : 'Next →'}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

export default function ResumeBuilder() {
  const toolMeta = getToolBySlug('resume-builder')

  return (
    <ToolLayout tool={toolMeta} steps={HOW_TO_STEPS} faqs={FAQS}>
      <ProGate
        toolName="AI Resume Builder"
        toolSlug="resume-builder"
        payPerUsePlan="resume_builder"
        payPerUsePrice="1.99"
      >
        <ResumeBuilderTool />
      </ProGate>
    </ToolLayout>
  )
}
