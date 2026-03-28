const { ZodError } = require('zod');

function formatZodErrors(error) {
  if (!(error instanceof ZodError)) return null;
  const errors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] || 'general';
    if (!errors[field]) errors[field] = [];
    errors[field].push(issue.message);
  }
  return errors;
}

function validationError(res, errors) {
  res.statusCode = 422;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      message: 'The given data was invalid.',
      errors,
    })
  );
}

module.exports = { formatZodErrors, validationError };
