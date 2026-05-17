const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

export const STEP_FIELDS = {
  1: ['contractType', 'freelancerName', 'freelancerAddress', 'freelancerPAN', 'clientName', 'clientAddress'],
  2: ['projectDescription', 'contractValue', 'paymentTerms', 'startDate', 'endDate'],
  3: ['jurisdiction', 'confidentialityLevel', 'terminationClause', 'ipOwnership', 'disputeResolution'],
  4: ['contractDate'],
}

export function validateFields(values, fields) {
  const errors = {}
  const err = (f, msg) => { errors[f] = { message: msg } }

  for (const field of fields) {
    const v = values[field]
    switch (field) {
      case 'contractType':
        if (!v) err('contractType', 'Please select a contract type')
        break
      case 'freelancerName':
        if (!v?.trim()) err('freelancerName', 'Your name is required')
        else if (v.trim().length < 2) err('freelancerName', 'At least 2 characters')
        break
      case 'freelancerAddress':
        if (!v?.trim()) err('freelancerAddress', 'Your address is required')
        else if (v.trim().length < 10) err('freelancerAddress', 'Please enter a complete address')
        break
      case 'freelancerPAN':
        if (v && !PAN_REGEX.test(v.toUpperCase()))
          err('freelancerPAN', 'Invalid PAN format (e.g. ABCDE1234F)')
        break
      case 'clientName':
        if (!v?.trim()) err('clientName', 'Client name is required')
        else if (v.trim().length < 2) err('clientName', 'At least 2 characters')
        break
      case 'clientAddress':
        if (!v?.trim()) err('clientAddress', 'Client address is required')
        else if (v.trim().length < 10) err('clientAddress', 'Please enter a complete address')
        break
      case 'projectDescription':
        if (!v?.trim()) err('projectDescription', 'Project description is required')
        else if (v.trim().length < 20) err('projectDescription', 'Please provide at least 20 characters')
        break
      case 'contractValue': {
        const n = Number(v)
        if (v !== '' && v != null && (isNaN(n) || n < 0))
          err('contractValue', 'Must be a positive number')
        else if (!isNaN(n) && n > 99999999)
          err('contractValue', 'Value too large')
        break
      }
      case 'paymentTerms':
        if (!v) err('paymentTerms', 'Please select payment terms')
        break
      case 'startDate':
        if (!v) err('startDate', 'Start date is required')
        break
      case 'endDate':
        if (v && values.startDate && new Date(v) <= new Date(values.startDate))
          err('endDate', 'End date must be after start date')
        break
      case 'jurisdiction':
        if (!v) err('jurisdiction', 'Please select a jurisdiction')
        break
      case 'confidentialityLevel':
        if (!v) err('confidentialityLevel', 'Please select confidentiality level')
        break
      case 'terminationClause':
        if (!v) err('terminationClause', 'Please select a termination notice period')
        break
      case 'ipOwnership':
        if (!v) err('ipOwnership', 'Please select IP ownership')
        break
      case 'disputeResolution':
        if (!v) err('disputeResolution', 'Please select a dispute resolution method')
        break
      case 'contractDate':
        if (!v) err('contractDate', 'Contract date is required')
        break
    }
  }
  return errors
}
