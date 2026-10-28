// server/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

// 미들웨어 등록
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 헬스체크 라우트
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 향후 라우터 연결 자리
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/posts', require('./routes/postRoutes'));

app.listen(PORT, () => {
  console.log(`SCM 문의 게시판 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});