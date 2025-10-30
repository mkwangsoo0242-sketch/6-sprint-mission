import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export function notFoundHandler(req, res, next) {
  res.status(404).json({ error: 'Not Found' });
}

export function errorHandler(err, req, res, next) {
  // Zod validation
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'ValidationError',
      issues: err.issues.map((i) => ({ path: i.path, message: i.message })),
    });
  }

  // Prisma known errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Conflict', detail: err.meta });
    }
    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Not Found' });
    }
  }

  // Custom http error with status
  if (err && typeof err.status === 'number') {
    return res.status(err.status).json({ error: err.message || 'Error' });
  }

  console.error(err);
  res.status(500).json({ error: 'InternalServerError' });
}
