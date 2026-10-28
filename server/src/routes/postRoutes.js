// server/src/routes/postRoutes.js
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { verifyToken } = require('../middlewares/authMiddleware');

// 1. 게시글 목록 조회 (카테고리 필터, 페이징, 검색어)
router.get('/', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const category = req.query.category || '전체';
  const search = req.query.search ? `%${req.query.search}%` : '%';
  const offset = (page - 1) * limit;

  let countSql = `
    SELECT count(*) as total 
    FROM posts p 
    JOIN users u ON p.user_id = u.id 
    WHERE (p.title LIKE ? OR p.content LIKE ? OR u.nickname LIKE ?)
  `;
  let selectSql = `
    SELECT p.*, u.nickname as author, u.company,
      (SELECT count(*) FROM comments c WHERE c.post_id = p.id) as commentCount
    FROM posts p
    JOIN users u ON p.user_id = u.id
    WHERE (p.title LIKE ? OR p.content LIKE ? OR u.nickname LIKE ?)
  `;

  const params = [search, search, search];

  if (category !== '전체') {
    countSql += ' AND p.category = ?';
    selectSql += ' AND p.category = ?';
    params.push(category);
  }

  // 전체 개수 확인
  db.get(countSql, params, (err, countRow) => {
    if (err) return res.status(500).json({ success: false, message: err.message });

    const totalPosts = countRow.total;
    const totalPages = Math.ceil(totalPosts / limit) || 1;

    // 데이터 조회 (최신순)
    selectSql += ' ORDER BY p.id DESC LIMIT ? OFFSET ?';
    const queryParams = [...params, limit, offset];

    db.all(selectSql, queryParams, (err, rows) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({
        success: true,
        data: rows,
        pagination: {
          page,
          limit,
          totalPosts,
          totalPages
        }
      });
    });
  });
});

// 2. 카테고리별 글 수 통계
router.get('/category-stats', (req, res) => {
  const sql = 'SELECT category, count(*) as count FROM posts GROUP BY category';
  db.all(sql, [], (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, data: rows });
  });
});

// 3. 게시글 상세 조회 (조회수 +1 및 댓글 포함)
router.get('/:id', (req, res) => {
  const postId = req.params.id;

  // 조회수 1 증가
  db.run('UPDATE posts SET views = views + 1 WHERE id = ?', [postId], () => {
    const postSql = `
      SELECT p.*, u.nickname as author, u.company 
      FROM posts p 
      JOIN users u ON p.user_id = u.id 
      WHERE p.id = ?
    `;
    db.get(postSql, [postId], (err, post) => {
      if (err || !post) return res.status(404).json({ success: false, message: '글을 찾을 수 없습니다.' });

      // 댓글 목록 가져오기
      const commentSql = `
        SELECT c.*, u.nickname as author, u.role, u.company
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = ?
        ORDER BY c.id ASC
      `;
      db.all(commentSql, [postId], (err, comments) => {
        if (err) return res.status(500).json({ success: false, message: err.message });
        res.json({ success: true, data: { ...post, comments } });
      });
    });
  });
});

// 4. 게시글 작성 (로그인 필수)
router.post('/', verifyToken, (req, res) => {
  const { title, content, category, is_urgent, is_secret } = req.body;
  const userId = req.user.id;

  if (!title || !content || !category) {
    return res.status(400).json({ success: false, message: '제목, 내용, 분류는 필수입니다.' });
  }

  // 컬럼 7개와 VALUES 값 7개의 짝을 정확히 맞춥니다.
  const sql = `
    INSERT INTO posts (user_id, category, status, is_urgent, is_secret, title, content)
    VALUES (?, ?, '접수완료', ?, ?, ?, ?)
  `;
  
  db.run(
    sql,
    [
      userId,
      category,
      is_urgent ? 1 : 0,
      is_secret ? 1 : 0,
      title,
      content
    ],
    function (err) {
      if (err) {
        console.error('글 작성 DB 에러:', err);
        return res.status(500).json({ success: false, message: err.message });
      }
      res.status(201).json({ success: true, postId: this.lastID });
    }
  );
});

// 5. 게시글 수정 (작성자 또는 관리자)
router.put('/:id', verifyToken, (req, res) => {
  const postId = req.params.id;
  const { title, content, category, is_urgent, is_secret } = req.body;

  db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (err, post) => {
    if (!post) return res.status(404).json({ success: false, message: '게시글이 존재하지 않습니다.' });
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '수정 권한이 없습니다.' });
    }

    const sql = `
      UPDATE posts 
      SET title = ?, content = ?, category = ?, is_urgent = ?, is_secret = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    db.run(sql, [title, content, category, is_urgent ? 1 : 0, is_secret ? 1 : 0, postId], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: '게시글이 수정되었습니다.' });
    });
  });
});

// 6. 게시글 삭제 (작성자 또는 관리자)
router.delete('/:id', verifyToken, (req, res) => {
  const postId = req.params.id;

  db.get('SELECT user_id FROM posts WHERE id = ?', [postId], (err, post) => {
    if (!post) return res.status(404).json({ success: false, message: '게시글이 존재하지 않습니다.' });
    if (post.user_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: '삭제 권한이 없습니다.' });
    }

    db.run('DELETE FROM posts WHERE id = ?', [postId], (err) => {
      if (err) return res.status(500).json({ success: false, message: err.message });
      res.json({ success: true, message: '게시글이 삭제되었습니다.' });
    });
  });
});

// 7. 댓글 등록 (로그인 필수)
router.post('/:id/comments', verifyToken, (req, res) => {
  const postId = req.params.id;
  const { content } = req.body;
  const userId = req.user.id;
  const isOfficial = req.user.role === 'admin' ? 1 : 0;

  if (!content) return res.status(400).json({ success: false, message: '댓글 내용을 입력하세요.' });

  const sql = 'INSERT INTO comments (post_id, user_id, content, is_official) VALUES (?, ?, ?, ?)';
  db.run(sql, [postId, userId, content, isOfficial], function (err) {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.status(201).json({ success: true, commentId: this.lastID });
  });
});

// 8. 상태 변경 (관리자 전용: 접수완료/처리중/답변완료)
router.patch('/:id/status', verifyToken, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, message: '운영팀 관리자만 상태를 변경할 수 있습니다.' });
  }

  const postId = req.params.id;
  const { status } = req.body;

  db.run('UPDATE posts SET status = ? WHERE id = ?', [status, postId], (err) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ success: true, message: '상태가 변경되었습니다.' });
  });
});

module.exports = router;