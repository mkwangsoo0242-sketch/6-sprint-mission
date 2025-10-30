import express from 'express';
import {
  insertArticle,
  getArticleById,
  updateArticleById,
  deleteArticleById,
  listArticles,
} from '../db.js';

const router = express.Router();

// Create Article
router.post('/', (req, res) => {
  const { title, content } = req.body || {};
  if (!title || !content) {
    return res.status(400).json({ message: 'title and content are required' });
  }
  if (typeof title !== 'string' || typeof content !== 'string') {
    return res
      .status(400)
      .json({ message: 'title and content must be strings' });
  }

  const info = insertArticle.run({
    title: title.trim(),
    content: content.trim(),
  });
  const created = getArticleById.get({ id: info.lastInsertRowid });
  // Return minimal info if preferred; here returning full record
  return res.status(201).json({ id: created.id });
});

// Get Article Detail
router.get('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'invalid id' });
  }
  const found = getArticleById.get({ id });
  if (!found) {
    return res.status(404).json({ message: 'article not found' });
  }
  // Only return fields requested
  const { id: fid, title, content, createdAt } = found;
  return res.json({ id: fid, title, content, createdAt });
});

// Update Article
router.put('/:id', (req, res) => {
  const id = Number(req.params.id);
  const { title, content } = req.body || {};
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'invalid id' });
  }
  if (title !== undefined && typeof title !== 'string') {
    return res.status(400).json({ message: 'title must be a string' });
  }
  if (content !== undefined && typeof content !== 'string') {
    return res.status(400).json({ message: 'content must be a string' });
  }
  if (title === undefined && content === undefined) {
    return res.status(400).json({ message: 'nothing to update' });
  }

  const result = updateArticleById.run({
    id,
    title: title !== undefined ? title.trim() : null,
    content: content !== undefined ? content.trim() : null,
  });

  if (result.changes === 0) {
    return res.status(404).json({ message: 'article not found' });
  }
  return res.json({ id, updated: true });
});

// Delete Article
router.delete('/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ message: 'invalid id' });
  }
  const result = deleteArticleById.run({ id });
  if (result.changes === 0) {
    return res.status(404).json({ message: 'article not found' });
  }
  return res.status(204).send();
});

// List Articles with pagination, sort, search
router.get('/', (req, res) => {
  const { offset, limit, sort, query } = req.query;
  if (sort && sort !== 'recent') {
    return res
      .status(400)
      .json({ message: 'invalid sort; only recent is supported' });
  }
  const data = listArticles({
    offset,
    limit,
    sort: sort || 'recent',
    query: query || '',
  });
  return res.json({
    items: data.rows,
    total: data.total,
    offset: data.offset,
    limit: data.limit,
  });
});

export default router;
