import { useState, useCallback } from 'react';
import TemplateSelector from './TemplateSelector';

const BASE_URL = import.meta.env.VITE_API_URL || 'https://awe-os.onrender.com';

const emptyExp = () => ({ role: '', company: '', duration: '', description: '' });
const emptyEdu = () => ({ degree: '', institution: '', year: '' });

const JOB_TITLES = [
  'Software Engineer', 'Full Stack Developer', 'Frontend Developer', 'Backend Developer',
  'Senior Software Engineer', 'Data Scientist', 'Product Manager', 'UX Designer',
  'DevOps Engineer', 'Cloud Architect', 'Machine Learning Engineer', 'Mobile Developer',
  'QA Engineer', 'Business Analyst', 'Project Manager', 'Technical Lead',
  'Marketing Manager', 'Sales Executive', 'HR Manager', 'Content Writer',
  'Graphic Designer', 'Web Developer', 'Systems Analyst', 'Database Administrator',
  'Cybersecurity Analyst', 'AI Engineer', 'Data Engineer', 'Scrum Master',
];

function calcATSScore(form, skills, experience, education) {
  let score = 0;
  if (form.name?.trim())     score += 8;
  if (form.email?.trim())    score += 7;
  if (form.phone?.trim())    score += 5;
  if (form.jobTitle?.trim()) score += 5;
  const sLen = form.summary?.trim()?.length || 0;
  if (sLen > 30)  score += 5;
  if (sLen > 100) score += 5;
  if (sLen > 200) score += 5;
  score += Math.min(20, skills.length * 4);
  const validExp = experience.filter(e => e.role?.trim() && e.company?.trim());
  score += Math.min(15, validExp.length * 8);
  if (validExp.some(e => e.description?.trim()?.length > 50)) score += 10;
  const validEdu = education.filter(e => e.degree?.trim());
  score += Math.min(10, validEdu.length * 10);
  return Math.min(100, score);
}

/* ── Preview: Section header helper ───────────────────────── */
function PrevSection({ title, color, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color, margin: '0 0 4px' }}>{title}</h2>
      <hr style={{ border: 'none', borderTop: '1px solid #D1D5DB', marginBottom: '8px' }} />
      {children}
    </div>
  );
}

function MinSection({ title, children }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <h2 style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px', color: '#111', margin: '0 0 4px', textAlign: 'center' }}>{title}</h2>
      <hr style={{ border: 'none', borderTop: '1px solid #ccc', marginBottom: '8px' }} />
      {children}
    </div>
  );
}

/* ── Corporate HTML Preview ─────────────────────────────── */
function CorporatePreviewHTML({ form, skills, experience, education }) {
  const skillNames = skills.map(s => (typeof s === 'string' ? s : s.name));
  return (
    <div style={{ fontFamily: 'Georgia,serif', padding: '28px', color: '#1a1a1a', fontSize: '11px', lineHeight: 1.55 }}>
      <div style={{ background: '#1B3A6B', margin: '-28px -28px 20px', padding: '18px 24px', color: '#fff' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, margin: 0 }}>{form.name || 'Your Name'}</h1>
        {form.jobTitle && <p style={{ fontSize: '12px', marginTop: '4px', opacity: 0.85, color: '#93C5FD' }}>{form.jobTitle}</p>}
        <p style={{ fontSize: '10px', marginTop: '5px', opacity: 0.65 }}>{[form.email, form.phone].filter(Boolean).join(' · ')}</p>
      </div>

      {form.summary && (
        <PrevSection title="Summary" color="#2563EB">
          <p style={{ color: '#374151' }}>{form.summary}</p>
        </PrevSection>
      )}

      {experience.some(e => e.role || e.company) && (
        <PrevSection title="Experience" color="#2563EB">
          {experience.filter(e => e.role || e.company).map((exp, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <strong style={{ fontSize: '12px', color: '#111827' }}>{exp.role || '—'}</strong>
                <span style={{ fontSize: '10px', color: '#6B7280' }}>{exp.duration}</span>
              </div>
              {exp.company && <div style={{ color: '#4B5563', marginBottom: '3px', fontSize: '11px' }}>{exp.company}</div>}
              {exp.description && <p style={{ color: '#374151', marginTop: '2px' }}>{exp.description}</p>}
            </div>
          ))}
        </PrevSection>
      )}

      {education.some(e => e.degree || e.institution) && (
        <PrevSection title="Education" color="#2563EB">
          {education.filter(e => e.degree || e.institution).map((edu, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '12px', color: '#111827' }}>{edu.degree || '—'}</strong>
                <span style={{ fontSize: '10px', color: '#6B7280' }}>{edu.year}</span>
              </div>
              {edu.institution && <div style={{ color: '#4B5563', fontSize: '11px' }}>{edu.institution}</div>}
            </div>
          ))}
        </PrevSection>
      )}

      {skillNames.length > 0 && (
        <PrevSection title="Skills" color="#2563EB">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
            {skillNames.map((s, i) => (
              <span key={i} style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: '12px', fontSize: '10px' }}>{s}</span>
            ))}
          </div>
        </PrevSection>
      )}

      {!form.name && !form.email && !form.summary && experience.every(e => !e.role) && (
        <div style={{ textAlign: 'center', padding: '40px 20px', color: '#9CA3AF' }}>
          <div style={{ fontSize: '28px', marginBottom: '8px' }}>📄</div>
          <p style={{ fontSize: '12px' }}>Fill in the form to see your resume here</p>
        </div>
      )}
    </div>
  );
}

/* ── Creative HTML Preview ──────────────────────────────── */
function CreativePreviewHTML({ form, skills, experience, education }) {
  const skillNames = skills.map(s => (typeof s === 'string' ? s : s.name));
  return (
    <div style={{ fontFamily: 'Arial,sans-serif', display: 'flex', minHeight: '842px', fontSize: '11px' }}>
      <div style={{ width: '38%', background: '#1A1F36', color: '#fff', padding: '20px 14px', flexShrink: 0 }}>
        <div style={{ background: '#12172A', margin: '-20px -14px 16px', padding: '20px 14px' }}>
          <h1 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>{form.name || 'Your Name'}</h1>
          {form.jobTitle && <p style={{ fontSize: '10px', color: '#14B8A6', marginTop: '4px' }}>{form.jobTitle}</p>}
        </div>
        {(form.email || form.phone) && (
          <div style={{ marginBottom: '14px' }}>
            <h3 style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#14B8A6', marginBottom: '6px' }}>Contact</h3>
            {form.email && <p style={{ color: '#CBD5E1', marginBottom: '3px', wordBreak: 'break-all', fontSize: '10px' }}>{form.email}</p>}
            {form.phone && <p style={{ color: '#CBD5E1', fontSize: '10px' }}>{form.phone}</p>}
          </div>
        )}
        {skillNames.length > 0 && (
          <div>
            <h3 style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#14B8A6', marginBottom: '6px' }}>Skills</h3>
            {skillNames.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <div style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#14B8A6', flexShrink: 0 }} />
                <span style={{ color: '#CBD5E1', fontSize: '10px' }}>{s}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ flex: 1, padding: '20px 16px', background: '#fff' }}>
        {form.summary && (
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#0D9488', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '6px' }}>Profile</h2>
            <p style={{ color: '#374151' }}>{form.summary}</p>
          </div>
        )}
        {experience.some(e => e.role || e.company) && (
          <div style={{ marginBottom: '14px' }}>
            <h2 style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#0D9488', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '6px' }}>Experience</h2>
            {experience.filter(e => e.role || e.company).map((exp, i) => (
              <div key={i} style={{ marginBottom: '10px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#1E293B', fontSize: '12px' }}>{exp.role}</strong>
                  <span style={{ color: '#0D9488', fontSize: '10px' }}>{exp.duration}</span>
                </div>
                {exp.company && <div style={{ color: '#64748B', marginBottom: '3px', fontSize: '10px' }}>{exp.company}</div>}
                {exp.description && <p style={{ color: '#374151' }}>{exp.description}</p>}
              </div>
            ))}
          </div>
        )}
        {education.some(e => e.degree || e.institution) && (
          <div>
            <h2 style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: '#0D9488', borderBottom: '1px solid #E2E8F0', paddingBottom: '4px', marginBottom: '6px' }}>Education</h2>
            {education.filter(e => e.degree || e.institution).map((edu, i) => (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <strong style={{ color: '#1E293B', fontSize: '12px' }}>{edu.degree}</strong>
                  <span style={{ color: '#6B7280', fontSize: '10px' }}>{edu.year}</span>
                </div>
                {edu.institution && <div style={{ color: '#64748B', fontSize: '10px' }}>{edu.institution}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Minimal HTML Preview ────────────────────────────────── */
function MinimalPreviewHTML({ form, skills, experience, education }) {
  const skillNames = skills.map(s => (typeof s === 'string' ? s : s.name));
  return (
    <div style={{ fontFamily: '"Times New Roman",serif', padding: '32px', color: '#111', fontSize: '11px', lineHeight: 1.6, background: '#fff', minHeight: '842px' }}>
      <div style={{ textAlign: 'center', marginBottom: '20px', paddingBottom: '12px', borderBottom: '2px solid #111' }}>
        <h1 style={{ fontSize: '22px', fontWeight: 400, letterSpacing: '4px', textTransform: 'uppercase', margin: 0 }}>{form.name || 'YOUR NAME'}</h1>
        {form.jobTitle && <p style={{ fontSize: '11px', letterSpacing: '2px', color: '#555', marginTop: '4px' }}>{form.jobTitle}</p>}
        <p style={{ fontSize: '10px', color: '#555', marginTop: '6px' }}>{[form.email, form.phone].filter(Boolean).join(' · ')}</p>
      </div>

      {form.summary && <MinSection title="Summary"><p style={{ color: '#333', textAlign: 'justify' }}>{form.summary}</p></MinSection>}

      {experience.some(e => e.role || e.company) && (
        <MinSection title="Experience">
          {experience.filter(e => e.role || e.company).map((exp, i) => (
            <div key={i} style={{ marginBottom: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '12px' }}>{exp.role}</strong>
                <span style={{ fontSize: '10px', color: '#777', fontStyle: 'italic' }}>{exp.duration}</span>
              </div>
              {exp.company && <div style={{ color: '#555', fontStyle: 'italic', marginBottom: '3px', fontSize: '10px' }}>{exp.company}</div>}
              {exp.description && <p style={{ color: '#333' }}>{exp.description}</p>}
            </div>
          ))}
        </MinSection>
      )}

      {education.some(e => e.degree || e.institution) && (
        <MinSection title="Education">
          {education.filter(e => e.degree || e.institution).map((edu, i) => (
            <div key={i} style={{ marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <strong style={{ fontSize: '12px' }}>{edu.degree}</strong>
                <span style={{ fontSize: '10px', color: '#777', fontStyle: 'italic' }}>{edu.year}</span>
              </div>
              {edu.institution && <div style={{ color: '#555', fontStyle: 'italic', fontSize: '10px' }}>{edu.institution}</div>}
            </div>
          ))}
        </MinSection>
      )}

      {skillNames.length > 0 && (
        <MinSection title="Skills">
          <p style={{ color: '#333', textAlign: 'center' }}>{skillNames.join(' · ')}</p>
        </MinSection>
      )}
    </div>
  );
}

const PREVIEW_COMPS = { corporate: CorporatePreviewHTML, creative: CreativePreviewHTML, minimal: MinimalPreviewHTML };

const STEPS = [
  { label: 'Personal',   icon: '👤' },
  { label: 'Experience', icon: '💼' },
  { label: 'Education',  icon: '🎓' },
  { label: 'Skills',     icon: '⚡' },
];

/* ── Main Component ─────────────────────────────────────── */
export default function ResumeForm({ isPremium, onUpgradeClick }) {
  const [template, setTemplate]         = useState('corporate');
  const [activeStep, setActiveStep]     = useState(0);
  const [showTplPicker, setShowTplPicker] = useState(false);
  const [form, setForm]                 = useState({ name: '', email: '', phone: '', jobTitle: '', summary: '' });
  const [skills, setSkills]             = useState([]);
  const [skillInput, setSkillInput]     = useState('');
  const [experience, setExperience]     = useState([emptyExp()]);
  const [education, setEducation]       = useState([emptyEdu()]);
  const [loading, setLoading]           = useState(false);
  const [aiLoading, setAiLoading]       = useState(false);
  const [error, setError]               = useState('');
  const [successMsg, setSuccessMsg]     = useState('');
  const [previewZoom, setPreviewZoom]   = useState(0.82);
  const [mobileTab, setMobileTab]       = useState('edit');
  const [titleSuggestions, setTitleSuggestions] = useState([]);
  const [showTitleDropdown, setShowTitleDropdown] = useState(false);

  const skillNames = skills.map(s => (typeof s === 'string' ? s : s.name));
  const atsScore   = calcATSScore(form, skills, experience, education);
  const atsColor   = atsScore >= 80 ? '#22c55e' : atsScore >= 60 ? '#eab308' : '#ef4444';
  const atsLabel   = atsScore >= 80 ? 'Excellent ✅' : atsScore >= 60 ? 'Good' : 'Needs Work';

  const PreviewComp = PREVIEW_COMPS[template] || PREVIEW_COMPS.corporate;

  const setField = (key) => (e) => setForm(f => ({ ...f, [key]: e.target.value }));

  /* Skills */
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skillNames.includes(s)) setSkills(prev => [...prev, s]);
    setSkillInput('');
  };
  const removeSkill = (i) => setSkills(prev => prev.filter((_, idx) => idx !== i));
  const onSkillKey  = (e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } };

  /* Experience */
  const setExp = (i, key) => (e) =>
    setExperience(prev => prev.map((x, idx) => idx === i ? { ...x, [key]: e.target.value } : x));
  const addExp    = () => setExperience(prev => [...prev, emptyExp()]);
  const removeExp = (i) => setExperience(prev => prev.filter((_, idx) => idx !== i));

  /* Education */
  const setEdu = (i, key) => (e) =>
    setEducation(prev => prev.map((x, idx) => idx === i ? { ...x, [key]: e.target.value } : x));
  const addEdu    = () => setEducation(prev => [...prev, emptyEdu()]);
  const removeEdu = (i) => setEducation(prev => prev.filter((_, idx) => idx !== i));

  /* Job title suggestions */
  const onJobTitleChange = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, jobTitle: val }));
    if (val.length > 1) {
      const matches = JOB_TITLES.filter(t => t.toLowerCase().includes(val.toLowerCase())).slice(0, 5);
      setTitleSuggestions(matches);
      setShowTitleDropdown(matches.length > 0);
    } else {
      setShowTitleDropdown(false);
    }
  };

  /* AI Summary */
  const handleAISummary = useCallback(async () => {
    if (!form.jobTitle?.trim() && !form.name?.trim()) {
      setError('Enter a job title first to generate summary');
      setTimeout(() => setError(''), 2500);
      return;
    }
    setAiLoading(true);
    try {
      const token = localStorage.getItem('awe_token');
      const res = await fetch(`${BASE_URL}/api/tools/resume/ai-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          job_title:        form.jobTitle || form.name,
          skills:           skillNames,
          experience_years: experience.filter(e => e.role?.trim()).length,
        }),
      });
      if (!res.ok) throw new Error('AI service unavailable');
      const data = await res.json();
      if (data.summary) {
        setForm(f => ({ ...f, summary: data.summary }));
        setSuccessMsg('✨ AI summary generated!');
        setTimeout(() => setSuccessMsg(''), 2500);
      }
    } catch {
      setError('AI summary unavailable — write manually or try again.');
      setTimeout(() => setError(''), 3000);
    } finally {
      setAiLoading(false);
    }
  }, [form.jobTitle, form.name, skillNames, experience]);

  /* Download PDF */
  const handleDownload = useCallback(async () => {
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }
    setLoading(true);
    try {
      const token = localStorage.getItem('awe_token');
      const res = await fetch(`${BASE_URL}/api/generate-resume`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ ...form, template, skills: skillNames, experience, education }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate resume');
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = `${form.name.replace(/\s+/g, '_')}_Resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setSuccessMsg('✅ Resume downloaded!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [form, template, skillNames, experience, education]);

  const tplName = template.charAt(0).toUpperCase() + template.slice(1);

  /* ── Render ─────────────────────────────────────────────── */
  return (
    <div className="resume-builder">

      {/* ── MOBILE TABS ── */}
      <div className="mobile-tabs">
        <button className={`mob-tab ${mobileTab === 'edit' ? 'active' : ''}`} onClick={() => setMobileTab('edit')}>✏️ Edit Form</button>
        <button className={`mob-tab ${mobileTab === 'preview' ? 'active' : ''}`} onClick={() => setMobileTab('preview')}>👁 Preview</button>
      </div>

      {/* ══════════════════ LEFT PANEL ══════════════════ */}
      <div className={`builder-left ${mobileTab === 'preview' ? 'mob-hidden' : ''}`}>

        {/* Template toggle */}
        <div className="template-toggle-bar" onClick={() => setShowTplPicker(v => !v)}>
          <span>🎨 Template: <strong>{tplName}</strong></span>
          <span className="toggle-chevron">{showTplPicker ? '▲' : '▼'}</span>
        </div>

        {showTplPicker && (
          <TemplateSelector
            value={template}
            onChange={(t) => { setTemplate(t); setShowTplPicker(false); }}
            isPremium={isPremium}
            onUpgradeClick={onUpgradeClick}
          />
        )}

        {/* Step progress */}
        <div className="step-progress">
          {STEPS.map((step, i) => (
            <button
              key={i}
              className={`step-dot ${i === activeStep ? 'active' : i < activeStep ? 'done' : ''}`}
              onClick={() => setActiveStep(i)}
              type="button"
            >
              <span className="step-icon">{i < activeStep ? '✓' : step.icon}</span>
              <span className="step-label">{step.label}</span>
            </button>
          ))}
        </div>
        <div className="step-progress-bar">
          <div className="step-progress-fill" style={{ width: `${((activeStep + 1) / STEPS.length) * 100}%` }} />
        </div>

        {/* ── Step content ── */}
        <div className="step-content">

          {/* STEP 0: Personal Info */}
          {activeStep === 0 && (
            <div className="step-panel">
              <div className="field-dark">
                <label>Full Name *</label>
                <input
                  className="input-dark"
                  value={form.name}
                  onChange={setField('name')}
                  placeholder="John Doe"
                />
                {form.name && <span className="field-check">✓</span>}
              </div>

              <div className="field-dark">
                <label>Job Title</label>
                <input
                  className="input-dark"
                  value={form.jobTitle}
                  onChange={onJobTitleChange}
                  onBlur={() => setTimeout(() => setShowTitleDropdown(false), 180)}
                  placeholder="Software Engineer"
                  autoComplete="off"
                />
                {showTitleDropdown && (
                  <div className="title-suggestions">
                    {titleSuggestions.map((t, i) => (
                      <button
                        key={i}
                        className="title-suggestion-item"
                        type="button"
                        onMouseDown={() => { setForm(f => ({ ...f, jobTitle: t })); setShowTitleDropdown(false); }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="form-row-dark">
                <div className="field-dark">
                  <label>Email</label>
                  <input className="input-dark" type="email" value={form.email} onChange={setField('email')} placeholder="john@example.com" />
                  {form.email && <span className="field-check">✓</span>}
                </div>
                <div className="field-dark">
                  <label>Phone</label>
                  <input className="input-dark" value={form.phone} onChange={setField('phone')} placeholder="+1 555 000 0000" />
                  {form.phone && <span className="field-check">✓</span>}
                </div>
              </div>

              <div className="field-dark">
                <div className="field-header">
                  <label>Professional Summary</label>
                  <button className="btn-ai" type="button" onClick={handleAISummary} disabled={aiLoading}>
                    {aiLoading ? <span className="ai-spinner" /> : '✨'} Write with AI
                  </button>
                </div>
                <textarea
                  className="input-dark"
                  value={form.summary}
                  onChange={setField('summary')}
                  placeholder="Brief overview of your career and goals… (max 300 chars)"
                  rows={4}
                  maxLength={300}
                />
                <div className="char-count">
                  <span className={form.summary.length > 270 ? 'char-warn' : ''}>{form.summary.length}/300</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 1: Experience */}
          {activeStep === 1 && (
            <div className="step-panel">
              {experience.map((exp, i) => (
                <div key={i} className="entry-card">
                  <div className="entry-card-header">
                    <span className="entry-card-title">{exp.role || `Position ${i + 1}`}</span>
                    {experience.length > 1 && (
                      <button type="button" className="btn-remove-dark" onClick={() => removeExp(i)}>✕</button>
                    )}
                  </div>
                  <div className="form-row-dark">
                    <div className="field-dark">
                      <label>Job Title</label>
                      <input className="input-dark" value={exp.role} onChange={setExp(i, 'role')} placeholder="Software Engineer" />
                    </div>
                    <div className="field-dark">
                      <label>Company</label>
                      <input className="input-dark" value={exp.company} onChange={setExp(i, 'company')} placeholder="Acme Corp" />
                    </div>
                  </div>
                  <div className="field-dark">
                    <label>Duration</label>
                    <input className="input-dark" value={exp.duration} onChange={setExp(i, 'duration')} placeholder="Jan 2021 – Present" />
                  </div>
                  <div className="field-dark">
                    <label>Key Achievements &amp; Responsibilities</label>
                    <textarea
                      className="input-dark"
                      value={exp.description}
                      onChange={setExp(i, 'description')}
                      placeholder={`• Led a team of 5 engineers\n• Increased performance by 40%\n• Shipped 3 major product features`}
                      rows={4}
                    />
                  </div>
                </div>
              ))}
              <button type="button" className="btn-add-dark" onClick={addExp}>+ Add Experience</button>
            </div>
          )}

          {/* STEP 2: Education */}
          {activeStep === 2 && (
            <div className="step-panel">
              {education.map((edu, i) => (
                <div key={i} className="entry-card">
                  <div className="entry-card-header">
                    <span className="entry-card-title">{edu.degree || `Qualification ${i + 1}`}</span>
                    {education.length > 1 && (
                      <button type="button" className="btn-remove-dark" onClick={() => removeEdu(i)}>✕</button>
                    )}
                  </div>
                  <div className="form-row-dark">
                    <div className="field-dark">
                      <label>Degree / Certification</label>
                      <input className="input-dark" value={edu.degree} onChange={setEdu(i, 'degree')} placeholder="B.Sc. Computer Science" />
                    </div>
                    <div className="field-dark">
                      <label>Institution</label>
                      <input className="input-dark" value={edu.institution} onChange={setEdu(i, 'institution')} placeholder="State University" />
                    </div>
                  </div>
                  <div className="field-dark" style={{ maxWidth: '200px' }}>
                    <label>Year</label>
                    <input className="input-dark" value={edu.year} onChange={setEdu(i, 'year')} placeholder="2020" />
                  </div>
                </div>
              ))}
              <button type="button" className="btn-add-dark" onClick={addEdu}>+ Add Education</button>
            </div>
          )}

          {/* STEP 3: Skills */}
          {activeStep === 3 && (
            <div className="step-panel">
              <div className="field-dark">
                <label>Add Skills (press Enter or click Add)</label>
                <div className="skill-input-row-dark">
                  <input
                    className="input-dark"
                    value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={onSkillKey}
                    placeholder="Type a skill and press Enter…"
                  />
                  <button type="button" className="btn-add-skill" onClick={addSkill}>+ Add</button>
                </div>
              </div>

              {skills.length > 0 && (
                <div className="skills-cloud">
                  {skills.map((s, i) => (
                    <span key={i} className="skill-pill">
                      {typeof s === 'string' ? s : s.name}
                      <button type="button" onClick={() => removeSkill(i)} aria-label="Remove skill">×</button>
                    </span>
                  ))}
                </div>
              )}

              {skills.length === 0 && (
                <div className="skills-empty">
                  <p style={{ marginBottom: '8px' }}>Quick-add popular skills:</p>
                  <div className="skill-suggestions">
                    {['JavaScript', 'React', 'Python', 'SQL', 'Node.js', 'TypeScript', 'Leadership', 'Communication', 'Agile', 'Git'].map(s => (
                      <button
                        key={s}
                        className="skill-suggestion"
                        type="button"
                        onClick={() => { if (!skillNames.includes(s)) setSkills(prev => [...prev, s]); }}
                      >
                        + {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step navigation */}
        <div className="step-nav">
          <button
            type="button"
            className="btn-step-nav prev"
            onClick={() => setActiveStep(s => Math.max(0, s - 1))}
            disabled={activeStep === 0}
          >
            ← Prev
          </button>
          <span className="step-counter">{activeStep + 1} / {STEPS.length}</span>
          {activeStep < STEPS.length - 1 ? (
            <button
              type="button"
              className="btn-step-nav next"
              onClick={() => setActiveStep(s => Math.min(STEPS.length - 1, s + 1))}
            >
              Next →
            </button>
          ) : (
            <button type="button" className="btn-download-nav" onClick={handleDownload} disabled={loading}>
              {loading ? '⏳ Generating…' : '📥 Download PDF'}
            </button>
          )}
        </div>

        {error      && <p className="error-msg-dark">{error}</p>}
        {successMsg && <p className="success-msg-dark">{successMsg}</p>}
      </div>

      {/* ══════════════════ RIGHT PANEL ══════════════════ */}
      <div className={`builder-right ${mobileTab === 'edit' ? 'mob-hidden' : ''}`}>

        {/* Preview Toolbar */}
        <div className="preview-toolbar">
          <div className="preview-ats">
            <span style={{ color: atsColor }}>ATS: {atsScore}/100</span>
            <span className="ats-label" style={{ color: atsColor }}>— {atsLabel}</span>
          </div>
          <div className="preview-zoom-controls">
            <button className="zoom-btn" type="button" onClick={() => setPreviewZoom(z => Math.max(0.4, +(z - 0.1).toFixed(1)))}>−</button>
            <span className="zoom-level">{Math.round(previewZoom * 100)}%</span>
            <button className="zoom-btn" type="button" onClick={() => setPreviewZoom(z => Math.min(1.5, +(z + 0.1).toFixed(1)))}>+</button>
          </div>
          <button className="btn-download-toolbar" type="button" onClick={handleDownload} disabled={loading}>
            {loading ? '⏳…' : '📥 Download PDF'}
          </button>
        </div>

        {/* ATS Score Bar */}
        <div className="ats-bar-container">
          <div className="ats-bar-track">
            <div className="ats-bar-fill" style={{ width: `${atsScore}%`, background: atsColor }} />
          </div>
          <div className="ats-tips">
            {atsScore < 60 && <span className="ats-tip">💡 Complete all sections and add 5+ skills to boost your score</span>}
            {atsScore >= 60 && atsScore < 80 && <span className="ats-tip">💡 Add metrics to your experience descriptions for a higher score</span>}
            {atsScore >= 80 && <span className="ats-tip">✅ Great score! Your resume is well-optimized for ATS systems</span>}
          </div>
        </div>

        {/* A4 Paper Preview */}
        <div className="a4-preview-wrapper">
          <div className="a4-paper" style={{ transform: `scale(${previewZoom})`, transformOrigin: 'top center' }}>
            <PreviewComp form={form} skills={skills} experience={experience} education={education} />
          </div>
        </div>
      </div>

      {/* Mobile Bottom Bar */}
      <div className="mobile-bottom-bar">
        <button className="mob-save-btn" type="button" onClick={() => {}}>💾 Save Draft</button>
        <button className="mob-download-btn" type="button" onClick={handleDownload} disabled={loading}>
          {loading ? '⏳ Generating…' : '📥 Download PDF'}
        </button>
      </div>
    </div>
  );
}
