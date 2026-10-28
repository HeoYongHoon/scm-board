// server/src/app.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/db');

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = [
  'http://localhost:5173',
  'https://scm-board.vercel.app' // Vercel 배포 주소 허용
];

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

// server/src/app.js 상단 CORS 설정
app.use(cors({
  origin: function (origin, callback) {
    // 도메인이 없는 요청(Postman, curl 등)이거나 허용 목록에 있으면 허용
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('CORS 정책에 의해 차단되었습니다.'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.listen(PORT, () => {
  console.log(`SCM 문의 게시판 서버가 http://localhost:${PORT} 에서 실행 중입니다.`);
});