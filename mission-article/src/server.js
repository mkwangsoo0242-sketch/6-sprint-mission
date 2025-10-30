import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import './db.js';
import articlesRouter from './routes/articles.js';

const app = express();

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan(process.env.NODE_ENV === 'development' ? 'dev' : 'combined'));

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/articles', articlesRouter);

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'not found' });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  // Avoid leaking internals
  res.status(500).json({ message: 'internal server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server listening on http://localhost:${port}`);
});
