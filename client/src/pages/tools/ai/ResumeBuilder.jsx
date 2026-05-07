import { useState } from 'react'
import { Helmet } from 'react-helmet-async'
import { jsPDF } from 'jspdf'
import api from '../../../services/api.service'

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

function Field({ label, value, onChange, placeholder, type = 'text', rows }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-gray-700 mb-1">{label}</label>
      {rows ? (
        <textarea value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      ) : (
        <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
          className="w-full px-3 py-2 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      )}
    </div>
  )
}

export default function ResumeBuilder() {
  const [step, setStep]       = useState(1)
  const [data, setData]       = useState(EMPTY)
  const [result, setResult]   = useState('')
  const [status, setStatus]   = useState('idle')
  const [error, setError]     = useState('')

  const set = (key, val) => setData(prev => ({ ...prev, [key]: val }))

  const updateExp = (i, key, val) => {
    const exp = [...data.experience]
    exp[i] = { ...exp[i], [key]: val }
    setData(prev => ({ ...prev, experience: exp }))
  }
  const addExp = () => setData(prev => ({ ...prev, experience: [...prev.experience, { company: '', role: '', period: '', description: '' }] }))
  const removeExp = (i) => setData(prev => ({ ...prev, experience: prev.experience.filter((_, idx) => idx !== i) }))

  const updateEdu = (i, key, val) => {
    const edu = [...data.education]
    edu[i] = { ...edu[i], [key]: val }
    setData(prev => ({ ...prev, education: edu }))
  }
  const addEdu = () => setData(prev => ({ ...prev, education: [...prev.education, { institution: '', degree: '', year: '' }] }))
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
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const margin = 15
    const maxW   = doc.internal.pageSize.getWidth() - margin * 2
    let y = margin
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    const lines = result.split('\n')
    for (const line of lines) {
      const wrapped = doc.splitTextToSize(line || ' ', maxW)
      for (const wl of wrapped) {
        if (y > doc.internal.pageSize.getHeight() - margin) { doc.addPage(); y = margin }
        if (line.startsWith('#')) { doc.setFont('helvetica', 'bold'); doc.setFontSize(13) }
        else if (line.startsWith('##')) { doc.setFont('helvetica', 'bold'); doc.setFontSize(11) }
        else { doc.setFont('helvetica', 'normal'); doc.setFontSize(10) }
        doc.text(wl.replace(/^#+\s*/, ''), margin, y)
        y += 6
      }
      y += 1
    }
    doc.save(`${data.fullName || 'resume'}.pdf`)
  }

  return (
    <>
      <Helmet>
        <title>AI Resume Builder — AWE-OS Free Tools</title>
        <meta name="description" content="Build a professional resume with AI in minutes. Free, no sign-up required." />
      </Helmet>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <span className="text-4xl mb-3 block">📄</span>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">AI Resume Builder</h1>
          <p className="text-gray-500 text-sm">Fill in your details and let AI craft a professional resume for you.</p>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
          {STEPS_META.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <button
                onClick={() => step > s.id || status === 'done' ? setStep(s.id) : null}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  step === s.id ? 'bg-blue-600 text-white' :
                  step > s.id ? 'bg-blue-100 text-blue-700 cursor-pointer' : 'bg-gray-100 text-gray-400'
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
              <Field label="Full Name" value={data.fullName} onChange={v => set('fullName', v)} placeholder="Jane Smith" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email" type="email" value={data.email} onChange={v => set('email', v)} placeholder="jane@example.com" />
                <Field label="Phone" value={data.phone} onChange={v => set('phone', v)} placeholder="+1 555 000 0000" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Location" value={data.location} onChange={v => set('location', v)} placeholder="New York, NY" />
                <Field label="LinkedIn" value={data.linkedin} onChange={v => set('linkedin', v)} placeholder="linkedin.com/in/jane" />
              </div>
              <Field label="Professional Summary" value={data.summary} onChange={v => set('summary', v)} placeholder="Experienced software engineer with 5+ years…" rows={3} />
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
                    <Field label="Company" value={exp.company} onChange={v => updateExp(i, 'company', v)} placeholder="Acme Inc." />
                    <Field label="Role / Title" value={exp.role} onChange={v => updateExp(i, 'role', v)} placeholder="Senior Developer" />
                  </div>
                  <Field label="Period" value={exp.period} onChange={v => updateExp(i, 'period', v)} placeholder="Jan 2022 – Present" />
                  <Field label="Key Achievements" value={exp.description} onChange={v => updateExp(i, 'description', v)} placeholder="Describe your responsibilities and achievements…" rows={3} />
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
                  <Field label="Institution" value={edu.institution} onChange={v => updateEdu(i, 'institution', v)} placeholder="MIT" />
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Degree / Field" value={edu.degree} onChange={v => updateEdu(i, 'degree', v)} placeholder="B.Sc. Computer Science" />
                    <Field label="Year" value={edu.year} onChange={v => updateEdu(i, 'year', v)} placeholder="2018" />
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
              <Field label="Technical & Soft Skills (comma-separated)" value={data.skills} onChange={v => set('skills', v)} placeholder="React, Node.js, Python, Leadership, Communication…" rows={4} />
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
                  <button onClick={generate}
                    className="px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors">
                    Generate Resume
                  </button>
                </div>
              )}
              {status === 'generating' && (
                <div className="text-center py-10">
                  <div className="w-10 h-10 border-3 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ borderWidth: 3 }} />
                  <p className="text-gray-500">AI is crafting your resume…</p>
                </div>
              )}
              {status === 'done' && result && (
                <div className="space-y-4">
                  <div className="border border-gray-200 rounded-xl p-5 max-h-96 overflow-y-auto bg-gray-50">
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{result}</pre>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={downloadPDF}
                      className="py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
                      Download PDF
                    </button>
                    <button onClick={() => { setStatus('idle'); setResult('') }}
                      className="py-3 border border-gray-300 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-colors text-sm">
                      Regenerate
                    </button>
                  </div>
                </div>
              )}
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}
            </div>
          )}

          {/* Navigation */}
          {step < 5 && (
            <div className="flex justify-between mt-6 pt-5 border-t border-gray-100">
              <button
                onClick={() => setStep(s => s - 1)}
                disabled={step === 1}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-medium hover:bg-gray-50 disabled:opacity-40 transition-colors"
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(s => s + 1)}
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {step === 4 ? 'Review →' : 'Next →'}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
