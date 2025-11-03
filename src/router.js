import express, { json } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { join } from 'path';
import { notFoundHandler, errorHandler } from './middlewares/errorHandler';
import uploadsRouter from './routes/uploads';
import productsRouter from './routes/products';
import articlesRouter from './routes/articles';
const app = express();

app.use(cors());
app.use(morgan('dev'));
app.use(json());
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));

// 라우터 마운트
app.use('/uploads', uploadsRouter);
app.use('/products', productsRouter);
app.use('/articles', articlesRouter);
// 상품 등록
app.post('/products', async (req, res) => {
  try {
    const { name, description, price, tags } = createProductSchema.parse(
      req.body
    );

    const result = await prisma.$transaction(async (tx) => {
      // Ensure tags exist
      const tagRecords = await Promise.all(
        (tags || []).map(async (t) =>
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
          productTags: {
            create: tagRecords.map((tr) => ({ tagId: tr.id })),
          },
        },
        include: { productTags: { include: { tag: true } } },
      });
      return product;
    });

    const mapped = mapProductWithTags(result);
    // 201 Created
    res.status(201).json(mapped);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'ValidationError', details: err.errors });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 상품 상세 조회
app.get('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });

    const product = await prisma.product.findUnique({
      where: { id },
      include: { productTags: { include: { tag: true } } },
    });
    if (!product) return res.status(404).json({ error: 'NotFound' });

    const mapped = mapProductWithTags(product);
    // 상세 응답: id, name, description, price, tags, createdAt
    const { updatedAt, ...response } = mapped; // updatedAt 제외
    res.status(200).json(response);
  } catch (_err) {
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 상품 수정 (PATCH)
app.patch('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });
    const payload = updateProductSchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      // if product not exists -> 404
      const exists = await tx.product.findUnique({ where: { id } });
      if (!exists) throw new Error('NOT_FOUND');

      const { tags, ...rest } = payload;
      const product = await tx.product.update({
        where: { id },
        data: { ...rest },
        include: { productTags: { include: { tag: true } } },
      });

      if (tags) {
        // sync tags: delete all, then recreate
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
              createMany: { data: tagRecords.map((tr) => ({ tagId: tr.id })) },
            },
          },
        });
      }

      const reloaded = await tx.product.findUnique({
        where: { id },
        include: { productTags: { include: { tag: true } } },
      });
      return reloaded;
    });

    const mapped = mapProductWithTags(updated);
    res.status(200).json(mapped);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res
        .status(400)
        .json({ error: 'ValidationError', details: err.errors });
    }
    if (err instanceof Error && err.message === 'NOT_FOUND') {
      return res.status(404).json({ error: 'NotFound' });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 상품 삭제
app.delete('/products/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0)
      return res.status(400).json({ error: 'InvalidId' });
    await prisma.product.delete({ where: { id } });
    // 204 No Content
    res.status(204).send();
  } catch (err) {
    if (err && err.code === 'P2025') {
      return res.status(404).json({ error: 'NotFound' });
    }
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 상품 목록 조회 (검색, 페이지네이션, 최신순 정렬)
// Query: offset, limit, q, sort=recent
app.get('/products', async (req, res) => {
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
  } catch (_err) {
    res.status(500).json({ error: 'InternalServerError' });
  }
});

// 404 및 에러 핸들러
app.use(notFoundHandler);
app.use(errorHandler);
export default app;
