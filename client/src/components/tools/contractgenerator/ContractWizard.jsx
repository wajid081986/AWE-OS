import { useState } from 'react'
import ContractTemplateSelector from './ContractTemplateSelector'
import ContractPreview from './ContractPreview'
import ClauseEditor from './ClauseEditor'
import PDFDocument from './PDFDocument'
import { useContractForm } from '../../../hooks/useContractForm'
import { getContractTemplate } from '../../../utils/contractTemplates'
import { runComplianceCheck } from '../../../utils/indianLegalCompliance'
import { STEP_FIELDS } from '../../../utils/contractValidator'

const STEPS = [
  { n: 1, title: 'Parties',       icon: '👥' },
  { n: 2, title: 'Project Terms', icon: '💼' },
  { n: 3, title: 'Legal Terms',   icon: '⚖️' },
  { n: 4, title: 'Review',        icon: '📄' },
]

const PAYMENT_TERMS = [
  'Net 15', 'Net 30', '50% Advance + 50% on Delivery',
  'Monthly Retainer', 'Milestone-Based', 'On Completion',
]
const JURISDICTIONS = [
  'Mumbai, Maharashtra', 'Delhi, Delhi', 'Bangalore, Karnataka',
  'Chennai, Tamil Nadu', 'Kolkata, West Bengal', 'Pune, Maharashtra',
  'Hyderabad, Telangana', 'Ahmedabad, Gujarat', 'Jaipur, Rajasthan',
  'Lucknow, Uttar Pradesh',
]
const CONFIDENTIALITY_OPTS = [
  'Standard - General business information',
  'High - Proprietary data and trade secrets',
  'Critical - Highly sensitive classified information',
]
const TERMINATION_OPTS = [
  '7 days written notice', '15 days written notice',
  '30 days written notice', '60 days written notice',
]
const IP_OPTS = [
  'Client owns all IP',
  'Freelancer retains IP',
  'Shared ownership (50/50)',
  'Client owns deliverables, Freelancer retains methods',
]
const DISPUTE_OPTS = [
  'Mutual negotiation first, then arbitration',
  'Arbitration under Arbitration and Conciliation Act 1996',
  'Court proceedings only',
  'Mediation then arbitration',
]
const LIABILITY_OPTS = [
  'Equal to contract value', '50% of contract value',
  '3 months of fees', 'Unlimited', 'No liability clause',
]

// ── Shared style constants ─────────────────────────────────────────────────────

const INPUT    = 'w-full bg-white/5 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors'
const TEXTAREA = INPUT + ' resize-none'
const SELECT   = 'w-full bg-slate-800 border border-white/20 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors cursor-pointer'
const LABEL    = 'block text-sm font-medium text-gray-300 mb-1.5'
const ERR      = 'text-xs text-red-400 mt-1'
const REQ      = <span className="text-red-400 ml-0.5">*</span>

function Field({ label, required, error, children, hint }) {
  return (
    <div>
      <label className={LABEL}>{label}{required && REQ}</label>
      {children}
      {hint && !error && <p className="text-xs text-gray-500 mt-1">{hint}</p>}
      {error && <p className={ERR}>{error}</p>}
    </div>
  )
}

function NativeSelect({ name, options, placeholder, value, onChange }) {
  return (
    <select name={name} value={value || ''} onChange={e => onChange(e.target.value)} className={SELECT}>
      <option value="" disabled>{placeholder || 'Select…'}</option>
      {options.map(opt => (
        <option key={opt} value={opt} className="bg-slate-800 text-white">{opt}</option>
      ))}
    </select>
  )
}

// ── Step 1: Parties ────────────────────────────────────────────────────────────

function Step1({ register, setValue, errors, watch }) {
  const contractType = watch('contractType')
  return (
    <div className="space-y-6">
      <ContractTemplateSelector
        value={contractType}
        onChange={val => setValue('contractType', val)}
        error={errors.contractType?.message}
      />

      {contractType && (
        <>
          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-blue-300 mb-4">Your Details (Service Provider)</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Your Full Name" required error={errors.freelancerName?.message}>
                <input {...register('freelancerName')} className={INPUT} placeholder="Rahul Sharma" />
              </Field>
              <Field label="Your PAN Number" error={errors.freelancerPAN?.message} hint="e.g. ABCDE1234F — used for TDS compliance">
                <input {...register('freelancerPAN')} className={INPUT} placeholder="ABCDE1234F" maxLength={10} style={{ textTransform: 'uppercase' }} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Your Complete Address" required error={errors.freelancerAddress?.message}>
                  <textarea {...register('freelancerAddress')} className={TEXTAREA} rows={3}
                    placeholder="Flat 101, Sunshine Apartments, MG Road, Bangalore – 560001, Karnataka" />
                </Field>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-6">
            <h3 className="text-sm font-semibold text-purple-300 mb-4">Client Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Client / Company Name" required error={errors.clientName?.message}>
                <input {...register('clientName')} className={INPUT} placeholder="Acme Technologies Pvt Ltd" />
              </Field>
              <Field label="Client PAN / CIN" error={errors.clientPAN?.message} hint="Company CIN or authorised PAN">
                <input {...register('clientPAN')} className={INPUT} placeholder="U74999MH2020PTC123456" />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Client Complete Address" required error={errors.clientAddress?.message}>
                  <textarea {...register('clientAddress')} className={TEXTAREA} rows={3}
                    placeholder="4th Floor, Tech Park, MIDC, Andheri East, Mumbai – 400093, Maharashtra" />
                </Field>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Step 2: Project & Financial ────────────────────────────────────────────────

function Step2({ register, setValue, errors, watch }) {
  const paymentTerms  = watch('paymentTerms')
  const contractValue = watch('contractValue')
  const charCount     = (watch('projectDescription') || '').length

  const fmt = (n) => {
    if (!n) return ''
    try { return new Intl.NumberFormat('en-IN').format(n) } catch { return n }
  }

  return (
    <div className="space-y-5">
      <Field label="Project / Service Description" required error={errors.projectDescription?.message}
        hint={`${charCount}/2000 characters`}>
        <textarea {...register('projectDescription')} className={TEXTAREA} rows={5} maxLength={2000}
          placeholder="Describe the project scope, objectives, and your responsibilities in detail. The more specific, the better for enforceability." />
      </Field>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Contract Value (₹)" error={errors.contractValue?.message}
          hint={contractValue ? `₹ ${fmt(contractValue)} (Indian format)` : 'Leave blank if negotiated separately'}>
          <input {...register('contractValue')} type="number" min={0} max={99999999} className={INPUT} placeholder="150000" />
        </Field>

        <Field label="Payment Terms" required error={errors.paymentTerms?.message}>
          <NativeSelect
            name="paymentTerms"
            options={PAYMENT_TERMS}
            placeholder="Select payment terms…"
            value={paymentTerms}
            onChange={val => setValue('paymentTerms', val)}
          />
        </Field>

        {paymentTerms === '50% Advance + 50% on Delivery' && (
          <Field label="Advance Amount (₹)" error={errors.advanceAmount?.message}>
            <input {...register('advanceAmount')} type="number" min={0} className={INPUT} placeholder="75000" />
          </Field>
        )}

        <Field label="Project Start Date" required error={errors.startDate?.message}>
          <input {...register('startDate')} type="date" className={INPUT} />
        </Field>

        <Field label="Project End Date" error={errors.endDate?.message} hint="Optional for open-ended engagements">
          <input {...register('endDate')} type="date" className={INPUT} />
        </Field>
      </div>

      <Field label="Key Deliverables" error={errors.deliverables?.message}
        hint="One deliverable per line — will appear as a numbered list in the contract">
        <textarea {...register('deliverables')} className={TEXTAREA} rows={4}
          placeholder="Fully functional React web application&#10;Mobile-responsive design for iOS and Android&#10;API integration with payment gateway&#10;Deployment to production server" />
      </Field>
    </div>
  )
}

// ── Step 3: Legal Terms ────────────────────────────────────────────────────────

function Step3({ setValue, errors, watch }) {
  const nonCompete      = watch('nonCompete')
  const nonSolicitation = watch('nonSolicitation')

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Governing Jurisdiction / Court" required error={errors.jurisdiction?.message}>
          <NativeSelect name="jurisdiction" options={JURISDICTIONS} placeholder="Select city & state…"
            value={watch('jurisdiction')} onChange={val => setValue('jurisdiction', val)} />
        </Field>

        <Field label="Confidentiality Level" required error={errors.confidentialityLevel?.message}>
          <NativeSelect name="confidentialityLevel" options={CONFIDENTIALITY_OPTS} placeholder="Select level…"
            value={watch('confidentialityLevel')} onChange={val => setValue('confidentialityLevel', val)} />
        </Field>

        <Field label="Termination Notice Period" required error={errors.terminationClause?.message}>
          <NativeSelect name="terminationClause" options={TERMINATION_OPTS} placeholder="Select notice period…"
            value={watch('terminationClause')} onChange={val => setValue('terminationClause', val)} />
        </Field>

        <Field label="Intellectual Property Ownership" required error={errors.ipOwnership?.message}>
          <NativeSelect name="ipOwnership" options={IP_OPTS} placeholder="Select IP ownership…"
            value={watch('ipOwnership')} onChange={val => setValue('ipOwnership', val)} />
        </Field>

        <div className="sm:col-span-2">
          <Field label="Dispute Resolution Method" required error={errors.disputeResolution?.message}>
            <NativeSelect name="disputeResolution" options={DISPUTE_OPTS} placeholder="Select dispute resolution…"
              value={watch('disputeResolution')} onChange={val => setValue('disputeResolution', val)} />
          </Field>
        </div>

        <div className="sm:col-span-2">
          <Field label="Liability Limitation" error={errors.liabilityLimit?.message}
            hint="Optional — leave blank to use contract value as default">
            <NativeSelect name="liabilityLimit" options={LIABILITY_OPTS} placeholder="Select liability cap…"
              value={watch('liabilityLimit')} onChange={val => setValue('liabilityLimit', val)} />
          </Field>
        </div>
      </div>

      <div className="border-t border-white/10 pt-4 space-y-3">
        <p className="text-sm font-medium text-gray-300">Restrictive Covenants</p>

        <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${nonCompete ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 hover:border-white/25'}`}>
          <input type="checkbox" checked={!!nonCompete}
            onChange={e => setValue('nonCompete', e.target.checked)}
            className="mt-0.5 accent-blue-500" />
          <div>
            <p className="text-sm font-medium text-white">Non-Compete Clause</p>
            <p className="text-xs text-gray-400 mt-0.5">Service provider agrees not to work with competitors for 6 months post-contract</p>
          </div>
        </label>

        <label className={`flex items-start gap-3 p-4 rounded-xl border cursor-pointer transition-colors ${nonSolicitation ? 'border-blue-500/50 bg-blue-500/10' : 'border-white/10 hover:border-white/25'}`}>
          <input type="checkbox" checked={!!nonSolicitation}
            onChange={e => setValue('nonSolicitation', e.target.checked)}
            className="mt-0.5 accent-blue-500" />
          <div>
            <p className="text-sm font-medium text-white">Non-Solicitation Clause</p>
            <p className="text-xs text-gray-400 mt-0.5">Neither party can poach the other's clients or employees for 12 months post-contract</p>
          </div>
        </label>
      </div>
    </div>
  )
}

// ── Step 4: Review & Generate ──────────────────────────────────────────────────

function Step4({ register, errors, contractData, complianceResults, formData }) {
  return (
    <div className="space-y-6">
      <div className="sm:w-48">
        <Field label="Contract Date" required error={errors.contractDate?.message}>
          <input {...register('contractDate')} type="date" className={INPUT} />
        </Field>
      </div>

      <ClauseEditor register={register} errors={errors} />

      <div className="border-t border-white/10 pt-6">
        <ContractPreview contractData={contractData} complianceResults={complianceResults} />
      </div>

      {contractData && (
        <div className="border-t border-white/10 pt-6">
          <PDFDocument contractData={contractData} formData={formData} disabled={!contractData} />
        </div>
      )}
    </div>
  )
}

// ── Main Wizard ────────────────────────────────────────────────────────────────

export default function ContractWizard() {
  const [step, setStep]                 = useState(1)
  const [contractData, setContractData] = useState(null)
  const [compliance, setCompliance]     = useState(null)

  const { register, setValue, trigger, watch, getValues, formState: { errors } } = useContractForm()

  const formData = watch()

  const generateContract = () => {
    const data     = getValues()
    const template = getContractTemplate(data.contractType, data)
    const checks   = runComplianceCheck(data, data.contractType)
    setContractData(template)
    setCompliance(checks)
  }

  const handleNext = async () => {
    const valid = await trigger(STEP_FIELDS[step] || [])
    if (!valid) return
    if (step === 3) generateContract()
    setStep(s => Math.min(4, s + 1))
  }

  const handleBack = () => {
    setStep(s => Math.max(1, s - 1))
    if (step === 4) { setContractData(null); setCompliance(null) }
  }

  const stepProps = { register, setValue, errors, watch, getValues }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">

      {/* Page header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-4">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs text-gray-300">100% Browser-Based • No Data Stored</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Contract Generator</h1>
        <p className="text-gray-400 text-sm sm:text-base max-w-xl mx-auto">
          Create NDA, Service Agreement, or Employment contracts tailored for Indian law and jurisdiction — then export as a professional PDF.
        </p>
      </div>

      {/* Progress stepper */}
      <div className="mb-8">
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 right-0 top-5 h-0.5 bg-white/10 -z-10">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500"
              style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
            />
          </div>
          {STEPS.map(s => {
            const done   = step > s.n
            const active = step === s.n
            return (
              <div key={s.n} className="flex flex-col items-center gap-2">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold border-2 transition-all duration-300
                  ${done
                    ? 'bg-emerald-500 border-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                    : active
                      ? 'bg-gradient-to-br from-blue-500 to-purple-600 border-blue-400 text-white shadow-lg shadow-blue-500/30 scale-110'
                      : 'bg-white/5 border-white/20 text-gray-400'
                  }
                `}>
                  {done ? '✓' : s.icon}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${active ? 'text-white' : done ? 'text-emerald-400' : 'text-gray-500'}`}>
                  {s.title}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Step content card */}
      <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-5 sm:p-7 shadow-2xl">
        <div className="flex items-center gap-2 mb-6">
          <span className="text-xl">{STEPS[step - 1].icon}</span>
          <div>
            <h2 className="text-base font-semibold text-white">Step {step}: {STEPS[step - 1].title}</h2>
            <p className="text-xs text-gray-400">
              {step === 1 && 'Choose contract type and enter party details'}
              {step === 2 && 'Define project scope and financial terms'}
              {step === 3 && 'Set legal terms, jurisdiction, and compliance clauses'}
              {step === 4 && 'Review your contract, check compliance, and download PDF'}
            </p>
          </div>
        </div>

        {step === 1 && <Step1 {...stepProps} />}
        {step === 2 && <Step2 {...stepProps} />}
        {step === 3 && <Step3 {...stepProps} />}
        {step === 4 && (
          <Step4
            {...stepProps}
            contractData={contractData}
            complianceResults={compliance}
            formData={formData}
          />
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-6 gap-3">
        {step > 1 ? (
          <button type="button" onClick={handleBack}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-sm font-medium transition-colors">
            ← Back
          </button>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-3 ml-auto">
          <span className="text-xs text-gray-500">{step} of {STEPS.length}</span>

          {step < 4 && (
            <button type="button" onClick={handleNext}
              className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-blue-500/20">
              {step === 3 ? 'Generate Contract →' : 'Next →'}
            </button>
          )}

          {step === 4 && contractData && (
            <button type="button" onClick={generateContract}
              className="px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white rounded-xl text-sm font-medium transition-colors">
              🔄 Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-center text-xs text-gray-600 mt-6 max-w-2xl mx-auto">
        ⚠️ This tool generates contract templates for informational purposes. For high-value or complex agreements, consult a qualified advocate before signing.
      </p>
    </div>
  )
}
