import { z } from 'zod';

export const createProductSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().min(1),
  price: z.number().nonnegative().finite(),
  tags: z.array(z.string().min(1)).default([]),
});

export const updateProductSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: z.string().min(1).optional(),
    price: z.number().nonnegative().finite().optional(),
    tags: z.array(z.string().min(1)).optional(),
    status: z.enum(['ACTIVE', 'DRAFT', 'ARCHIVED']).optional(),
    stock: z.number().int().min(0).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  });

export const listQuerySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['recent']).optional(),
  q: z.string().optional(),
});
