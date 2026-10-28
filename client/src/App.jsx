import React, { useState, useEffect } from 'react';
import api from './api/client';
import {
  Search,
  PlusCircle,
  MessageSquare,
  Eye,
  Clock,
  ShieldCheck,
  AlertCircle,
  Truck,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  User,
  LogOut,
  LogIn,
  Edit2,
  Trash2,
  Lock,
  PhoneCall,
  CheckCircle2,
  Building2,
  Sparkles
} from 'lucide-react';

const CATEGORIES = [
  '전체',
  '주문/발주',
  '재고 관리',
  '배송/물류',
  '입출고/검수',
  '협력사/정산',
  '시스템/기타'
];

export default function App() {
  // 인증 상태
  const [currentUser, setCurrentUser] = useState(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', nickname: '', company: '' });

  // 데이터 상태
  const [posts, setPosts] = useState([]);
  const [categoryCounts, setCategoryCounts] = useState({});
  const [loading, setLoading] = useState(false);

  // 필터 및 페이징 상태
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [pageSize, setPageSize] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPosts, setTotalPosts] = useState(0);

  // 뷰 화면 제어 ('list' | 'detail' | 'write' | 'edit')
  const [currentView, setCurrentView] = useState('list');
  const [selectedPost, setSelectedPost] = useState(null);
  const [commentInput, setCommentInput] = useState('');

  // 글 작성/수정 폼 상태
  const [postForm, setPostForm] = useState({
    title: '',
    category: '주문/발주',
    content: '',
    is_urgent: false,
    is_secret: false
  });

  // 1. 앱 시작 시 로컬스토리지의 로그인 정보 복원
  useEffect(() => {
    const savedUser = localStorage.getItem('scm_user');
    const token = localStorage.getItem('scm_token');
    if (savedUser && token) {
      try {
        setCurrentUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('scm_user');
        localStorage.removeItem('scm_token');
      }
    }
  }, []);

  // 2. 게시글 목록 및 카테고리 통계 로드
  useEffect(() => {
    loadPosts();
    loadCategoryStats();
  }, [selectedCategory, currentPage, pageSize]);

  const loadPosts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/posts', {
        params: {
          category: selectedCategory,
          page: currentPage,
          limit: pageSize,
          search: searchKeyword
        }
      });
      if (res.data.success) {
        setPosts(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setTotalPosts(res.data.pagination.totalPosts);
      }
    } catch (err) {
      console.error('목록 로딩 실패:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCategoryStats = async () => {
    try {
      const res = await api.get('/posts/category-stats');
      if (res.data.success) {
        const counts = {};
        res.data.data.forEach((item) => {
          counts[item.category] = item.count;
        });
        setCategoryCounts(counts);
      }
    } catch (err) {
      console.error('통계 로딩 실패:', err);
    }
  };

  // 검색 실행
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    loadPosts();
  };

  // 3. 인증 관련 핸들러
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      if (authMode === 'login') {
        const res = await api.post('/auth/login', {
          email: authForm.email,
          password: authForm.password
        });
        if (res.data.success) {
          localStorage.setItem('scm_token', res.data.token);
          localStorage.setItem('scm_user', JSON.stringify(res.data.user));
          setCurrentUser(res.data.user);
          setShowAuthModal(false);
          setAuthForm({ email: '', password: '', nickname: '', company: '' });
          alert(`환영합니다, ${res.data.user.nickname}님!`);
        }
      } else {
        const res = await api.post('/auth/signup', authForm);
        if (res.data.success) {
          alert('회원가입이 완료되었습니다. 로그인해 주세요.');
          setAuthMode('login');
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || '인증 처리 중 오류가 발생했습니다.');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('scm_token');
    localStorage.removeItem('scm_user');
    setCurrentUser(null);
    alert('로그아웃되었습니다.');
  };

  // 빠른 테스트 계정 전환
  const handleQuickLogin = async (email) => {
    try {
      const res = await api.post('/auth/login', { email, password: '1234' });
      if (res.data.success) {
        localStorage.setItem('scm_token', res.data.token);
        localStorage.setItem('scm_user', JSON.stringify(res.data.user));
        setCurrentUser(res.data.user);
        alert(`${res.data.user.nickname}(${res.data.user.company}) 계정으로 전환되었습니다.`);
        if (currentView === 'detail' && selectedPost) {
          loadPostDetail(selectedPost.id);
        }
      }
    } catch (err) {
      alert('빠른 로그인 실패: ' + (err.response?.data?.message || err.message));
    }
  };

  // 4. 게시글 상세 조회
  const loadPostDetail = async (id) => {
    try {
      const res = await api.get(`/posts/${id}`);
      if (res.data.success) {
        setSelectedPost(res.data.data);
        setCurrentView('detail');
      }
    } catch (err) {
      alert('게시글을 불러올 수 없습니다.');
    }
  };

  // 5. 게시글 저장 (작성 / 수정)
  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    try {
      if (currentView === 'write') {
        const res = await api.post('/posts', postForm);
        if (res.data.success) {
          alert('게시글이 등록되었습니다.');
          setCurrentView('list');
          setCurrentPage(1);
          loadPosts();
          loadCategoryStats();
        }
      } else if (currentView === 'edit') {
        const res = await api.put(`/posts/${selectedPost.id}`, postForm);
        if (res.data.success) {
          alert('게시글이 수정되었습니다.');
          loadPostDetail(selectedPost.id);
          loadPosts();
        }
      }
    } catch (err) {
      alert(err.response?.data?.message || '저장 중 오류가 발생했습니다.');
    }
  };

  // 6. 게시글 삭제
  const handleDeletePost = async (id) => {
    if (!window.confirm('정말 이 게시글을 삭제하시겠습니까?')) return;
    try {
      const res = await api.delete(`/posts/${id}`);
      if (res.data.success) {
        alert('삭제되었습니다.');
        setCurrentView('list');
        loadPosts();
        loadCategoryStats();
      }
    } catch (err) {
      alert(err.response?.data?.message || '삭제 실패');
    }
  };

  // 7. 댓글 등록
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!currentUser) {
      alert('댓글을 작성하려면 로그인이 필요합니다.');
      return;
    }
    if (!commentInput.trim()) return;

    try {
      const res = await api.post(`/posts/${selectedPost.id}/comments`, { content: commentInput });
      if (res.data.success) {
        setCommentInput('');
        loadPostDetail(selectedPost.id);
      }
    } catch (err) {
      alert(err.response?.data?.message || '댓글 등록 실패');
    }
  };

  // 8. 상태 변경 (관리자 전용)
  const handleChangeStatus = async (status) => {
    try {
      const res = await api.patch(`/posts/${selectedPost.id}/status`, { status });
      if (res.data.success) {
        setSelectedPost((prev) => ({ ...prev, status }));
        loadPosts();
      }
    } catch (err) {
      alert(err.response?.data?.message || '상태 변경 권한이 없습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      {/* 1. 상단 빠른 테스트 계정 전환 바 */}
      <div className="bg-slate-900 text-slate-300 text-xs px-4 py-2 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="bg-blue-600 text-white font-bold px-2 py-0.5 rounded text-[11px] flex items-center gap-1">
            <Sparkles size={12} /> 빠른 테스트 계정
          </span>
          <span className="text-slate-400">클릭 시 즉시 전환 (기본 비밀번호: 1234):</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => handleQuickLogin('admin@scm.com')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 font-medium"
          >
            🛡️ 운영자 (admin / 관제팀)
          </button>
          <button
            onClick={() => handleQuickLogin('logistics@partner.com')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-medium"
          >
            🚚 김코딩 (대한물류)
          </button>
          <button
            onClick={() => handleQuickLogin('supply@partner.com')}
            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-blue-300 border border-blue-500/30 font-medium"
          >
            📦 개발조아 (한성테크)
          </button>
        </div>
      </div>

      {/* 2. 메인 헤더 */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          {/* SCM 로고 및 타이틀 */}
          <div
            className="flex items-center gap-3 cursor-pointer select-none"
            onClick={() => {
              setCurrentView('list');
              setSelectedCategory('전체');
            }}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-sky-500 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="7" width="6" height="6" rx="1" />
                <rect x="16" y="7" width="6" height="6" rx="1" />
                <rect x="9" y="15" width="6" height="6" rx="1" />
                <path d="M5 13v3a1 1 0 0 0 1 1h3" />
                <path d="M19 13v3a1 1 0 0 1-1 1h-3" />
                <path d="M8 10h8" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900">SCM 문의 게시판</h1>
                <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-1.5 py-0.5 rounded border border-blue-200">
                  v2.0 DB 연동
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Supply Chain Operations & Partner Desk</p>
            </div>
          </div>

          {/* 유저 프로필 및 로그인 버튼 */}
          <div className="flex items-center gap-3">
            {currentUser ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-100 py-1.5 px-3 rounded-lg border border-slate-200 text-xs">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="font-bold text-slate-800">{currentUser.nickname}</span>
                  <span className="text-slate-500 text-[11px]">({currentUser.company || '협력사'})</span>
                  {currentUser.role === 'admin' && (
                    <span className="bg-amber-100 text-amber-800 font-bold px-1.5 py-0.5 rounded text-[10px]">운영자</span>
                  )}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1.5 text-xs text-slate-600 hover:text-red-600 font-semibold px-2.5 py-1.5 rounded-lg hover:bg-red-50 border border-transparent transition-all"
                >
                  <LogOut size={14} /> 로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode('login');
                  setShowAuthModal(true);
                }}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all"
              >
                <LogIn size={14} /> 로그인 / 회원가입
              </button>
            )}
          </div>
        </div>
      </header>

      {/* 3. 본문 레이아웃 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* 좌측 사이드바: 카테고리 필터 & 관제 연락처 */}
          <aside className="lg:col-span-3 space-y-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center justify-between">
                <span>문의 카테고리</span>
                <span className="text-blue-600 font-extrabold">{totalPosts}건</span>
              </h2>
              <nav className="space-y-1">
                {CATEGORIES.map((cat) => {
                  const count = cat === '전체' ? totalPosts : categoryCounts[cat] || 0;
                  const isSelected = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => {
                        setSelectedCategory(cat);
                        setCurrentPage(1);
                        if (currentView !== 'list') setCurrentView('list');
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm'
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="whitespace-nowrap">{cat}</span>
                      <span
                        className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                          isSelected ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* 긴급 배차/하역 관제 카드 */}
            <div className="bg-slate-900 rounded-xl p-4 text-white shadow-md border border-slate-800">
              <div className="flex items-center gap-2 text-sky-400 font-bold text-xs mb-2">
                <Truck size={16} /> 긴급 배차/하역 관제
              </div>
              <p className="text-slate-300 text-xs leading-relaxed mb-3">
                도크 정체나 30분 이상 상하차 지연 발생 시 SCM 운영실 직통 내선으로 우선 접수해 주세요.
              </p>
              <div className="pt-2 border-t border-slate-800 flex items-center gap-2 text-sky-300 font-mono text-sm font-bold">
                <PhoneCall size={15} /> 02-1588-1234
              </div>
            </div>
          </aside>

          {/* 우측 메인 컨텐츠 영역 */}
          <section className="lg:col-span-9">
            {/* [A] 게시글 목록 뷰 */}
            {currentView === 'list' && (
              <div className="space-y-4">
                {/* 상단 검색 및 글쓰기 바 */}
                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
                  <form onSubmit={handleSearch} className="flex-1 w-full relative">
                    <input
                      type="text"
                      placeholder="제목, 내용 또는 작성자 검색..."
                      value={searchKeyword}
                      onChange={(e) => setSearchKeyword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                    <Search size={15} className="absolute left-3 top-2.5 text-slate-400" />
                  </form>

                  <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    {/* 조회 개수 선택 옵션 */}
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        setPageSize(Number(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    >
                      <option value={5}>5개씩 보기</option>
                      <option value={10}>10개씩 보기</option>
                      <option value={15}>15개씩 보기</option>
                      <option value={20}>20개씩 보기</option>
                    </select>

                    <button
                      onClick={() => {
                        if (!currentUser) {
                          alert('로그인 후 문의글을 작성할 수 있습니다.');
                          setShowAuthModal(true);
                          return;
                        }
                        setPostForm({
                          title: '',
                          category: selectedCategory === '전체' ? '주문/발주' : selectedCategory,
                          content: '',
                          is_urgent: false,
                          is_secret: false
                        });
                        setCurrentView('write');
                      }}
                      className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm shadow-blue-500/20 transition-all whitespace-nowrap"
                    >
                      <PlusCircle size={15} /> 문의 등록
                    </button>
                  </div>
                </div>

                {/* 게시글 테이블 */}
                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold">
                        <tr>
                          <th className="py-3 px-4 w-16 text-center">번호</th>
                          <th className="py-3 px-4 w-28 whitespace-nowrap text-center">분류</th>
                          <th className="py-3 px-4">제목</th>
                          <th className="py-3 px-4 w-28 whitespace-nowrap">작성자</th>
                          <th className="py-3 px-4 w-24 text-center whitespace-nowrap">상태</th>
                          <th className="py-3 px-4 w-16 text-center">조회</th>
                          <th className="py-3 px-4 w-28 text-center whitespace-nowrap">등록일</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {loading ? (
                          <tr>
                            <td colSpan="7" className="text-center py-12 text-slate-400">
                              데이터를 불러오는 중입니다...
                            </td>
                          </tr>
                        ) : posts.length === 0 ? (
                          <tr>
                            <td colSpan="7" className="text-center py-12 text-slate-400">
                              등록된 문의 내역이 없습니다.
                            </td>
                          </tr>
                        ) : (
                          posts.map((post) => (
                            <tr
                              key={post.id}
                              onClick={() => loadPostDetail(post.id)}
                              className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                            >
                              <td className="py-3.5 px-4 text-center font-mono text-slate-400 font-medium">
                                {post.id}
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                                  {post.category}
                                </span>
                              </td>
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  {Boolean(post.is_urgent) && (
                                    <span className="bg-red-50 text-red-600 font-extrabold px-1.5 py-0.5 rounded text-[10px] border border-red-200 shrink-0">
                                      긴급
                                    </span>
                                  )}
                                  {Boolean(post.is_secret) && (
                                    <Lock size={12} className="text-slate-400 shrink-0" />
                                  )}
                                  <span className="font-semibold text-slate-800 hover:text-blue-600 line-clamp-1">
                                    {post.title}
                                  </span>
                                  {post.commentCount > 0 && (
                                    <span className="text-blue-600 font-bold text-[11px] shrink-0">
                                      [{post.commentCount}]
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="font-bold text-slate-700">{post.author}</div>
                                <div className="text-[10px] text-slate-400">{post.company || '협력사'}</div>
                              </td>
                              <td className="py-3.5 px-4 text-center whitespace-nowrap">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    post.status === '답변완료'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : post.status === '처리중'
                                      ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                      : 'bg-amber-50 text-amber-700 border border-amber-200'
                                  }`}
                                >
                                  {post.status}
                                </span>
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px]">
                                {post.views}
                              </td>
                              <td className="py-3.5 px-4 text-center font-mono text-slate-400 text-[11px] whitespace-nowrap">
                                {post.created_at?.slice(0, 10)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>

                  {/* 하단 페이지네이션 */}
                  <div className="p-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-500 font-medium">
                      총 <strong className="text-slate-800">{totalPosts}</strong>건 (페이지 {currentPage} / {totalPages})
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        disabled={currentPage <= 1}
                        onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                        className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronLeft size={16} />
                      </button>
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 text-xs font-bold rounded ${
                            currentPage === pageNum
                              ? 'bg-blue-600 text-white'
                              : 'text-slate-600 hover:bg-slate-100'
                          }`}
                        >
                          {pageNum}
                        </button>
                      ))}
                      <button
                        disabled={currentPage >= totalPages}
                        onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                        className="p-1.5 rounded border border-slate-200 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* [B] 게시글 상세 뷰 */}
            {currentView === 'detail' && selectedPost && (
              <div className="space-y-4">
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                  {/* 상단 메타 바 */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-xs">
                        {selectedPost.category}
                      </span>
                      {Boolean(selectedPost.is_urgent) && (
                        <span className="bg-red-50 text-red-600 font-bold px-2 py-0.5 rounded text-xs border border-red-200">
                          긴급 요청
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          selectedPost.status === '답변완료'
                            ? 'bg-emerald-50 text-emerald-700'
                            : selectedPost.status === '처리중'
                            ? 'bg-blue-50 text-blue-700'
                            : 'bg-amber-50 text-amber-700'
                        }`}
                      >
                        {selectedPost.status}
                      </span>
                    </div>

                    {/* 운영자 전용 상태 변경 드롭다운 */}
                    {currentUser?.role === 'admin' && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg">
                        <span className="text-xs font-bold text-amber-800">관제 처리상태:</span>
                        <select
                          value={selectedPost.status}
                          onChange={(e) => handleChangeStatus(e.target.value)}
                          className="text-xs font-bold bg-white border border-amber-300 rounded px-2 py-1"
                        >
                          <option value="접수완료">접수완료</option>
                          <option value="처리중">처리중</option>
                          <option value="답변완료">답변완료</option>
                        </select>
                      </div>
                    )}
                  </div>

                  {/* 제목 & 작성자 정보 */}
                  <div className="py-4 border-b border-slate-100">
                    <h2 className="text-xl font-black text-slate-900 mb-3">{selectedPost.title}</h2>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-slate-800">{selectedPost.author}</span>
                        <span>{selectedPost.company || '협력사'}</span>
                        <span>|</span>
                        <span>{selectedPost.created_at}</span>
                      </div>
                      <div className="flex items-center gap-1 font-mono">
                        <Eye size={14} /> {selectedPost.views}회 조회
                      </div>
                    </div>
                  </div>

                  {/* 본문 */}
                  <div className="py-6 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed min-h-[140px]">
                    {selectedPost.content}
                  </div>

                  {/* 하단 조작 버튼 (수정, 삭제, 목록) */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    <button
                      onClick={() => setCurrentView('list')}
                      className="text-xs font-bold text-slate-600 hover:text-slate-900 px-3 py-2 rounded-lg border border-slate-200 hover:bg-slate-50"
                    >
                      목록으로 돌아가기
                    </button>

                    {(currentUser?.id === selectedPost.user_id || currentUser?.role === 'admin') && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setPostForm({
                              title: selectedPost.title,
                              category: selectedPost.category,
                              content: selectedPost.content,
                              is_urgent: Boolean(selectedPost.is_urgent),
                              is_secret: Boolean(selectedPost.is_secret)
                            });
                            setCurrentView('edit');
                          }}
                          className="flex items-center gap-1 text-xs font-bold text-blue-600 hover:text-blue-700 px-3 py-2 rounded-lg border border-blue-200 hover:bg-blue-50"
                        >
                          <Edit2 size={13} /> 수정
                        </button>
                        <button
                          onClick={() => handleDeletePost(selectedPost.id)}
                          className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-700 px-3 py-2 rounded-lg border border-red-200 hover:bg-red-50"
                        >
                          <Trash2 size={13} /> 삭제
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* 댓글 및 운영팀 공식 답변 목록 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm space-y-4">
                  <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                    <MessageSquare size={16} className="text-blue-600" />
                    답변 및 처리내역 ({selectedPost.comments?.length || 0})
                  </h3>

                  <div className="space-y-3">
                    {selectedPost.comments?.length === 0 ? (
                      <p className="text-xs text-slate-400 py-3">등록된 답변이 없습니다.</p>
                    ) : (
                      selectedPost.comments?.map((comment) => (
                        <div
                          key={comment.id}
                          className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                            comment.is_official
                              ? 'bg-blue-50/70 border-blue-200 text-slate-800'
                              : 'bg-slate-50 border-slate-200 text-slate-700'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-1.5 font-bold">
                            <div className="flex items-center gap-2">
                              <span>{comment.author}</span>
                              <span className="text-slate-400 text-[10px]">({comment.company || '협력사'})</span>
                              {Boolean(comment.is_official) && (
                                <span className="bg-blue-600 text-white font-extrabold px-1.5 py-0.2 rounded text-[10px] flex items-center gap-0.5">
                                  <ShieldCheck size={11} /> SCM 운영팀 공식답변
                                </span>
                              )}
                            </div>
                            <span className="text-slate-400 text-[10px] font-mono">{comment.created_at}</span>
                          </div>
                          <p className="whitespace-pre-wrap">{comment.content}</p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* 댓글 작성 입력 폼 */}
                  <form onSubmit={handleAddComment} className="pt-2">
                    <textarea
                      rows="3"
                      placeholder={
                        currentUser
                          ? '답변 또는 추가 문의사항을 작성하세요...'
                          : '로그인 후 답변을 등록할 수 있습니다.'
                      }
                      disabled={!currentUser}
                      value={commentInput}
                      onChange={(e) => setCommentInput(e.target.value)}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 disabled:bg-slate-100"
                    />
                    <div className="flex justify-end mt-2">
                      <button
                        type="submit"
                        disabled={!currentUser || !commentInput.trim()}
                        className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-bold px-4 py-2 rounded-lg transition-all"
                      >
                        답변 등록
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}

            {/* [C] 게시글 작성 / 수정 뷰 */}
            {(currentView === 'write' || currentView === 'edit') && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                <h2 className="text-base font-black text-slate-900 mb-4 pb-3 border-b border-slate-100">
                  {currentView === 'write' ? '신규 SCM 문의 등록' : '문의글 수정'}
                </h2>

                <form onSubmit={handleSavePost} className="space-y-4 text-xs">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">문의 분류</label>
                      <select
                        value={postForm.category}
                        onChange={(e) => setPostForm({ ...postForm, category: e.target.value })}
                        className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold focus:outline-none focus:border-blue-500"
                      >
                        {CATEGORIES.filter((c) => c !== '전체').map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex items-center gap-4 pt-5">
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-red-600">
                        <input
                          type="checkbox"
                          checked={postForm.is_urgent}
                          onChange={(e) => setPostForm({ ...postForm, is_urgent: e.target.checked })}
                          className="rounded text-red-600 focus:ring-red-500"
                        />
                        긴급 처리 요청
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-600">
                        <input
                          type="checkbox"
                          checked={postForm.is_secret}
                          onChange={(e) => setPostForm({ ...postForm, is_secret: e.target.checked })}
                          className="rounded text-blue-600 focus:ring-blue-500"
                        />
                        비밀글 (협력사 비공개)
                      </label>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">제목</label>
                    <input
                      type="text"
                      required
                      placeholder="예: [출고 지연] 10월 29일 인천 허브 긴급 출고 지연 확인 건"
                      value={postForm.title}
                      onChange={(e) => setPostForm({ ...postForm, title: e.target.value })}
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">문의 및 요청 내용</label>
                    <textarea
                      rows="8"
                      required
                      placeholder="PO 번호, 차량 번호, 인보이스 번호 등 상세 정보를 함께 기재해 주시면 신속한 처리가 가능합니다."
                      value={postForm.content}
                      onChange={(e) => setPostForm({ ...postForm, content: e.target.value })}
                      className="w-full p-3 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 leading-relaxed font-sans"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setCurrentView(currentView === 'edit' ? 'detail' : 'list')}
                      className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-bold hover:bg-slate-50"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm shadow-blue-500/20"
                    >
                      {currentView === 'write' ? '등록 완료' : '수정 완료'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* 4. 로그인 / 회원가입 모달 창 */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900 mb-1">
              {authMode === 'login' ? 'SCM 포털 로그인' : '협력사 신규 등록'}
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              {authMode === 'login' ? '등록된 계정으로 로그인하세요.' : '새로운 사용자 정보를 입력하세요.'}
            </p>

            <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">이메일</label>
                <input
                  type="email"
                  required
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  placeholder="user@partner.com"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">비밀번호</label>
                <input
                  type="password"
                  required
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  placeholder="비밀번호 입력"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                />
              </div>

              {authMode === 'signup' && (
                <>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">담당자명(닉네임)</label>
                    <input
                      type="text"
                      required
                      value={authForm.nickname}
                      onChange={(e) => setAuthForm({ ...authForm, nickname: e.target.value })}
                      placeholder="홍길동"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">소속 협력사/회사명</label>
                    <input
                      type="text"
                      value={authForm.company}
                      onChange={(e) => setAuthForm({ ...authForm, company: e.target.value })}
                      placeholder="예: 대한물류"
                      className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                className="w-full py-2.5 mt-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-sm shadow-blue-500/20"
              >
                {authMode === 'login' ? '로그인' : '회원가입 완료'}
              </button>
            </form>

            <div className="mt-4 pt-3 border-t border-slate-100 text-center text-xs">
              {authMode === 'login' ? (
                <button
                  onClick={() => setAuthMode('signup')}
                  className="text-blue-600 font-bold hover:underline"
                >
                  계정이 없으신가요? 회원가입
                </button>
              ) : (
                <button
                  onClick={() => setAuthMode('login')}
                  className="text-slate-600 font-bold hover:underline"
                >
                  이미 계정이 있으신가요? 로그인
                </button>
              )}
            </div>

            <button
              onClick={() => setShowAuthModal(false)}
              className="mt-2 w-full py-2 text-slate-400 hover:text-slate-600 text-xs font-semibold"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}