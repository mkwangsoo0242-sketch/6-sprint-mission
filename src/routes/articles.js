import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import {
  validateBody,
  createArticleSchema,
  updateArticleSchema,
  createCommentSchema,
  updateCommentSchema,
} from '../middlewares/validators.js';

const prisma = new PrismaClient();
const router = Router();

// /articles
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
              { title: { contains: q, mode: 'insensitive' } },
              { content: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {};
      const orderBy = sort === 'recent' ? { createdAt: 'desc' } : { id: 'asc' };
      const articles = await prisma.article.findMany({
        where,
        skip: offset,
        take: limit,
        orderBy,
        select: { id: true, title: true, content: true, createdAt: true },
      });
      res.status(200).json(articles);
    } catch (err) {
      next(err);
    }
  })
  // 등록
  .post(validateBody(createArticleSchema), async (req, res, next) => {
    try {
      const article = await prisma.article.create({ data: req.validatedBody });
      res.status(201).json(article);
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
      const article = await prisma.article.findUnique({
        where: { id },
        select: { id: true, title: true, content: true, createdAt: true },
      });
      if (!article) return next({ status: 404, code: 'NotFound' });
      res.status(200).json(article);
    } catch (err) {
      next(err);
    }
  })
  .patch(validateBody(updateArticleSchema), async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0)
        return next({ status: 400, code: 'InvalidId' });
      const updated = await prisma.article.update({
        where: { id },
        data: req.validatedBody,
        select: { id: true, title: true, content: true, createdAt: true },
      });
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  })
  .delete(async (req, res, next) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0)
        return next({ status: 400, code: 'InvalidId' });
      await prisma.article.delete({ where: { id } });
      res.status(204).send();
    } catch (err) {
      next(err);
    }
  });

// 댓글: 등록/목록
router.post(
  '/:articleId/comments',
  validateBody(createCommentSchema),
  async (req, res, next) => {
    try {
      const articleId = Number(req.params.articleId);
      if (!Number.isInteger(articleId) || articleId <= 0)
        return next({ status: 400, code: 'InvalidArticleId' });
      const exists = await prisma.article.findUnique({
        where: { id: articleId },
        select: { id: true },
      });
      if (!exists) return next({ status: 404, code: 'ArticleNotFound' });
      const comment = await prisma.articleComment.create({
        data: { content: req.validatedBody.content, articleId },
        select: { id: true, content: true, createdAt: true },
      });
      res.status(201).json(comment);
    } catch (err) {
      next(err);
    }
  }
);

router.get('/:articleId/comments', async (req, res, next) => {
  try {
    const articleId = Number(req.params.articleId);
    if (!Number.isInteger(articleId) || articleId <= 0)
      return next({ status: 400, code: 'InvalidArticleId' });
    const limit = Number(req.query.limit ?? 10);
    if (Number.isNaN(limit) || limit <= 0 || limit > 100)
      return next({ status: 400, code: 'InvalidLimit' });
    const cursorId = req.query.cursor ? Number(req.query.cursor) : undefined;
    if (req.query.cursor && (!Number.isInteger(cursorId) || cursorId <= 0))
      return next({ status: 400, code: 'InvalidCursor' });
    const comments = await prisma.articleComment.findMany({
      where: { articleId },
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
      const updated = await prisma.articleComment.update({
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
    await prisma.articleComment.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

export default router;
