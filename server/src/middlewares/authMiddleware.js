// server/src/middlewares/authMiddleware.js
const jwt = require('jsonwebtoken');

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // "Bearer <TOKEN>" 파싱

  if (!token) {
    return res.status(401).json({ success: false, message: '인증 토큰이 필요합니다.' });
  }

  jwt.verify(token, process.env.JWT_SECRET || 'scm_secret', (err, user) => {
    if (err) {
      return res.status(403).json({ success: false, message: '유효하지 않거나 만료된 토큰입니다.' });
    }
    req.user = user; // { id, email, nickname, role, company }
    next();
  });
}

// 관리자(admin) 전용 라우트 보호 미들웨어
function verifyAdmin(req, res, next) {
  verifyToken(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '관리자 권한이 필요합니다.' });
    }
    next();
  });
}

module.exports = { verifyToken, verifyAdmin };