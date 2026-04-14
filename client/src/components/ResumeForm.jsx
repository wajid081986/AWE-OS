import { useState } from 'react';
import TemplateSelector from './TemplateSelector';

const emptyExp = () => ({ role: '', company: '', duration: '', description: '' });
const emptyEdu = () => ({ degree: '', institution: '', year: '' });

export default function ResumeForm({ isPremium, onUpgradeClick }) {
  const [template, setTemplate] = useState('corporate');
  const [form, setForm] = useState({ name: '', email: '', phone: '', summary: '' });
  const [skills, setSkills] = useState([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState([emptyExp()]);
  const [education, setEducation] = useState([emptyEdu()]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setField = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // Skills
  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !skills.includes(s)) setSkills((prev) => [...prev, s]);
    setSkillInput('');
  };
  const removeSkill = (i) => setSkills((prev) => prev.filter((_, idx) => idx !== i));
  const onSkillKey = (e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } };

  // Experience
  const setExp = (i, key) => (e) =>
    setExperience((prev) => prev.map((x, idx) => idx === i ? { ...x, [key]: e.target.value } : x));
  const addExp = () => setExperience((prev) => [...prev, emptyExp()]);
  const removeExp = (i) => setExperience((prev) => prev.filter((_, idx) => idx !== i));

  // Education
  const setEdu = (i, key) => (e) =>
    setEducation((prev) => prev.map((x, idx) => idx === i ? { ...x, [key]: e.target.value } : x));
  const addEdu = () => setEducation((prev) => [...prev, emptyEdu()]);
  const removeEdu = (i) => setEducation((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.name.trim()) { setError('Name is required.'); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/generate-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, template, isPremium, skills, experience, education }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to generate resume');
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${form.name.replace(/\s+/g, '_')}_Resume.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Template Picker */}
      <TemplateSelector value={template} onChange={setTemplate} isPremium={isPremium} onUpgradeClick={onUpgradeClick} />

      {/* Personal Info */}
      <div className="card">
        <h2>Personal Information</h2>
        <div className="form-row">
          <div className="field">
            <label>Full Name *</label>
            <input value={form.name} onChange={setField('name')} placeholder="John Doe" />
          </div>
          <div className="field">
            <label>Email</label>
            <input type="email" value={form.email} onChange={setField('email')} placeholder="john@example.com" />
          </div>
        </div>
        <div className="field">
          <label>Phone</label>
          <input value={form.phone} onChange={setField('phone')} placeholder="+1 555 000 0000" />
        </div>
        <div className="field">
          <label>Professional Summary</label>
          <textarea
            value={form.summary}
            onChange={setField('summary')}
            placeholder="Brief overview of your career and goals..."
            rows={3}
          />
        </div>
      </div>

      {/* Skills */}
      <div className="card">
        <h2>Skills</h2>
        <div className="skill-input-row">
          <input
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={onSkillKey}
            placeholder="Type a skill and press Enter"
          />
          <button type="button" className="btn btn-add" onClick={addSkill}>+ Add</button>
        </div>
        {skills.length > 0 && (
          <div className="skills-list">
            {skills.map((s, i) => (
              <span key={i} className="skill-tag">
                {s}
                <button type="button" onClick={() => removeSkill(i)} aria-label="Remove">×</button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Experience */}
      <div className="card">
        <h2>Experience</h2>
        {experience.map((exp, i) => (
          <div key={i} className="entry-block">
            {experience.length > 1 && (
              <button type="button" className="btn-remove" onClick={() => removeExp(i)} aria-label="Remove">×</button>
            )}
            <div className="form-row">
              <div className="field">
                <label>Job Title</label>
                <input value={exp.role} onChange={setExp(i, 'role')} placeholder="Software Engineer" />
              </div>
              <div className="field">
                <label>Company</label>
                <input value={exp.company} onChange={setExp(i, 'company')} placeholder="Acme Corp" />
              </div>
            </div>
            <div className="field">
              <label>Duration</label>
              <input value={exp.duration} onChange={setExp(i, 'duration')} placeholder="Jan 2021 – Present" />
            </div>
            <div className="field">
              <label>Description</label>
              <textarea
                value={exp.description}
                onChange={setExp(i, 'description')}
                placeholder="Key responsibilities and achievements..."
                rows={3}
              />
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-add" onClick={addExp}>+ Add Experience</button>
      </div>

      {/* Education */}
      <div className="card">
        <h2>Education</h2>
        {education.map((edu, i) => (
          <div key={i} className="entry-block">
            {education.length > 1 && (
              <button type="button" className="btn-remove" onClick={() => removeEdu(i)} aria-label="Remove">×</button>
            )}
            <div className="form-row">
              <div className="field">
                <label>Degree / Certification</label>
                <input value={edu.degree} onChange={setEdu(i, 'degree')} placeholder="B.Sc. Computer Science" />
              </div>
              <div className="field">
                <label>Institution</label>
                <input value={edu.institution} onChange={setEdu(i, 'institution')} placeholder="State University" />
              </div>
            </div>
            <div className="field">
              <label>Year</label>
              <input value={edu.year} onChange={setEdu(i, 'year')} placeholder="2020" />
            </div>
          </div>
        ))}
        <button type="button" className="btn btn-add" onClick={addEdu}>+ Add Education</button>
      </div>

      {/* Submit */}
      <div className="submit-area">
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Generating PDF...' : '⬇ Download PDF Resume'}
        </button>
        {error && <p className="error-msg">{error}</p>}
      </div>
    </form>
  );
}
