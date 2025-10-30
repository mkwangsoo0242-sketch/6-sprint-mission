import express from 'express';
import prisma from '../lib/prisma.js';
import {
  createProductSchema,
  updateProductSchema,
  listQuerySchema,
} from '../validators/product.js';

// simple slugifier
function slugify(input) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function toNumberPrice(decimal) {
  // Prisma Decimal -> number
  if (decimal == null) return null;
  return Number(decimal);
}

function ensureTagsJson(tags) {
  // Ensure tags is a JSON array of strings
  if (Array.isArray(tags)) return tags;
  return [];
}

const router = express.Router();

// POST /products - create
router.post('/', async (req, res, next) => {
  try {
    const body = createProductSchema.parse(req.body);
    const baseSlug = slugify(body.name);
    // Ensure unique slug by appending suffix if needed
    let slug = baseSlug;
    let i = 1;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${baseSlug}-${i++}`;
    }

    const created = await prisma.product.create({
      data: {
        name: body.name,
        description: body.description,
        price: body.price, // stored as Decimal(10,2)
        tags: ensureTagsJson(body.tags),
        slug,
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const response = {
      ...created,
      price: toNumberPrice(created.price),
    };

    res.status(201).location(`/products/${created.id}`).json(response);
  } catch (err) {
    next(err);
  }
});

// GET /products/:id - detail (id, name, description, price, tags, createdAt)
router.get('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const product = await prisma.product.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        tags: true,
        createdAt: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: 'Not Found' });
    }

    res.json({ ...product, price: toNumberPrice(product.price) });
  } catch (err) {
    next(err);
  }
});

// PATCH /products/:id - partial update
router.patch('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }

    const payload = updateProductSchema.parse(req.body);

    const data = {};
    if (payload.name !== undefined) data.name = payload.name;
    if (payload.description !== undefined)
      data.description = payload.description;
    if (payload.price !== undefined) data.price = payload.price;
    if (payload.tags !== undefined) data.tags = ensureTagsJson(payload.tags);
    if (payload.status !== undefined) data.status = payload.status;
    if (payload.stock !== undefined) data.stock = payload.stock;

    // Update slug on name change
    if (payload.name) {
      const baseSlug = slugify(payload.name);
      let slug = baseSlug;
      let i = 1;
      // exclude current id from uniqueness check
      while (true) {
        const existing = await prisma.product.findUnique({ where: { slug } });
        if (!existing || existing.id === id) break;
        slug = `${baseSlug}-${i++}`;
      }
      data.slug = slug;
    }

    const updated = await prisma.product.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        tags: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    res.json({ ...updated, price: toNumberPrice(updated.price) });
  } catch (err) {
    // Map P2025 (record to update not found)
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'Not Found' });
    }
    next(err);
  }
});

// DELETE /products/:id
router.delete('/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'Invalid id' });
    }
    await prisma.product.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err?.code === 'P2025') {
      return res.status(404).json({ error: 'Not Found' });
    }
    next(err);
  }
});

// GET /products - list with offset pagination, sort=recent, q search
// Response: items [{id, name, price, createdAt}], meta {total, offset, limit, sort, q}
router.get('/', async (req, res, next) => {
  try {
    const { offset, limit, sort, q } = listQuerySchema.parse(req.query);

    // Build search condition
    let where = undefined;
    if (q && q.trim().length > 0) {
      const words = q.trim().split(/\s+/);
      where = {
        AND: words.map((word) => ({
          OR: [
            { name: { contains: word, mode: 'insensitive' } },
            { description: { contains: word, mode: 'insensitive' } },
          ],
        })),
      };
    }

    const orderBy = sort === 'recent' ? { createdAt: 'desc' } : { id: 'asc' };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip: offset,
        take: limit,
        select: {
          id: true,
          name: true,
          price: true,
          createdAt: true,
        },
      }),
    ]);

    res.json({
      items: items.map((p) => ({ ...p, price: toNumberPrice(p.price) })),
      meta: { total, offset, limit, sort: sort || null, q: q || null },
    });
  } catch (err) {
    next(err);
  }
});

export default router;
