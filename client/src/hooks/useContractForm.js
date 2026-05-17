import { useState } from 'react'
import { format } from 'date-fns'
import { validateFields } from '../utils/contractValidator'

const today = format(new Date(), 'yyyy-MM-dd')

const DEFAULT_VALUES = {
  contractType:            '',
  freelancerName:          '',
  freelancerAddress:       '',
  freelancerPAN:           '',
  clientName:              '',
  clientAddress:           '',
  clientPAN:               '',
  projectDescription:      '',
  contractValue:           '',
  paymentTerms:            '',
  advanceAmount:           '',
  startDate:               today,
  endDate:                 '',
  deliverables:            '',
  jurisdiction:            '',
  confidentialityLevel:    '',
  terminationClause:       '',
  ipOwnership:             '',
  disputeResolution:       '',
  liabilityLimit:          '',
  nonCompete:              false,
  nonSolicitation:         false,
  additionalClauses:       '',
  freelancerSignatureName: '',
  clientSignatureName:     '',
  contractDate:            today,
}

export function useContractForm() {
  const [values, setValues] = useState(DEFAULT_VALUES)
  const [errors, setErrors] = useState({})

  function clearFieldError(name) {
    setErrors(prev => {
      if (!prev[name]) return prev
      const next = { ...prev }
      delete next[name]
      return next
    })
  }

  function register(name) {
    return {
      name,
      value:    values[name] ?? '',
      onChange: (e) => {
        setValues(v => ({ ...v, [name]: e.target.value }))
        clearFieldError(name)
      },
      onBlur: () => {},
    }
  }

  function setValue(name, val) {
    setValues(v => ({ ...v, [name]: val }))
    clearFieldError(name)
  }

  function watch(name) {
    if (name === undefined) return values
    return values[name]
  }

  function getValues() {
    return values
  }

  async function trigger(fields = []) {
    const errs = validateFields(values, fields)
    setErrors(prev => ({ ...prev, ...errs }))
    return Object.keys(errs).length === 0
  }

  return { register, setValue, watch, getValues, trigger, formState: { errors } }
}
