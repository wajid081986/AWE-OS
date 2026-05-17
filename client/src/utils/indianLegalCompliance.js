export function runComplianceCheck(formData, contractType) {
  const { contractValue, freelancerPAN, clientPAN, jurisdiction } = formData
  const val = parseFloat(contractValue) || 0
  const results = []

  // 1. GST
  if (val > 2000000) {
    results.push({
      id: 'gst-mandatory',
      category: 'GST',
      status: 'warning',
      title: 'GST Registration Required',
      description: 'Contract value exceeds ₹20 lakhs. Under the GST Act 2017, service providers with annual turnover above ₹20 lakhs (₹10 lakhs in special category states) must register for GST. Obtain a valid GSTIN before signing.',
      actionRequired: true,
    })
  } else if (val > 1000000) {
    results.push({
      id: 'gst-approaching',
      category: 'GST',
      status: 'info',
      title: 'Approaching GST Threshold',
      description: 'Contract value exceeds ₹10 lakhs. If your total annual turnover across all engagements exceeds ₹20 lakhs, GST registration becomes mandatory. Plan your finances accordingly.',
      actionRequired: false,
    })
  } else {
    results.push({
      id: 'gst-clear',
      category: 'GST',
      status: 'pass',
      title: 'GST Threshold: Not Triggered',
      description: 'Contract value is within the basic GST exemption threshold. GST registration may not be mandatory based on this contract alone.',
      actionRequired: false,
    })
  }

  // 2. TDS
  if (val > 30000) {
    results.push({
      id: 'tds-applicable',
      category: 'IT Act',
      status: 'info',
      title: 'TDS Deduction Applicable',
      description: 'For professional/technical services (Section 194J of the Income Tax Act): TDS at 10% is applicable if annual payment exceeds ₹30,000. For works contracts (Section 194C): TDS at 1% (individual) or 2% (companies). The Client must deduct TDS and issue Form 16A.',
      actionRequired: true,
    })
  }

  // 3. PAN Details
  if (!freelancerPAN && !clientPAN) {
    results.push({
      id: 'pan-missing-both',
      category: 'PAN',
      status: 'warning',
      title: 'PAN Details Missing for Both Parties',
      description: "Neither party's PAN is provided. PAN is mandatory under the Income Tax Act for payments exceeding ₹50,000. Without PAN, TDS is deducted at a higher rate of 20% (Section 206AA).",
      actionRequired: true,
    })
  } else if (!freelancerPAN || !clientPAN) {
    results.push({
      id: 'pan-missing-one',
      category: 'PAN',
      status: 'warning',
      title: `${!freelancerPAN ? 'Service Provider' : 'Client'} PAN Missing`,
      description: `${!freelancerPAN ? 'Your PAN' : "The Client's PAN/CIN"} is not provided. This may lead to TDS at a higher rate of 20% and complications during income tax filing.`,
      actionRequired: false,
    })
  } else {
    results.push({
      id: 'pan-ok',
      category: 'PAN',
      status: 'pass',
      title: 'PAN Details Complete',
      description: "Both parties' PAN details are included, ensuring proper TDS compliance and income tax filing.",
      actionRequired: false,
    })
  }

  // 4. Stamp Duty
  results.push({
    id: 'stamp-duty',
    category: 'Stamp Duty',
    status: 'info',
    title: 'Stamp Duty May Apply',
    description: `In ${jurisdiction || 'your state'}, this agreement may require execution on non-judicial stamp paper. Stamp duty varies by state: Maharashtra (₹500), Karnataka (₹200), Delhi (₹100). Check with a local advocate for the exact stamp value applicable to your contract type.`,
    actionRequired: true,
  })

  // 5. IT Act / Digital Validity
  results.push({
    id: 'digital-validity',
    category: 'IT Act',
    status: 'pass',
    title: 'Digital Contract Legally Valid',
    description: 'Electronic contracts and e-signatures are legally recognised in India under the Information Technology Act, 2000 (Section 10A) and the Indian Evidence Act (Sections 65A/65B). This contract, once signed electronically by both parties, is legally enforceable.',
    actionRequired: false,
  })

  // 6. Employment-specific
  if (contractType === 'Employment Contract') {
    results.push({
      id: 'labour-law',
      category: 'Labor Law',
      status: 'warning',
      title: 'Labour Law Compliance Check Required',
      description: "Employment contracts must comply with: Shops & Establishments Act (state-specific), Minimum Wages Act 1948, Industrial Disputes Act 1947, Employees' Provident Funds Act (if 20+ employees), and the Code on Wages 2019. Consult an HR legal expert for full compliance before signing.",
      actionRequired: true,
    })
  }

  // 7. NDA-specific
  if (contractType === 'NDA') {
    results.push({
      id: 'trade-secrets',
      category: 'IT Act',
      status: 'info',
      title: 'Trade Secrets Protection',
      description: 'India does not have a dedicated Trade Secrets Act. Confidential information is protected via: Indian Contract Act 1872 (breach of contract), IT Act 2000 (data protection), and Copyright Act 1957. A well-drafted NDA is your primary legal tool.',
      actionRequired: false,
    })
  }

  // 8. High-value: recommend legal review
  if (val > 500000) {
    results.push({
      id: 'legal-review',
      category: 'Stamp Duty',
      status: 'warning',
      title: 'Professional Legal Review Recommended',
      description: 'For contracts above ₹5 lakhs, we strongly recommend having a qualified advocate review the agreement before signing. This tool generates a professional template; legal counsel ensures full enforceability under Indian law.',
      actionRequired: false,
    })
  }

  // 9. FEMA (foreign transactions)
  results.push({
    id: 'fema-advisory',
    category: 'FEMA',
    status: 'info',
    title: 'FEMA Compliance (if applicable)',
    description: 'If either party is a foreign entity or if payments cross international borders, FEMA (Foreign Exchange Management Act 1999) compliance is mandatory. Obtain RBI approval if required and report foreign remittances via Form 15CA/15CB.',
    actionRequired: false,
  })

  return results
}
