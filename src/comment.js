// ===================== 댓글: 중고마켓(Product) =====================
// 댓글 등록 (중고마켓)
app.post('/products/:productId/comments', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0)
      return res.status(400).json({ error: 'InvalidProductId' });
    const payload = createCommentSchema.parse(req.body);

    const exists = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true },
    });
    if (!exists) return res.status(404).json({ error: 'ProductNotFound' });

    const comment = await prisma.productComment.create({
      data: { content: payload.content, productId },
      select: { id: true, content: true, createdAt: true },
    });
    res.status(201).json(comment);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'ValidationError', details: err.errors });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 댓글 목록 (중고마켓) - cursor 기반 페이지네이션
// Query: limit (1~100), cursor (이전 페이지 마지막 댓글 id)
app.get('/products/:productId/comments', async (req, res) => {
  try {
    const productId = Number(req.params.productId);
    if (!Number.isInteger(productId) || productId <= 0)
      return res.status(400).json({ error: 'InvalidProductId' });

    const limit = Number(req.query.limit ?? 10);
    if (Number.isNaN(limit) || limit <= 0 || limit > 100)
      return res.status(400).json({ error: 'InvalidLimit' });
    const cursorId = req.query.cursor ? Number(req.query.cursor) : undefined;
    if (req.query.cursor && (!Number.isInteger(cursorId) || cursorId <= 0))
      return res.status(400).json({ error: 'InvalidCursor' });

    const where = { productId };
    const orderBy = { id: 'desc' };
    const comments = await prisma.productComment.findMany({
      where,
      orderBy,
      take: limit,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: { id: true, content: true, createdAt: true },
    });

    const nextCursor =
      comments.length === limit ? comments[comments.length - 1].id : null;
    res.status(200).json({ items: comments, nextCursor });
  } catch (_err) {
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 댓글 수정 (중고마켓)
app.patch('/product-comments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });
    const payload = updateCommentSchema.parse(req.body);

    const updated = await prisma.productComment.update({
      where: { id },
      data: { content: payload.content },
      select: { id: true, content: true, createdAt: true },
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

// 댓글 삭제 (중고마켓)
app.delete('/product-comments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });
    await prisma.productComment.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'NotFound' });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// ===================== 댓글: 자유게시판(Article) =====================
// 댓글 등록 (자유게시판)
app.post('/articles/:articleId/comments', async (req, res) => {
  try {
    const articleId = Number(req.params.articleId);
    if (!Number.isInteger(articleId) || articleId <= 0)
      return res.status(400).json({ error: 'InvalidArticleId' });
    const payload = createCommentSchema.parse(req.body);

    const exists = await prisma.article.findUnique({
      where: { id: articleId },
      select: { id: true },
    });
    if (!exists) return res.status(404).json({ error: 'ArticleNotFound' });

    const comment = await prisma.articleComment.create({
      data: { content: payload.content, articleId },
      select: { id: true, content: true, createdAt: true },
    });
    res.status(201).json(comment);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'ValidationError', details: err.errors });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 댓글 목록 (자유게시판) - cursor 기반 페이지네이션
app.get('/articles/:articleId/comments', async (req, res) => {
  try {
    const articleId = Number(req.params.articleId);
    if (!Number.isInteger(articleId) || articleId <= 0)
      return res.status(400).json({ error: 'InvalidArticleId' });

    const limit = Number(req.query.limit ?? 10);
    if (Number.isNaN(limit) || limit <= 0 || limit > 100)
      return res.status(400).json({ error: 'InvalidLimit' });
    const cursorId = req.query.cursor ? Number(req.query.cursor) : undefined;
    if (req.query.cursor && (!Number.isInteger(cursorId) || cursorId <= 0))
      return res.status(400).json({ error: 'InvalidCursor' });

    const where = { articleId };
    const orderBy = { id: 'desc' };
    const comments = await prisma.articleComment.findMany({
      where,
      orderBy,
      take: limit,
      ...(cursorId ? { cursor: { id: cursorId }, skip: 1 } : {}),
      select: { id: true, content: true, createdAt: true },
    });

    const nextCursor =
      comments.length === limit ? comments[comments.length - 1].id : null;
    res.status(200).json({ items: comments, nextCursor });
  } catch (_err) {
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 댓글 수정 (자유게시판)
app.patch('/article-comments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });
    const payload = updateCommentSchema.parse(req.body);

    const updated = await prisma.articleComment.update({
      where: { id },
      data: { content: payload.content },
      select: { id: true, content: true, createdAt: true },
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

// 댓글 삭제 (자유게시판)
app.delete('/article-comments/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });
    await prisma.articleComment.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'NotFound' });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

export default app;
