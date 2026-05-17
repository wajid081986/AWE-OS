import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { format } from 'date-fns'
import { fullFormSchema } from '../utils/contractValidator'

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
  return useForm({
    resolver:      yupResolver(fullFormSchema),
    defaultValues: DEFAULT_VALUES,
    mode:          'onBlur',
  })
}
