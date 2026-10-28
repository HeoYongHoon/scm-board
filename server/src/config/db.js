// server/src/config/db.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

const dbPath = path.join(__dirname, '../../database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('DB 연결 실패:', err.message);
  } else {
    console.log('SQLite DB 연결 성공');
  }
});

// 순차 실행 보장 (db.serialize)
db.serialize(() => {
  // 외래키 활성화
  db.run('PRAGMA foreign_keys = ON');

  // 1. 사용자 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      nickname TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'user',
      company TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. 게시글 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS posts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      category TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT '접수완료',
      is_urgent INTEGER DEFAULT 0,
      is_secret INTEGER DEFAULT 0,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      views INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 3. 댓글 테이블 생성
  db.run(`
    CREATE TABLE IF NOT EXISTS comments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      post_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      content TEXT NOT NULL,
      is_official INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )
  `);

  // 4. 시드 데이터 생성 (순서 보장 콜백)
  db.get('SELECT count(*) as count FROM users', (err, row) => {
    if (err) return console.error('유저 확인 실패:', err);

    if (row && row.count === 0) {
      console.log('초기 시드 데이터 생성을 시작합니다...');
      const defaultPw = bcrypt.hashSync('1234', 10);

      // (1) 관리자 계정 생성
      db.run(
        'INSERT INTO users (email, password, nickname, role, company) VALUES (?, ?, ?, ?, ?)',
        ['admin@scm.com', defaultPw, '운영자', 'admin', 'SCM 통합관제팀'],
        function (err) {
          if (err) return console.error('운영자 생성 실패:', err);

          // (2) 김코딩 계정 생성 (id: 2가 됨)
          db.run(
            'INSERT INTO users (email, password, nickname, role, company) VALUES (?, ?, ?, ?, ?)',
            ['logistics@partner.com', defaultPw, '김코딩', 'user', '대한물류'],
            function (err) {
              if (err) return console.error('김코딩 생성 실패:', err);
              const userIdKim = this.lastID; // 생성된 ID 사용

              // (3) 개발조아 계정 생성 (id: 3이 됨)
              db.run(
                'INSERT INTO users (email, password, nickname, role, company) VALUES (?, ?, ?, ?, ?)',
                ['supply@partner.com', defaultPw, '개발조아', 'user', '한성테크'],
                function (err) {
                  if (err) return console.error('개발조아 생성 실패:', err);
                  const userIdDev = this.lastID; // 생성된 ID 사용

                  // (4) 유저 생성이 완료된 후 안전하게 게시글 삽입
                  const postStmt = db.prepare(`
                    INSERT INTO posts (user_id, category, status, is_urgent, is_secret, title, content, views, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                  `);

                  postStmt.run(userIdKim, '주문/발주', '접수완료', 1, 0, '2026-10-28 출고 예정 건 분할 배송 요청', 'P/O 번호: PO-20261028-091 긴급 분할 출고 요청 건입니다.', 12, '2026-10-28 09:12:00');
                  postStmt.run(userIdDev, '배송/물류', '처리중', 0, 0, '인천물류센터 3번 도크 하역 지연 문의', '오전 10시 도착 예정 화물차량 하역 지연이 발생하고 있습니다.', 34, '2026-10-28 08:30:00');
                  postStmt.run(userIdDev, '협력사/정산', '답변완료', 0, 1, '10월 마감 인보이스 검증 재요청', '정산서 상의 반품 물량 공제 금액이 일치하지 않습니다.', 5, '2026-10-27 16:45:00');
                  
                  postStmt.finalize(() => {
                    console.log('초기 시드 데이터 생성이 성공적으로 완료되었습니다.');
                  });
                }
              );
            }
          );
        }
      );
    }
  });
});

module.exports = db;