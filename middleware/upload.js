import express from 'express';
import multer, { diskStorage } from 'multer';
import { extname } from 'path';

const app = express();

// 저장 설정
const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // uploads 폴더에 저장
  },
  filename: (req, file, cb) => {
    const ext = extname(file.originalname);
    const name = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, name + ext);
  },
});

// 이미지 필터 (이미지 파일만 허용)
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) cb(null, true);
  else cb(new Error('이미지 파일만 업로드할 수 있습니다.'), false);
};

// 업로드 제한(예: 5MB)
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// 정적 제공 (업로드된 이미지에 URL로 접근 가능하게)
app.use('/uploads', express.static('uploads'));

// 단일 이미지 업로드 예: input name = "image"
app.post('/upload', upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });

  // 저장된 파일 정보는 req.file에 있음
  // 예: req.file.filename, req.file.path
  const publicUrl = `/uploads/${req.file.filename}`; // 필요하면 전체 호스트 포함해서 반환

  // DB에 파일 경로 저장 가능 (원하면 저장 방법 추가)
  return res
    .status(201)
    .json({ path: publicUrl, originalName: req.file.originalname });
});

// 에러 핸들링 간단 예
app.use((err, req, res, next) => {
  if (err.message) return res.status(400).json({ error: err.message });
  res.status(500).json({ error: '서버 오류' });
});

app.listen(3000, () => console.log('server running on 3000'));
