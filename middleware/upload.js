import { join, extname, basename } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { Router } from 'express';
import multer, { diskStorage } from 'multer';

const router = Router();

const uploadDir = join(process.cwd(), 'uploads');
if (!existsSync(uploadDir)) {
  mkdirSync(uploadDir, { recursive: true });
}

const storage = diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = extname(file.originalname);
    const base = basename(file.originalname, ext).replace(
      /[^a-zA-Z0-9_-]/g,
      ''
    );
    cb(null, `${base}-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

router.post('/image', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'NoFileUploaded' });
  const relativePath = join('uploads', req.file.filename).replace(/\\/g, '/');
  res.status(201).json({ path: `/${relativePath}` });
});

export default router;
