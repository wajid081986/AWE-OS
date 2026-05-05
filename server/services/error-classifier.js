'use strict';

const ERROR_TYPES = {
  FK_VIOLATION: 'FK_VIOLATION',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  LOGIC_ERROR: 'LOGIC_ERROR',
  TRANSIENT_ERROR: 'TRANSIENT_ERROR',
  UNKNOWN: 'UNKNOWN',
};

function classifyError(testData) {
  const error = testData && (testData.error || testData.result?.error || testData.metadata?.error);
  const code = String(
    (error && error.code) ||
    (testData && testData.error_code) ||
    (testData && testData.code) ||
    (testData && testData.result && testData.result.code) ||
    ''
  );
  const message = [
    error && error.message,
    error && error.details,
    error && error.hint,
    testData && testData.error_message,
    testData && testData.message,
    testData && testData.result && testData.result.message,
    testData && testData.result && testData.result.error_message,
    testData && testData.metadata && testData.metadata.error_message,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  if (code === '23503' || message.includes('foreign key') || message.includes('fk violation')) {
    return ERROR_TYPES.FK_VIOLATION;
  }

  if (
    code === '23514' ||
    code === '23502' ||
    code === '22P02' ||
    code.startsWith('PGRST') ||
    message.includes('check constraint') ||
    message.includes('not-null constraint') ||
    message.includes('invalid') ||
    message.includes('bad request') ||
    message.includes('validation')
  ) {
    return ERROR_TYPES.VALIDATION_ERROR;
  }

  if (
    code === '40001' ||
    code === '40P01' ||
    code.startsWith('08') ||
    code === '53300' ||
    code === '57014' ||
    message.includes('timeout') ||
    message.includes('rate limit') ||
    message.includes('temporar') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('deadlock') ||
    message.includes('too many connections')
  ) {
    return ERROR_TYPES.TRANSIENT_ERROR;
  }

  if (
    message.includes('syntax') ||
    message.includes('referenceerror') ||
    message.includes('typeerror') ||
    message.includes('logic')
  ) {
    return ERROR_TYPES.LOGIC_ERROR;
  }

  return ERROR_TYPES.UNKNOWN;
}

module.exports = { classifyError, ERROR_TYPES };
