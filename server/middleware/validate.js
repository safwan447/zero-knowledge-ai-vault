/**
 * Wraps a zod schema as Express middleware. On success, req.body is
 * replaced with the parsed (and coerced/trimmed) data. On failure, responds
 * 400 with a clear, field-level error list instead of letting a malformed
 * request reach the controller or the database.
 */
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  req.body = result.data;
  next();
};

module.exports = validate;
