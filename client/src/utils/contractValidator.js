import * as yup from 'yup'

const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/

export const fullFormSchema = yup.object({
  // Step 1 — Parties
  contractType:      yup.string().required('Please select a contract type'),
  freelancerName:    yup.string().required('Your name is required').min(2, 'At least 2 characters').max(100),
  freelancerAddress: yup.string().required('Your address is required').min(10, 'Please enter a complete address'),
  freelancerPAN:     yup.string().nullable().optional()
    .test('pan', 'Invalid PAN format (e.g. ABCDE1234F)', v => !v || PAN_REGEX.test(v)),
  clientName:        yup.string().required('Client name is required').min(2).max(150),
  clientAddress:     yup.string().required('Client address is required').min(10, 'Please enter a complete address'),
  clientPAN:         yup.string().nullable().optional(),

  // Step 2 — Project & Financial
  projectDescription: yup.string().required('Project description is required').min(20, 'Please provide at least 20 characters'),
  contractValue:      yup.number().transform(v => (isNaN(v) ? undefined : v)).nullable().optional().min(0).max(99999999),
  paymentTerms:       yup.string().required('Please select payment terms'),
  advanceAmount:      yup.number().transform(v => (isNaN(v) ? undefined : v)).nullable().optional().min(0),
  startDate:          yup.date().required('Start date is required').typeError('Enter a valid date'),
  endDate:            yup.date().nullable().optional().typeError('Enter a valid date')
    .min(yup.ref('startDate'), 'End date must be after start date'),
  deliverables:       yup.string().nullable().optional(),

  // Step 3 — Legal
  jurisdiction:         yup.string().required('Please select a jurisdiction'),
  confidentialityLevel: yup.string().required('Please select confidentiality level'),
  terminationClause:    yup.string().required('Please select a termination notice period'),
  ipOwnership:          yup.string().required('Please select IP ownership'),
  disputeResolution:    yup.string().required('Please select a dispute resolution method'),
  liabilityLimit:       yup.string().nullable().optional(),
  nonCompete:           yup.boolean().optional(),
  nonSolicitation:      yup.boolean().optional(),

  // Step 4 — Review
  additionalClauses:       yup.string().nullable().optional(),
  freelancerSignatureName: yup.string().nullable().optional(),
  clientSignatureName:     yup.string().nullable().optional(),
  contractDate:            yup.date().required('Contract date is required').typeError('Enter a valid date'),
})

// Fields to validate per step (used with trigger())
export const STEP_FIELDS = {
  1: ['contractType', 'freelancerName', 'freelancerAddress', 'freelancerPAN', 'clientName', 'clientAddress'],
  2: ['projectDescription', 'contractValue', 'paymentTerms', 'startDate', 'endDate'],
  3: ['jurisdiction', 'confidentialityLevel', 'terminationClause', 'ipOwnership', 'disputeResolution'],
  4: ['contractDate'],
}
