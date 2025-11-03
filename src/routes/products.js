import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  validateBody,
  createProductSchema,
  updateProductSchema,
  createCommentSchema,
  updateCommentSchema,
} from '../middlewares/validators';

const prisma = new PrismaClient();
const router = Router();

// /products
router
  .route('/')
  // 목록
  .get(async (req, res, next) => {
    try {
      const offset = Number(req.query.offset ?? 0);
      const limit = Number(req.query.limit ?? 10);
      const q = String(req.query.q ?? '');
      const sort = String(req.query.sort ?? 'recent');

      if (Number.isNaN(offset) || offset < 0)
        return next({ status: 400, code: 'InvalidOffset' });
      if (Number.isNaN(limit) || limit <= 0 || limit > 100)
        return next({ status: 400, code: 'InvalidLimit' });

      const where = q
        ? {
            OR: [
              { name: { contains: q, mode: 'insensitive' } },
              { description: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {};

      const orderBy = sort === 'recent' ? { createdAt: 'desc' } : { id: 'asc' };

      const products = await prisma.product.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy,
        select: { id: true, name: true, price: true, createdAt: true },
      });
      res.status(200).json(products);
    } catch (err) {
      next(err);
    }
  })
  // 등록
  .post(validateBody(createProductSchema), async (req, res, next) => {
    try {
      const { name, description, price, tags } = req.validatedBody;
      const result = await prisma.$transaction(async (tx) => {
        const tagRecords = await Promise.all(
          (tags || []).map((t) =>
            tx.tag.upsert({
              where: { name: t },
              update: {},
              create: { name: t },
            })
          )
        );
        const product = await tx.product.create({
          data: {
            name,
            description,
            price,
            productTags: { create: tagRecords.map((tr) => ({ tagId: tr.id })) },
          },
          include: { productTags: { include: { tag: true } } },
        });
        return product;
      });
      const tagsOut = (result.productTags || []).map((pt) => pt.tag.name);
      const { productTags, ...rest } = result;
      res.status(201).json({ ...rest, tags: tagsOut });
    } catch (err) {
      next(err);
    }
  });

// 상세/수정/삭제
router
  .route('/:id')
  .get(async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0)
        return next({ status: 400, code: 'InvalidId' });
      const product = await prisma.product.findUnique({
        where: { id },
        include: { productTags: { include: { tag: true } } },
      });
      if (!product) return next({ status: 404, code: 'NotFound' });
      const tags = (product.productTags || []).map((pt) => pt.tag.name);
      const { productTags, updatedAt, ...rest } = product;
      res.status(200).json({ ...rest, tags });
    } catch (err) {
      next(err);
    }
  })
  .patch(validateBody(updateProductSchema), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0)
        return next({ status: 400, code: 'InvalidId' });
      const payload = req.validatedBody;
      const updated = await prisma.$transaction(async (tx) => {
        const exists = await tx.product.findUnique({ where: { id } });
        if (!exists)
          throw Object.assign(new Error('NotFound'), {
            status: 404,
            code: 'NotFound',
          });
        const { tags, ...rest } = payload;
        await tx.product.update({ where: { id }, data: rest });
        if (tags) {
          await tx.productTag.deleteMany({ where: { productId: id } });
          const tagRecords = await Promise.all(
            tags.map((t) =>
              tx.tag.upsert({
                where: { name: t },
                update: {},
                create: { name: t },
              })
            )
          );
          await tx.product.update({
            where: { id },
            data: {
              productTags: {
                createMany: {
                  data: tagRecords.map((tr) => ({ tagId: tr.id })),
                },
              },
            },
          });
        }
        return tx.product.findUnique({
          where: { id },
          include: { productTags: { include: { tag: true } } },
        });
      });
      const tags = (updated.productTags || []).map((pt) => pt.tag.name);
      const { productTags, ...rest } = updated;
      res.status(200).json({ ...rest, tags });
    } catch (err) {
      next(err);
    }
  })
  .delete(async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0)
        return next({ status: 400, code: 'InvalidId' });
      await prisma.product.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

// 댓글: 등록/목록
router.post(
  '/:productId/comments',
  validateBody(createCommentSchema),
  async (req, res, next) => {
    try {
      const productId = Number(req.params.productId);
      if (!Number.isInteger(productId) || productId <= 0)
        return next({ status: 400, code: 'InvalidProductId' });
      const exists = await prisma.product.findUnique({
        where: { id: productId },
        select: { id: true },
      });
      if (!exists) return next({ status: 404, code: 'ProductNotFound' });
      const comment = await prisma.productComment.create({
        data: { content: req.validatedBody.content, productId },
        select: { id: true, content: true, createdAt: true },
      });
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:productId/comments', async (req, res, next) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0)
      return next({ status: 400, code: 'InvalidProductId' });
    const limit = Number(req.query.limit ?? 10);
    if (Number.isNaN(limit) || limit <= 0 || limit > 100)
      return next({ status: 400, code: 'InvalidLimit' });
    const cursorId = req.query.cursor ? Number(req.query.cursor) : undefined;
    if (req.query.cursor && (!Number.isInteger(cursorId) || cursorId <= 0))
      return next({ status: 400, code: 'InvalidCursor' });
    const comments = await prisma.productComment.findMany({
      where: { productId },
      orderBy: { id: 'desc' },
      take: limit,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: { id: true, content: true, createdAt: true },
    });
    const nextCursor =
      comments.length === limit ? comments[comments.length - 1].id : null;
    res.status(200).json({ items: comments, nextCursor });
  } catch (err) {
    next(err);
  }
});

// 댓글: 수정/삭제
router.patch(
  '/comments/:id',
  validateBody(updateCommentSchema),
  async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0)
        return next({ status: 400, code: 'InvalidId' });
      const updated = await prisma.productComment.update({
        where: { id },
        data: { content: req.validatedBody.content },
        select: { id: true, content: true, createdAt: true },
      });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  }
);

router.delete('/comments/:id', async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return next({ status: 400, code: 'InvalidId' });
    await prisma.productComment.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
