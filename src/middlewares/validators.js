import { z } from 'zod';

const createProductSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  price: z.number().positive(),
  tags: z.array(z.string().min(1)).default([]),
});

const updateProductSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive().optional(),
  tags: z.array(z.string().min(1)).optional(),
});

const createArticleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

const createCommentSchema = z.object({
  content: z.string().min(1),
});

const updateCommentSchema = z.object({
  content: z.string().min(1),
});

function validateBody(schema) {
  return (req, _res, next) => {
    try {
      const parsed = schema.parse(req.body);
      req.validatedBody = parsed;
      next();
    } catch (err) {
      if (err instanceof z.ZodError) {
        return next({
          status: 400,
          code: 'ValidationError',
          details: err.errors,
        });
      }
      next(err);
    }
  };
}

export default {
  createProductSchema,
  updateProductSchema,
  createArticleSchema,
  updateArticleSchema,
  createCommentSchema,
  updateCommentSchema,
  validateBody,
};
