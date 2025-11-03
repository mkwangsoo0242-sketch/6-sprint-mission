function notFoundHandler(_req, res, _next) {
  res.status(404).json({ error: 'NotFound' });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, _req, res, _next) {
  if (err && err.status) {
    return res
      .status(err.status)
      .json({ error: err.code || 'Error', details: err.details });
  }

  // Prisma not found
  if (err && err.code === 'P2025') {
    return res.status(404).json({ error: 'NotFound' });
  }

  // Validation fallback
  if (err && err.name === 'ZodError') {
    return res
      .status(400)
      .json({ error: 'ValidationError', details: err.errors });
  }

  console.error(err);
  res.status(500).json({ error: 'InternalServerError' });
}

export default { notFoundHandler, errorHandler };
