// server/src/routes/authRoutes.js
const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// 로그인 API
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, message: '이메일과 비밀번호를 입력해주세요.' });
  }

  db.get('SELECT * FROM users WHERE email = ?', [email], (err, user) => {
    if (err) return res.status(500).json({ success: false, message: 'DB 오류 발생' });
    if (!user) return res.status(401).json({ success: false, message: '가입되지 않은 이메일입니다.' });

    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: '비밀번호가 일치하지 않습니다.' });
    }

    // JWT 토큰 발급
    const tokenPayload = {
      id: user.id,
      email: user.email,
      nickname: user.nickname,
      role: user.role,
      company: user.company
    };

    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET || 'scm_secret', { expiresIn: '12h' });

    res.json({
      success: true,
      token,
      user: tokenPayload
    });
  });
});

// 회원가입 API
router.post('/signup', (req, res) => {
  const { email, password, nickname, company } = req.body;

  if (!email || !password || !nickname) {
    return res.status(400).json({ success: false, message: '필수 입력 항목이 누락되었습니다.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);

  const query = 'INSERT INTO users (email, password, nickname, role, company) VALUES (?, ?, ?, ?, ?)';
  db.run(query, [email, hashedPassword, nickname, 'user', company || '협력사'], function (err) {
    if (err) {
      if (err.message.includes('UNIQUE')) {
        return res.status(409).json({ success: false, message: '이미 사용 중인 이메일입니다.' });
      }
      return res.status(500).json({ success: false, message: '회원가입 처리 실패' });
    }

    res.status(201).json({ success: true, message: '회원가입이 완료되었습니다.' });
  });
});

module.exports = router;