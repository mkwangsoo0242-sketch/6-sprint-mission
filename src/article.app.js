const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { PrismaClient } = require('@prisma/client');
const { z } = require('zod');

const prisma = new PrismaClient();
const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Validation Schemas
const createArticleSchema = z.object({
  title: z.string().min(1),
  content: z.string().min(1),
});

const updateArticleSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().min(1).optional(),
});

// 게시글 등록
app.post('/articles', async (req, res) => {
  try {
    const payload = createArticleSchema.parse(req.body);
    const article = await prisma.article.create({ data: payload });
    res.status(201).json(article);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'ValidationError', details: err.errors });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 게시글 상세 조회
app.get('/articles/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });
    const article = await prisma.article.findUnique({
      where: { id },
      select: { id: true, title: true, content: true, createdAt: true },
    });
    if (!article) return res.status(404).json({ error: 'NotFound' });
    res.status(200).json(article);
  } catch (_err) {
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 게시글 수정 (PATCH)
app.patch('/articles/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });
    const payload = updateArticleSchema.parse(req.body);
    if (Object.keys(payload).length === 0)
      return res.status(400).json({ error: 'EmptyPayload' });
    const updated = await prisma.article.update({
      where: { id },
      data: payload,
      select: { id: true, title: true, content: true, createdAt: true },
    });
    res.status(200).json(updated);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'ValidationError', details: err.errors });
    }
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'NotFound' });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 게시글 삭제
app.delete('/articles/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });
    await prisma.article.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'NotFound' });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 게시글 목록 조회 (검색, 페이지네이션, 최신순 정렬)
app.get('/articles', async (req, res) => {
  try {
    const offset = Number(req.query.offset ?? 0);
    const limit = Number(req.query.limit ?? 10);
    const q = String(req.query.q ?? '');
    const sort = String(req.query.sort ?? 'recent');

    if (Number.isNaN(offset) || offset < 0)
      return res.status(400).json({ error: 'InvalidOffset' });
    if (Number.isNaN(limit) || limit <= 0 || limit > 100)
      return res.status(400).json({ error: 'InvalidLimit' });

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
  } catch (_err) {
    res.status(500).json({ error: 'InternalServerError' });
  }
});
