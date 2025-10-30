import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import productsRouter from './routes/products.js';
import { errorHandler, notFoundHandler } from './middleware/error.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

app.use('/products', productsRouter);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
