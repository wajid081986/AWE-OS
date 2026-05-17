import { format } from 'date-fns'

// ── Formatting helpers ─────────────────────────────────────────────────────────

function fmtDate(dateStr) {
  if (!dateStr) return '___________'
  try { return format(new Date(dateStr), 'dd MMMM yyyy') } catch { return dateStr }
}

function fmtINR(amount) {
  if (!amount || isNaN(amount)) return '₹___________'
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(amount)
}

function numToWords(n) {
  if (!n || isNaN(n)) return '___________'
  n = Math.floor(n)
  const crore  = Math.floor(n / 10000000); n %= 10000000
  const lakh   = Math.floor(n / 100000);   n %= 100000
  const thou   = Math.floor(n / 1000);     n %= 1000
  const parts  = []
  if (crore) parts.push(`${crore} Crore`)
  if (lakh)  parts.push(`${lakh} Lakh`)
  if (thou)  parts.push(`${thou} Thousand`)
  if (n)     parts.push(String(n))
  return parts.join(' ') || 'Zero'
}

// ── Clause helpers ─────────────────────────────────────────────────────────────

function confidentialityScope(level) {
  if (level?.startsWith('High'))     return 'proprietary algorithms, trade secrets, source code, financial data, technical documentation, and business strategies'
  if (level?.startsWith('Critical')) return 'classified data, sensitive personal information, strategic business intelligence, technical specifications, and any information designated as critical by either party'
  return 'general business information, client lists, pricing, operational processes, and business plans'
}

function ipOwnershipClause(option, clientName, freelancerName) {
  switch (option) {
    case 'Freelancer retains IP':
      return `The Service Provider retains all intellectual property rights in the work created under this Agreement. ${clientName} is granted a non-exclusive, perpetual, royalty-free licence to use the deliverables for their intended business purpose. This licence does not permit sub-licensing or resale without prior written consent from ${freelancerName}.`
    case 'Shared ownership (50/50)':
      return `The intellectual property created under this Agreement shall be jointly owned by both parties on a 50/50 basis. Either party may independently exploit the jointly owned IP, provided they account for profits to the other party. Neither party may exclusively licence or transfer the jointly owned IP without written consent from the other.`
    case 'Client owns deliverables, Freelancer retains methods':
      return `${clientName} shall own all deliverables produced under this Agreement upon full payment. However, ${freelancerName} retains ownership of all underlying methodologies, frameworks, tools, and pre-existing intellectual property used to create the deliverables. ${clientName} receives no rights to such underlying methods.`
    default: // Client owns all IP
      return `Upon full payment of the contract value, all intellectual property — including copyrights, patents, trade secrets, and work products created under this Agreement — shall be exclusively owned by ${clientName}. ${freelancerName} hereby irrevocably assigns all rights, title, and interest in such work to ${clientName}.`
  }
}

function disputeClause(method, jurisdiction) {
  const city = (jurisdiction || 'Mumbai, Maharashtra').split(',')[0].trim()
  switch (method) {
    case 'Arbitration under Arbitration and Conciliation Act 1996':
      return `Any dispute arising under this Agreement shall be referred to and finally resolved by arbitration under the Arbitration and Conciliation Act, 1996. The arbitration shall be conducted by a sole arbitrator appointed by mutual agreement. The seat of arbitration shall be ${city}, India. The language of arbitration shall be English. The award shall be final and binding.`
    case 'Court proceedings only':
      return `Any dispute arising under this Agreement shall be subject to the exclusive jurisdiction of the courts at ${city}, India. The parties irrevocably submit to the personal jurisdiction of such courts.`
    case 'Mediation then arbitration':
      return `Any dispute shall first be referred to mediation. If mediation fails within 30 days, the dispute shall be submitted to arbitration under the Arbitration and Conciliation Act, 1996. Both mediation and arbitration shall be conducted in ${city}, India.`
    default:
      return `Any dispute shall first be subject to good-faith negotiations for 30 days. If unresolved, it shall be submitted to arbitration under the Arbitration and Conciliation Act, 1996, with the seat of arbitration at ${city}, India.`
  }
}

function liabilityClause(option, contractValue) {
  switch (option) {
    case '50% of contract value':
      return `The total aggregate liability of either party shall not exceed fifty percent (50%) of the total contract value, i.e., ${fmtINR(contractValue / 2)}.`
    case '3 months of fees':
      return `The total aggregate liability of either party shall not exceed the fees paid or payable during the three (3) months immediately preceding the event giving rise to the claim.`
    case 'Unlimited':
      return `There is no cap on liability under this Agreement. Each party shall be fully responsible for all direct, indirect, incidental, and consequential damages arising from a breach.`
    case 'No liability clause':
      return `To the maximum extent permitted by law, neither party shall be liable to the other for any indirect, incidental, special, consequential, or exemplary damages, regardless of cause.`
    default:
      return `The total aggregate liability of either party under this Agreement shall not exceed the total contract value of ${fmtINR(contractValue)}.`
  }
}

// ── NDA Template ───────────────────────────────────────────────────────────────

export function getNDATemplate(d) {
  const termYrs = (() => {
    if (!d.startDate || !d.endDate) return 2
    const diff = (new Date(d.endDate) - new Date(d.startDate)) / (365.25 * 24 * 3600 * 1000)
    return Math.max(1, Math.ceil(diff))
  })()

  return {
    title: 'NON-DISCLOSURE AGREEMENT',
    subtitle: 'Mutual Confidentiality Agreement',
    sections: [
      {
        sectionTitle: '1. PARTIES',
        content: `This Non-Disclosure Agreement ("Agreement") is entered into as of ${fmtDate(d.contractDate)} ("Effective Date") between:\n\n${d.freelancerName || '___________'}, residing at ${d.freelancerAddress || '___________'} (hereinafter "Party A")\n\nAND\n\n${d.clientName || '___________'}, having its principal place of business at ${d.clientAddress || '___________'} (hereinafter "Party B")\n\nParty A and Party B are collectively referred to as the "Parties."`,
      },
      {
        sectionTitle: '2. DEFINITION OF CONFIDENTIAL INFORMATION',
        content: `"Confidential Information" means any data or information proprietary to either Party and not generally known to the public, including but not limited to: ${confidentialityScope(d.confidentialityLevel)}.\n\nConfidential Information excludes information that: (a) is or becomes publicly available through no fault of the Receiving Party; (b) was rightfully known prior to disclosure; (c) is independently developed without use of Confidential Information; or (d) is required to be disclosed by law or court order.`,
      },
      {
        sectionTitle: '3. OBLIGATIONS OF THE RECEIVING PARTY',
        content: `Each Party agrees to: (a) hold the other's Confidential Information in strict confidence; (b) not disclose Confidential Information to any third party without prior written consent; (c) use Confidential Information solely for the purpose of conducting business between the Parties; (d) restrict access to employees and contractors who need to know and are bound by equally restrictive obligations; (e) notify the other Party promptly upon discovery of any unauthorised disclosure.`,
      },
      {
        sectionTitle: '4. TERM',
        content: `This Agreement shall remain in force for ${termYrs} year${termYrs > 1 ? 's' : ''} from the Effective Date, unless terminated earlier by mutual written consent. Confidentiality obligations shall survive termination for an additional three (3) years.`,
      },
      {
        sectionTitle: '5. GOVERNING LAW',
        content: `This Agreement is governed by the laws of India, including the Indian Contract Act, 1872 and the Information Technology Act, 2000. All proceedings shall be subject to the exclusive jurisdiction of courts in ${d.jurisdiction || 'Mumbai, Maharashtra'}.`,
      },
      {
        sectionTitle: '6. DISPUTE RESOLUTION',
        content: disputeClause(d.disputeResolution, d.jurisdiction),
      },
      {
        sectionTitle: '7. GENERAL PROVISIONS',
        content: `Severability: If any provision is found unenforceable, the remaining provisions shall continue in full force. Entire Agreement: This Agreement supersedes all prior negotiations and representations. Amendments: Any amendment must be in writing and signed by both Parties. Waiver: Failure to enforce any provision shall not constitute a waiver thereof.`,
      },
      ...(d.additionalClauses ? [{ sectionTitle: '8. ADDITIONAL PROVISIONS', content: d.additionalClauses }] : []),
    ],
  }
}

// ── Service Agreement Template ─────────────────────────────────────────────────

export function getServiceAgreementTemplate(d) {
  const deliverablesList = d.deliverables
    ? d.deliverables.split('\n').filter(Boolean).map((item, i) => `${i + 1}. ${item.trim()}`).join('\n')
    : 'As mutually agreed upon in writing.'

  const sections = [
    {
      sectionTitle: '1. PARTIES AND RECITALS',
      content: `This Service Agreement ("Agreement") is entered into as of ${fmtDate(d.contractDate)} between:\n\nService Provider: ${d.freelancerName || '___________'}${d.freelancerPAN ? ` (PAN: ${d.freelancerPAN})` : ''}, residing at ${d.freelancerAddress || '___________'} ("Service Provider")\n\nAND\n\nClient: ${d.clientName || '___________'}${d.clientPAN ? ` (PAN/CIN: ${d.clientPAN})` : ''}, having its principal office at ${d.clientAddress || '___________'} ("Client")\n\nWHEREAS, the Client desires to engage the Service Provider for professional services, and the Service Provider is willing to provide such services on the terms set out herein.`,
    },
    {
      sectionTitle: '2. SCOPE OF SERVICES',
      content: `The Service Provider shall render the following services:\n\n${d.projectDescription || '___________'}\n\nKey Deliverables:\n${deliverablesList}\n\nServices shall be performed in a professional manner consistent with industry standards.`,
    },
    {
      sectionTitle: '3. COMPENSATION AND PAYMENT TERMS',
      content: `3.1 Contract Value: The Client shall pay the Service Provider ${fmtINR(d.contractValue)} (Rupees ${numToWords(d.contractValue)} Only) for the services rendered.\n\n3.2 Payment Schedule: ${d.paymentTerms || '___________'}.${d.advanceAmount ? `\n\n3.3 Advance: ${fmtINR(d.advanceAmount)} payable upon execution of this Agreement.` : ''}\n\n3.4 Late Payment: Payments overdue beyond the agreed terms shall attract interest at 18% per annum (1.5% per month) from the due date.\n\n3.5 Currency: All payments shall be made in Indian Rupees (INR).`,
    },
    {
      sectionTitle: '4. PROJECT TIMELINE',
      content: `4.1 Commencement: Services shall commence on ${fmtDate(d.startDate)}.${d.endDate ? `\n\n4.2 Completion: Services shall conclude on or before ${fmtDate(d.endDate)}.` : ''}\n\n4.3 Delays caused by the Client's failure to provide approvals, materials, or information shall extend the timeline accordingly, with written notice from the Service Provider.`,
    },
    {
      sectionTitle: '5. INTELLECTUAL PROPERTY',
      content: ipOwnershipClause(d.ipOwnership, d.clientName || 'Client', d.freelancerName || 'Service Provider'),
    },
    {
      sectionTitle: '6. CONFIDENTIALITY',
      content: `6.1 The Service Provider acknowledges that in performing services, they may access ${confidentialityScope(d.confidentialityLevel)}.\n\n6.2 The Service Provider shall maintain strict confidentiality during the term and for three (3) years thereafter.\n\n6.3 The Client shall likewise keep the Service Provider's proprietary methods and working processes confidential.`,
    },
    {
      sectionTitle: '7. TERMINATION',
      content: `7.1 Either party may terminate this Agreement by providing ${d.terminationClause || '30 days written notice'} in writing.\n\n7.2 The Client may terminate immediately for cause upon material breach uncured within 7 days of written notice.\n\n7.3 Upon termination, the Service Provider shall deliver all completed work; the Client shall pay for work performed up to the date of termination.${d.nonCompete ? `\n\n7.4 Non-Compete: The Service Provider shall not engage in business directly competing with the Client's core business for 6 months post-termination within ${d.jurisdiction || 'the applicable jurisdiction'}.` : ''}${d.nonSolicitation ? `\n\n7.5 Non-Solicitation: For 12 months post-termination, neither party shall solicit or hire the other's employees, contractors, or clients involved in this engagement.` : ''}`,
    },
    {
      sectionTitle: '8. INDEMNIFICATION AND LIABILITY',
      content: `8.1 Each party shall indemnify the other from claims arising from its own negligence or wilful misconduct.\n\n8.2 Liability Cap: ${liabilityClause(d.liabilityLimit, d.contractValue)}\n\n8.3 Neither party shall be liable for indirect, consequential, or punitive damages except in cases of gross negligence or wilful misconduct.`,
    },
    {
      sectionTitle: '9. FORCE MAJEURE',
      content: `Neither party shall be liable for delays resulting from circumstances beyond their reasonable control, including acts of God, government actions, epidemics, natural disasters, or infrastructure failures, provided the affected party gives prompt written notice.`,
    },
    {
      sectionTitle: '10. DISPUTE RESOLUTION',
      content: disputeClause(d.disputeResolution, d.jurisdiction),
    },
    {
      sectionTitle: '11. GOVERNING LAW',
      content: `This Agreement is governed by the laws of India including the Indian Contract Act, 1872 and the Information Technology Act, 2000. The courts at ${d.jurisdiction || 'Mumbai, Maharashtra'} shall have exclusive jurisdiction.`,
    },
    {
      sectionTitle: '12. ENTIRE AGREEMENT',
      content: `This Agreement constitutes the entire understanding between the Parties and supersedes all prior agreements on this subject matter. Any amendment must be in writing and signed by authorised representatives of both Parties.`,
    },
    ...(d.additionalClauses ? [{ sectionTitle: '13. ADDITIONAL PROVISIONS', content: d.additionalClauses }] : []),
  ]

  return { title: 'SERVICE AGREEMENT', subtitle: 'Professional Services Contract', sections }
}

// ── Employment / Consulting Contract Template ──────────────────────────────────

export function getEmploymentContractTemplate(d) {
  return {
    title: 'EMPLOYMENT / CONSULTING CONTRACT',
    subtitle: 'Fixed-Term Engagement Agreement',
    sections: [
      {
        sectionTitle: '1. PARTIES',
        content: `This Consulting/Employment Contract ("Agreement") is executed as of ${fmtDate(d.contractDate)} between:\n\nConsultant: ${d.freelancerName || '___________'}${d.freelancerPAN ? ` (PAN: ${d.freelancerPAN})` : ''}, residing at ${d.freelancerAddress || '___________'} ("Consultant")\n\nAND\n\nCompany: ${d.clientName || '___________'}${d.clientPAN ? ` (PAN/CIN: ${d.clientPAN})` : ''}, having its registered office at ${d.clientAddress || '___________'} ("Company")\n\nThis Agreement is entered into in compliance with applicable Indian labour laws.`,
      },
      {
        sectionTitle: '2. SCOPE OF ENGAGEMENT',
        content: `2.1 The Company engages the Consultant to perform the following duties:\n\n${d.projectDescription || '___________'}\n\n2.2 The Consultant shall report to the designated manager of the Company.\n\n2.3 All work shall be performed with professional diligence and in accordance with the Company's standards.`,
      },
      {
        sectionTitle: '3. TERM OF ENGAGEMENT',
        content: `3.1 Commencement: This engagement begins on ${fmtDate(d.startDate)}.${d.endDate ? `\n\n3.2 Duration: Fixed-term engagement until ${fmtDate(d.endDate)}.` : '\n\n3.2 Duration: Open-ended engagement, terminable as per Section 7.'}\n\n3.3 Probation: The first 90 days shall be a probationary period during which either party may terminate with 7 days' written notice.`,
      },
      {
        sectionTitle: '4. REMUNERATION',
        content: `4.1 The Company shall pay the Consultant ${fmtINR(d.contractValue)} (${numToWords(d.contractValue)} Rupees Only) as per ${d.paymentTerms || '___________'} basis.\n\n4.2 Pre-approved business expenses shall be reimbursed upon submission of receipts.\n\n4.3 Tax: The Company shall deduct applicable TDS under the Income Tax Act, 1961. The Consultant is responsible for their own GST and professional tax compliance.`,
      },
      {
        sectionTitle: '5. INTELLECTUAL PROPERTY',
        content: ipOwnershipClause(d.ipOwnership, d.clientName || 'Company', d.freelancerName || 'Consultant'),
      },
      {
        sectionTitle: '6. CONFIDENTIALITY',
        content: `The Consultant shall maintain strict confidentiality of all proprietary information, trade secrets, client data, and business strategies of the Company. This obligation extends beyond the term of this Agreement. The Consultant shall comply with the IT (Amendment) Act, 2008 and applicable data protection rules.`,
      },
      {
        sectionTitle: '7. TERMINATION',
        content: `7.1 Either party may terminate with ${d.terminationClause || '30 days written notice'}.\n\n7.2 The Company may terminate immediately for cause including misconduct, breach of confidentiality, or fraud.\n\n7.3 All outstanding dues shall be settled within 30 days of the termination date.${d.nonCompete ? `\n\n7.4 Non-Compete: The Consultant shall not work for or establish a competing business in the same domain for 6 months post-termination within ${d.jurisdiction || 'the applicable jurisdiction'}.` : ''}${d.nonSolicitation ? `\n\n7.5 Non-Solicitation: For 12 months post-termination, the Consultant shall not solicit the Company's clients, employees, or business associates.` : ''}`,
      },
      {
        sectionTitle: '8. COMPLIANCE WITH INDIAN LAWS',
        content: `Both parties shall comply with all applicable statutes including the Income Tax Act 1961, GST Act 2017, Professional Tax regulations, Employees' Provident Funds Act (if applicable), the Shops & Establishments Act, and the Code on Wages 2019.`,
      },
      {
        sectionTitle: '9. GOVERNING LAW AND DISPUTE RESOLUTION',
        content: `This Agreement is governed by the laws of India. ${disputeClause(d.disputeResolution, d.jurisdiction)}`,
      },
      {
        sectionTitle: '10. MISCELLANEOUS',
        content: `10.1 Independent Contractor: Unless explicitly designated otherwise, the Consultant operates as an independent contractor and is not entitled to employee benefits.\n\n10.2 Amendments: Any modification must be in writing and signed by both parties.\n\n10.3 Entire Agreement: This Agreement supersedes all prior understandings on this subject matter.\n\n10.4 Severability: If any provision is found invalid, the remaining provisions shall remain in full force.`,
      },
      ...(d.additionalClauses ? [{ sectionTitle: '11. ADDITIONAL PROVISIONS', content: d.additionalClauses }] : []),
    ],
  }
}

// ── Public API ─────────────────────────────────────────────────────────────────

export function getContractTemplate(contractType, formData) {
  switch (contractType) {
    case 'NDA':                  return getNDATemplate(formData)
    case 'Employment Contract':  return getEmploymentContractTemplate(formData)
    default:                     return getServiceAgreementTemplate(formData)
  }
}
