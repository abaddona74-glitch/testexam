'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const ADMIN_SECRET_KEY = 'admin_secret_cached';
const TABS = [
  { id: 'overview', label: '📊 Overview', icon: '📊' },
  { id: 'live', label: '👥 Live Monitor', icon: '👥' },
  { id: 'logs', label: '📋 Logs', icon: '📋' },
  { id: 'security', label: '🛡️ Security', icon: '🛡️' },
  { id: 'ai', label: '🤖 AI Requests', icon: '🤖' },
  { id: 'content', label: '📝 Content', icon: '📝' },
  { id: 'blocklist', label: '🚫 Block List', icon: '🚫' },
  { id: 'profanity', label: '🤬 So\'z filtr', icon: '🤬' },
];

// ─── Utility Components ────────────────────────────────────────

function StatCard({ label, value, icon, color = 'blue', sub }) {
  const colors = {
    blue: 'from-blue-500 to-blue-600',
    green: 'from-green-500 to-green-600',
    red: 'from-red-500 to-red-600',
    orange: 'from-orange-500 to-orange-600',
    purple: 'from-purple-500 to-purple-600',
    pink: 'from-pink-500 to-pink-600',
    cyan: 'from-cyan-500 to-cyan-600',
    yellow: 'from-yellow-500 to-yellow-600',
  };
  return (
    <div className={`bg-gradient-to-br ${colors[color]} rounded-xl p-4 text-white shadow-lg`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-80">{label}</p>
          <p className="text-2xl font-bold mt-1">{typeof value === 'number' ? value.toLocaleString() : value}</p>
          {sub && <p className="text-xs opacity-70 mt-1">{sub}</p>}
        </div>
        <span className="text-3xl opacity-70">{icon}</span>
      </div>
    </div>
  );
}

function BarChart({ data, labelKey = '_id', valueKey = 'count', title, maxItems = 10 }) {
  if (!data || data.length === 0) return <p className="text-gray-500 text-sm p-4">No data</p>;
  const sorted = [...data].sort((a, b) => b[valueKey] - a[valueKey]).slice(0, maxItems);
  const max = Math.max(...sorted.map(d => d[valueKey]), 1);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      {title && <h3 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">{title}</h3>}
      <div className="space-y-2">
        {sorted.map((item, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-28 truncate text-gray-600 dark:text-gray-400" title={item[labelKey] || 'N/A'}>
              {item[labelKey] || 'N/A'}
            </span>
            <div className="flex-1 h-5 bg-gray-100 dark:bg-gray-700 rounded overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded transition-all duration-500"
                style={{ width: `${(item[valueKey] / max) * 100}%` }}
              />
            </div>
            <span className="w-10 text-right font-mono text-gray-700 dark:text-gray-300">{item[valueKey]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TimeChart({ data, title }) {
  if (!data || data.length === 0) return <p className="text-gray-500 text-sm p-4">No data</p>;
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
      {title && <h3 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">{title}</h3>}
      <div className="flex items-end gap-1 h-32 overflow-x-auto">
        {data.map((item, i) => (
          <div key={i} className="flex flex-col items-center min-w-[18px] group relative">
            <div className="absolute -top-8 bg-gray-900 text-white text-[10px] px-1 py-0.5 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
              {item._id}: {item.count} ({item.uniqueVisitors || 0} unique)
            </div>
            <div
              className="w-3 bg-gradient-to-t from-blue-500 to-cyan-400 rounded-t transition-all hover:from-blue-600 hover:to-cyan-500"
              style={{ height: `${Math.max((item.count / max) * 100, 4)}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between text-[9px] text-gray-400 mt-1 overflow-hidden">
        <span>{data[0]?._id?.split(' ')[1] || data[0]?._id}</span>
        <span>{data[data.length - 1]?._id?.split(' ')[1] || data[data.length - 1]?._id}</span>
      </div>
    </div>
  );
}

function ConfirmModal({ open, onClose, onConfirm, title, message }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-lg text-gray-800 dark:text-white">{title}</h3>
        <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm">{message}</p>
        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg text-sm">Bekor qilish</button>
          <button onClick={onConfirm} className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600">Tasdiqlash</button>
        </div>
      </div>
    </div>
  );
}

function Pagination({ pagination, onPageChange }) {
  if (!pagination || pagination.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-gray-500">
        {pagination.total} ta natija, {pagination.page}/{pagination.totalPages} sahifa
      </span>
      <div className="flex gap-2">
        <button
          onClick={() => onPageChange(pagination.page - 1)}
          disabled={pagination.page <= 1}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
        >
          ←
        </button>
        <button
          onClick={() => onPageChange(pagination.page + 1)}
          disabled={pagination.page >= pagination.totalPages}
          className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
        >
          →
        </button>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────

export default function AdminPage() {
  const [secret, setSecret] = useState('');
  const [isAuthed, setIsAuthed] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [period, setPeriod] = useState('24h');

  // Dashboard data
  const [dashboard, setDashboard] = useState(null);

  // Logs state
  const [logs, setLogs] = useState([]);
  const [logsPagination, setLogsPagination] = useState(null);
  const [logsFilter, setLogsFilter] = useState({ type: '', ip: '', suspicious: '', search: '', page: 1 });

  // Messages state
  const [messages, setMessages] = useState([]);
  const [msgPagination, setMsgPagination] = useState(null);
  const [msgSource, setMsgSource] = useState('chat');
  const [msgSearch, setMsgSearch] = useState('');
  const [msgPage, setMsgPage] = useState(1);

  // Block state
  const [blocklist, setBlocklist] = useState([]);
  const [blockForm, setBlockForm] = useState({ ip: '', deviceId: '', reason: '', duration: 'permanent' });

  // Tests state
  const [tests, setTests] = useState([]);

  // Profanity state
  const [profanityData, setProfanityData] = useState({ defaults: [], custom: [], total: 0 });
  const [newBadWord, setNewBadWord] = useState('');
  const [bulkBadWords, setBulkBadWords] = useState('');

  // Real-time event feed
  const [realtimeEvents, setRealtimeEvents] = useState([]);
  const [lastEventId, setLastEventId] = useState(0);
  const [realtimeActive, setRealtimeActive] = useState(0);
  const [realtimeSessions, setRealtimeSessions] = useState([]);

  // Confirm modal
  const [confirmModal, setConfirmModal] = useState({ open: false, title: '', message: '', onConfirm: null });

  const autoRefreshRef = useRef(null);
  const realtimeRef = useRef(null);

  // Check cached secret on mount
  useEffect(() => {
    const cached = localStorage.getItem(ADMIN_SECRET_KEY);
    if (cached) {
      setSecret(cached);
      setIsAuthed(true);
    }
  }, []);

  // ─── API Helpers ──────────────────────────────────────────

  const api = useCallback(async (url, opts = {}) => {
    const sep = url.includes('?') ? '&' : '?';
    const res = await fetch(`${url}${sep}secret=${encodeURIComponent(secret)}`, opts);
    if (res.status === 401) {
      setIsAuthed(false);
      localStorage.removeItem(ADMIN_SECRET_KEY);
      throw new Error('Unauthorized');
    }
    return res.json();
  }, [secret]);

  // ─── Data Fetchers ────────────────────────────────────────

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api(`/api/admin/dashboard?period=${period}`);
      setDashboard(data);
      setError('');
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  }, [api, period]);

  const fetchLogs = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      params.set('page', logsFilter.page);
      if (logsFilter.type) params.set('type', logsFilter.type);
      if (logsFilter.ip) params.set('ip', logsFilter.ip);
      if (logsFilter.suspicious) params.set('suspicious', logsFilter.suspicious);
      if (logsFilter.search) params.set('search', logsFilter.search);
      const data = await api(`/api/admin/logs?${params}`);
      setLogs(data.logs);
      setLogsPagination(data.pagination);
    } catch (err) {
      console.error(err);
    }
  }, [api, logsFilter]);

  const fetchMessages = useCallback(async () => {
    try {
      const params = new URLSearchParams({ source: msgSource, page: msgPage });
      if (msgSearch) params.set('search', msgSearch);
      const data = await api(`/api/admin/messages?${params}`);
      setMessages(data.items);
      setMsgPagination(data.pagination);
    } catch (err) {
      console.error(err);
    }
  }, [api, msgSource, msgPage, msgSearch]);

  const fetchBlocklist = useCallback(async () => {
    try {
      const data = await api('/api/admin/block');
      setBlocklist(data.blocked || []);
    } catch (err) {
      console.error(err);
    }
  }, [api]);

  const fetchTests = useCallback(async () => {
    try {
      const data = await api('/api/admin/tests');
      setTests(data.tests || []);
    } catch (err) {
      console.error(err);
    }
  }, [api]);

  const fetchProfanity = useCallback(async () => {
    try {
      const data = await api('/api/admin/profanity');
      setProfanityData(data);
    } catch (err) {
      console.error(err);
    }
  }, [api]);

  // ─── Real-Time Event Polling (every 3 seconds, from memory — instant) ─
  const pollRealtime = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/realtime?secret=${encodeURIComponent(secret)}&since=${lastEventId}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.events && data.events.length > 0) {
        setRealtimeEvents(prev => [...data.events, ...prev].slice(0, 200));
      }
      if (data.lastEventId) setLastEventId(data.lastEventId);
      setRealtimeActive(data.activeUsers || 0);
      setRealtimeSessions(data.activeSessions || []);
    } catch (err) {
      // Silent fail for polling
    }
  }, [secret, lastEventId]);

  // ─── Load Data on Tab Change ──────────────────────────────

  useEffect(() => {
    if (!isAuthed) return;
    if (activeTab === 'overview' || activeTab === 'ai' || activeTab === 'security') fetchDashboard();
    if (activeTab === 'logs') fetchLogs();
    if (activeTab === 'content') { fetchMessages(); fetchTests(); }
    if (activeTab === 'blocklist') fetchBlocklist();
    if (activeTab === 'profanity') fetchProfanity();
  }, [isAuthed, activeTab, period]);

  // Real-time polling — runs on ALL tabs, every 3 seconds (reads from memory, not DB)
  useEffect(() => {
    if (!isAuthed) return;
    // Initial poll
    pollRealtime();
    realtimeRef.current = setInterval(pollRealtime, 3000);
    return () => clearInterval(realtimeRef.current);
  }, [isAuthed, secret]);

  // Auto-refresh full dashboard data every 30s (for charts/aggregated stats)
  useEffect(() => {
    if (isAuthed && (activeTab === 'live' || activeTab === 'overview')) {
      autoRefreshRef.current = setInterval(fetchDashboard, 30000);
      return () => clearInterval(autoRefreshRef.current);
    }
  }, [isAuthed, activeTab, fetchDashboard]);

  // ─── Actions ──────────────────────────────────────────────

  const handleLogin = async () => {
    try {
      const res = await fetch(`/api/admin/dashboard?period=24h&secret=${encodeURIComponent(secret)}`);
      if (res.status === 401) {
        setError("Noto'g'ri parol!");
        return;
      }
      const data = await res.json();
      setDashboard(data);
      setIsAuthed(true);
      localStorage.setItem(ADMIN_SECRET_KEY, secret);
      setError('');
    } catch (err) {
      setError('Server xatoligi');
    }
  };

  const handleDeleteMessage = async (id) => {
    await api(`/api/admin/messages?source=${msgSource}&id=${id}`, { method: 'DELETE' });
    fetchMessages();
  };

  const handleClearAllMessages = async () => {
    setConfirmModal({
      open: true,
      title: `Barcha ${msgSource === 'chat' ? 'xabarlar' : 'izohlar'}ni o'chirish`,
      message: "Bu amalni qaytarib bo'lmaydi. Davom etasizmi?",
      onConfirm: async () => {
        await api(`/api/admin/messages?source=${msgSource}&clearAll=true`, { method: 'DELETE' });
        fetchMessages();
        setConfirmModal({ open: false });
      },
    });
  };

  const handleDeleteTest = async (id, name) => {
    setConfirmModal({
      open: true,
      title: `"${name}" testini o'chirish`,
      message: "Bu testni o'chirmoqchimisiz? Bu amalni qaytarib bo'lmaydi.",
      onConfirm: async () => {
        await api(`/api/admin/tests?id=${id}`, { method: 'DELETE' });
        fetchTests();
        setConfirmModal({ open: false });
      },
    });
  };

  const handleBlock = async () => {
    if (!blockForm.ip && !blockForm.deviceId) return;
    await api('/api/admin/block', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(blockForm),
    });
    setBlockForm({ ip: '', deviceId: '', reason: '', duration: 'permanent' });
    fetchBlocklist();
  };

  const handleUnblock = async (id) => {
    await api(`/api/admin/block?id=${id}`, { method: 'DELETE' });
    fetchBlocklist();
  };

  const handleClearLogs = async () => {
    setConfirmModal({
      open: true,
      title: "Barcha loglarni tozalash",
      message: "Barcha loglar o'chiriladi. Davom etasizmi?",
      onConfirm: async () => {
        await api('/api/admin/logs?clearAll=true', { method: 'DELETE' });
        fetchLogs();
        setConfirmModal({ open: false });
      },
    });
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_SECRET_KEY);
    setIsAuthed(false);
    setSecret('');
    setDashboard(null);
    clearInterval(realtimeRef.current);
  };

  // ─── Profanity Actions ────────────────────────────────────

  const handleAddBadWord = async () => {
    if (!newBadWord.trim()) return;
    await api('/api/admin/profanity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ word: newBadWord.trim() }),
    });
    setNewBadWord('');
    fetchProfanity();
  };

  const handleBulkAddWords = async () => {
    if (!bulkBadWords.trim()) return;
    const words = bulkBadWords.split(/[\n,;]+/).map(w => w.trim()).filter(Boolean);
    if (words.length === 0) return;
    await api('/api/admin/profanity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ words }),
    });
    setBulkBadWords('');
    fetchProfanity();
  };

  const handleRemoveBadWord = async (word) => {
    await api(`/api/admin/profanity?word=${encodeURIComponent(word)}`, { method: 'DELETE' });
    fetchProfanity();
  };

  // ─── Login Screen ────────────────────────────────────────

  if (!isAuthed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
          <div className="text-center mb-8">
            <div className="text-5xl mb-4">🔐</div>
            <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
            <p className="text-gray-400 mt-2 text-sm">test-exam.uz boshqaruv paneli</p>
          </div>
          {error && <div className="bg-red-500/20 text-red-300 p-3 rounded-lg text-sm mb-4">{error}</div>}
          <input
            type="password"
            placeholder="Admin parol..."
            value={secret}
            onChange={e => setSecret(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleLogin()}
            className="w-full p-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleLogin}
            className="w-full mt-4 p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition"
          >
            Kirish
          </button>
        </div>
      </div>
    );
  }

  // ─── Dashboard Layout ─────────────────────────────────────

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🛡️</span>
            <div>
              <h1 className="font-bold text-gray-800 dark:text-white text-lg">Admin Dashboard</h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">test-exam.uz</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Period selector */}
            <select
              value={period}
              onChange={e => setPeriod(e.target.value)}
              className="text-sm px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg border-0 text-gray-700 dark:text-gray-300"
            >
              <option value="24h">24 soat</option>
              <option value="7d">7 kun</option>
              <option value="30d">30 kun</option>
            </select>
            <button onClick={fetchDashboard} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-500" title="Yangilash">
              🔄
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500" title="Chiqish">
              🚪
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 overflow-x-auto pb-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-sm rounded-t-lg whitespace-nowrap transition font-medium ${
                activeTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-b-2 border-blue-500'
                  : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && !dashboard && (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
          </div>
        )}

        {/* ─── OVERVIEW TAB ─── */}
        {activeTab === 'overview' && dashboard && (
          <div className="space-y-6">
            {/* Real-time indicator */}
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Real-time (har 3 sekundda yangilanadi) | Son'gi event ID: {lastEventId}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
              <StatCard label="Active Users" value={realtimeActive} icon="👥" color="green" sub="real-time" />
              <StatCard label="Unique Visitors" value={dashboard.stats.uniqueVisitors} icon="👁️" color="blue" />
              <StatCard label="Total Logs" value={dashboard.stats.totalLogs} icon="📋" color="cyan" />
              <StatCard label="AI Requests" value={dashboard.stats.aiRequests} icon="🤖" color="purple" />
              <StatCard label="Suspicious" value={dashboard.stats.suspiciousLogs} icon="⚠️" color="red" />
              <StatCard label="Chat Messages" value={dashboard.stats.chatMessages} icon="💬" color="pink" />
              <StatCard label="Comments" value={dashboard.stats.comments} icon="📝" color="orange" />
              <StatCard label="Tests (DB)" value={dashboard.stats.testsCount} icon="📚" color="blue" />
              <StatCard label="Leaderboard" value={dashboard.stats.leaderboardCount} icon="🏆" color="yellow" />
              <StatCard label="Blocked IPs" value={dashboard.stats.blockedIPs} icon="🚫" color="red" />
            </div>

            {/* Charts Row */}
            <div className="grid md:grid-cols-2 gap-4">
              <TimeChart data={dashboard.charts.visitsOverTime} title="📈 Tashriflar (vaqt bo'yicha)" />
              <BarChart data={dashboard.charts.activityByType} title="📊 Faoliyat turlari" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              <BarChart data={dashboard.charts.topTests} title="🔥 Eng ko'p ochilgan testlar" maxItems={10} />
              <BarChart data={dashboard.charts.difficultyDist} title="⚡ Qiyinlik darajasi" />
            </div>

            {/* Real-time Event Feed */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <h3 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">⚡ Jonli hodisalar (real-time)</h3>
              <div className="space-y-1 max-h-[300px] overflow-y-auto">
                {realtimeEvents.slice(0, 30).map((e, i) => {
                  const eventKey = `${e._eventId ?? 'noid'}-${e._ts ?? e.createdAt ?? 'notime'}-${e.type ?? 'notype'}-${e.userId ?? e.ip ?? i}-${i}`;
                  return (
                  <div key={eventKey} className={`flex items-center gap-2 text-xs p-1.5 rounded ${e.isSuspicious ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/30'}`}>
                    <span className="text-gray-400 w-16">{new Date(e._ts || e.createdAt).toLocaleTimeString('uz')}</span>
                    <span className={`px-1.5 py-0.5 rounded font-medium ${
                      e.type === 'ai_request' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      : e.type === 'test_complete' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : e.type === 'chat_message' ? 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400'
                      : e.isSuspicious ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                      : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                    }`}>{e.type}</span>
                    <span className="text-gray-600 dark:text-gray-400">{e.userName || e.ip || '-'}</span>
                    {e.details?.testName && <span className="text-blue-500 truncate max-w-[200px]">{e.details.testName}</span>}
                    {e.suspiciousReason && <span className="text-red-500 truncate max-w-[200px]">⚠️ {e.suspiciousReason}</span>}
                  </div>
                )})}
                {realtimeEvents.length === 0 && <p className="text-gray-500 text-center py-4 text-xs">Hodisalar kutilmoqda...</p>}
              </div>
            </div>
          </div>
        )}

        {/* ─── LIVE MONITOR TAB ─── */}
        {activeTab === 'live' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-800 dark:text-white">
                🟢 Hozirgi foydalanuvchilar ({realtimeActive})
              </h2>
              <span className="text-xs text-green-500 flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                Har 3 sekundda yangilanadi (real-time)
              </span>
            </div>

            {realtimeSessions.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <div className="text-4xl mb-2">😴</div>
                <p>Hozir hech kim aktiv emas</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {realtimeSessions.map((session, i) => (
                  <div key={`${session.sessionId || session.userId || 'anon'}-${i}`} className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-3 h-3 rounded-full ${
                        session.status === 'in-test' ? 'bg-green-500 animate-pulse'
                        : session.status === 'browsing' ? 'bg-blue-400'
                        : 'bg-gray-400'
                      }`} />
                      <div className="min-w-0">
                        <p className="font-medium text-gray-800 dark:text-white">{session.name || session.userId || 'Anonymous'}</p>
                        <p className="text-xs text-gray-500">
                          {session.status === 'in-test'
                            ? `📝 Test yechmoqda: ${session.testId || 'N/A'} (${session.progress}/${session.total})`
                            : session.status === 'browsing' ? '🔍 Saytda ko\'rmoqda' : '💤 AFK'
                          }
                        </p>
                        {session.status === 'in-test' && (
                          <p className="text-xs text-gray-500 mt-1">
                            Difficulty: {session.difficulty || 'unknown'}
                          </p>
                        )}
                        {(session.difficulty === 'insane' || session.difficulty === 'impossible') && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                            🎥 {session.difficulty.toUpperCase()} | Camera: {session.cameraStatus || 'unknown'}
                          </p>
                        )}
                        {(session.difficulty === 'insane' || session.difficulty === 'impossible') && !session.cameraSnapshot && (
                          <p className="text-xs text-orange-500 mt-1">
                            Snapshot hali kelmadi (camera ishga tushishi yoki guard active bo'lishi kutilmoqda)
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-gray-500 flex-shrink-0">
                      <span>{session.device === 'mobile' ? '📱' : '🖥️'} {session.device || 'desktop'}</span>
                      <span>🌍 {session.country || '?'}</span>
                      <span>⭐ {session.stars || 0}</span>
                      <span>{session.theme === 'dark' ? '🌙' : '☀️'}</span>
                    </div>
                    {(session.difficulty === 'insane' || session.difficulty === 'impossible') && session.cameraSnapshot && (
                      <div className="w-36 h-24 rounded-lg overflow-hidden border border-amber-200 flex-shrink-0 bg-black">
                        <img
                          src={session.cameraSnapshot}
                          alt="Live camera snapshot"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── LOGS TAB ─── */}
        {activeTab === 'logs' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow flex flex-wrap gap-3 items-center">
              <select
                value={logsFilter.type}
                onChange={e => { setLogsFilter(f => ({ ...f, type: e.target.value, page: 1 })); }}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
              >
                <option value="">Barcha turlar</option>
                <option value="page_visit">Page Visit</option>
                <option value="test_start">Test Start</option>
                <option value="test_complete">Test Complete</option>
                <option value="ai_request">AI Request</option>
                <option value="chat_message">Chat Message</option>
                <option value="comment_post">Comment</option>
                <option value="cheat_violation">Cheat Violation</option>
                <option value="injection_attempt">Injection</option>
                <option value="dos_attempt">DoS</option>
                <option value="suspicious">Suspicious</option>
                <option value="block_action">Block Action</option>
                <option value="admin_action">Admin Action</option>
              </select>
              <input
                placeholder="IP bo'yicha filter..."
                value={logsFilter.ip}
                onChange={e => setLogsFilter(f => ({ ...f, ip: e.target.value, page: 1 }))}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm w-40"
              />
              <input
                placeholder="Qidirish..."
                value={logsFilter.search}
                onChange={e => setLogsFilter(f => ({ ...f, search: e.target.value, page: 1 }))}
                className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm w-40"
              />
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={logsFilter.suspicious === 'true'}
                  onChange={e => setLogsFilter(f => ({ ...f, suspicious: e.target.checked ? 'true' : '', page: 1 }))}
                />
                ⚠️ Suspicious only
              </label>
              <button onClick={fetchLogs} className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600">
                🔍 Qidirish
              </button>
              <button onClick={handleClearLogs} className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 ml-auto">
                🗑️ Barchasini tozalash
              </button>
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-400">
                    <th className="px-3 py-2 text-left">Vaqt</th>
                    <th className="px-3 py-2 text-left">Tur</th>
                    <th className="px-3 py-2 text-left">IP</th>
                    <th className="px-3 py-2 text-left">User</th>
                    <th className="px-3 py-2 text-left">Path</th>
                    <th className="px-3 py-2 text-left">Tafsilotlar</th>
                    <th className="px-3 py-2 text-left">🌍</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                  {logs.map(log => (
                    <tr key={log._id} className={`hover:bg-gray-50 dark:hover:bg-gray-700/30 ${log.isSuspicious ? 'bg-red-50 dark:bg-red-900/10' : ''}`}>
                      <td className="px-3 py-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('uz')}</td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
                          log.isSuspicious ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                          : log.type === 'ai_request' ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                          : log.type === 'test_start' ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                          : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="px-3 py-2 font-mono">{log.ip}</td>
                      <td className="px-3 py-2">{log.userName || '-'}</td>
                      <td className="px-3 py-2 max-w-[200px] truncate" title={log.path}>{log.path || '-'}</td>
                      <td className="px-3 py-2 max-w-[300px] truncate" title={JSON.stringify(log.details)}>
                        {log.suspiciousReason || (log.details ? JSON.stringify(log.details).substring(0, 80) : '-')}
                      </td>
                      <td className="px-3 py-2">{log.country || '-'}</td>
                      <td className="px-3 py-2">
                        {log.ip && (
                          <button
                            onClick={() => setBlockForm(f => ({ ...f, ip: log.ip, reason: `Blocked from logs: ${log.type}` }))}
                            className="text-red-500 hover:text-red-700"
                            title="Bu IP ni bloklash"
                          >
                            🚫
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {logs.length === 0 && (
                <div className="text-center py-8 text-gray-500 text-sm">Loglar topilmadi</div>
              )}
            </div>
            <Pagination pagination={logsPagination} onPageChange={p => { setLogsFilter(f => ({ ...f, page: p })); setTimeout(fetchLogs, 100); }} />
          </div>
        )}

        {/* ─── SECURITY TAB ─── */}
        {activeTab === 'security' && dashboard && (
          <div className="space-y-6">
            {/* DDoS Status */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <h3 className="font-bold text-gray-800 dark:text-white mb-3">🛡️ DDoS / DoS Monitor</h3>
              {dashboard.security.ddosStatus?.length === 0 ? (
                <div className="text-center py-6 text-green-500">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm">Hozircha DDoS xavfi yo'q</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {dashboard.security.ddosStatus?.map((item, i) => (
                    <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${
                      item.requestCount > 100 ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
                      : item.requestCount > 50 ? 'bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800'
                      : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
                    }`}>
                      <div>
                        <span className="font-mono text-sm">{item.ip}</span>
                        <span className="ml-2 text-xs text-gray-500">({item.totalRequests} total)</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-bold">
                          {item.requestCount} req/min
                        </span>
                        <button
                          onClick={() => setBlockForm(f => ({ ...f, ip: item.ip, reason: `DDoS suspect: ${item.requestCount} req/min` }))}
                          className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600"
                        >
                          🚫 Block
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Injection Attempts */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <h3 className="font-bold text-gray-800 dark:text-white mb-3">💉 Injection & Suspicious Activity</h3>
              {dashboard.security.recentSuspicious?.length === 0 ? (
                <div className="text-center py-6 text-green-500">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm">Hech qanday injection urinishi yo'q</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                  {dashboard.security.recentSuspicious?.map((log, i) => (
                    <div key={i} className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 bg-red-500 text-white text-[10px] rounded font-medium">
                            {log.type}
                          </span>
                          <span className="font-mono text-sm">{log.ip}</span>
                        </div>
                        <span className="text-xs text-gray-500">{new Date(log.createdAt).toLocaleString('uz')}</span>
                      </div>
                      <p className="text-xs text-red-700 dark:text-red-400">{log.suspiciousReason}</p>
                      <p className="text-xs text-gray-500 mt-1 truncate">{log.path} | UA: {log.userAgent?.substring(0, 60)}</p>
                      <button
                        onClick={() => {
                          setBlockForm(f => ({ ...f, ip: log.ip, reason: log.suspiciousReason }));
                          setActiveTab('blocklist');
                        }}
                        className="mt-2 px-3 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600"
                      >
                        🚫 IP ni bloklash
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── AI REQUESTS TAB ─── */}
        {activeTab === 'ai' && dashboard && (
          <div className="space-y-6">
            <div className="grid md:grid-cols-3 gap-4">
              <StatCard label="AI Requests" value={dashboard.stats.aiRequests} icon="🤖" color="purple" sub={`${period} ichida`} />
              <StatCard label="Unique AI Users" value={dashboard.charts.aiByUser?.length || 0} icon="👤" color="cyan" />
              <StatCard label="Study Mode" value={dashboard.charts.studyModeUsage?.length || 0} icon="📖" color="green" sub="foydalanuvchilar" />
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* AI Usage by User */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                <h3 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">👤 AI foydalanish (user bo'yicha)</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {dashboard.charts.aiByUser?.map((item, i) => (
                    <div key={i} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm">
                      <span className="text-gray-800 dark:text-gray-200">{item._id || 'Anonymous'}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-purple-600">{item.count} requests</span>
                        <span className="text-xs text-gray-500">
                          {item.lastUsed ? new Date(item.lastUsed).toLocaleDateString('uz') : ''}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Study Mode Usage */}
              <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
                <h3 className="font-semibold text-sm mb-3 text-gray-700 dark:text-gray-300">📖 Study Mode foydalanish</h3>
                <div className="space-y-2 max-h-[400px] overflow-y-auto">
                  {dashboard.charts.studyModeUsage?.length === 0 ? (
                    <p className="text-gray-500 text-center py-8 text-sm">Study mode ishlatilmagan</p>
                  ) : (
                    dashboard.charts.studyModeUsage?.map((item, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-green-50 dark:bg-green-900/20 rounded-lg text-sm">
                        <span className="text-gray-800 dark:text-gray-200">{item._id || 'Anonymous'}</span>
                        <span className="font-bold text-green-600">{item.count} requests</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── CONTENT TAB ─── */}
        {activeTab === 'content' && (
          <div className="space-y-6">
            {/* Messages/Comments Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    {msgSource === 'chat' ? '💬 Chat xabarlari' : '📝 Izohlar'}
                  </h3>
                  <select
                    value={msgSource}
                    onChange={e => { setMsgSource(e.target.value); setMsgPage(1); }}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                  >
                    <option value="chat">Chat</option>
                    <option value="comments">Comments</option>
                  </select>
                  <input
                    placeholder="Qidirish..."
                    value={msgSearch}
                    onChange={e => setMsgSearch(e.target.value)}
                    className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm w-40"
                  />
                  <button onClick={fetchMessages} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm">🔍</button>
                </div>
                <button onClick={handleClearAllMessages} className="px-3 py-1.5 bg-red-500 text-white rounded-lg text-xs hover:bg-red-600">
                  🗑️ Barchasini o'chirish
                </button>
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {messages.map(msg => (
                  <div key={msg._id} className="flex items-start justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm text-gray-800 dark:text-gray-200">
                          {msg.sender || msg.userName}
                        </span>
                        {msgSource === 'comments' && msg.testId && (
                          <span className="text-[10px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded">
                            {msg.testId}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400">
                          {new Date(msg.createdAt).toLocaleString('uz')}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 break-all">
                        {msg.message || msg.text}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteMessage(msg._id)}
                      className="ml-3 px-2 py-1 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/20 rounded opacity-0 group-hover:opacity-100 transition"
                      title="O'chirish"
                    >
                      🗑️
                    </button>
                  </div>
                ))}
                {messages.length === 0 && <p className="text-center text-gray-500 py-6 text-sm">Xabarlar topilmadi</p>}
              </div>
              <Pagination
                pagination={msgPagination}
                onPageChange={p => { setMsgPage(p); setTimeout(fetchMessages, 100); }}
              />
            </div>

            {/* Tests Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-800 dark:text-white">📚 Testlar (Database)</h3>
                <button onClick={fetchTests} className="px-3 py-1.5 bg-blue-500 text-white rounded-lg text-sm">🔄 Yangilash</button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {tests.map(test => (
                  <div key={test._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg group">
                    <div>
                      <p className="font-medium text-sm text-gray-800 dark:text-gray-200">{test.name}</p>
                      <p className="text-[10px] text-gray-500">
                        📁 {test.folder || 'General'} | 📅 {new Date(test.createdAt).toLocaleDateString('uz')}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteTest(test._id, test.name)}
                      className="px-3 py-1 bg-red-500 text-white text-xs rounded-lg hover:bg-red-600 opacity-0 group-hover:opacity-100 transition"
                    >
                      🗑️ O'chirish
                    </button>
                  </div>
                ))}
                {tests.length === 0 && <p className="text-center text-gray-500 py-6 text-sm">Testlar topilmadi</p>}
              </div>
            </div>
          </div>
        )}

        {/* ─── BLOCKLIST TAB ─── */}
        {activeTab === 'blocklist' && (
          <div className="space-y-6">
            {/* Block Form */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">🚫 Yangi bloklash</h3>
              <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-3">
                <input
                  placeholder="IP manzil"
                  value={blockForm.ip}
                  onChange={e => setBlockForm(f => ({ ...f, ip: e.target.value }))}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                />
                <input
                  placeholder="Device ID"
                  value={blockForm.deviceId}
                  onChange={e => setBlockForm(f => ({ ...f, deviceId: e.target.value }))}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                />
                <input
                  placeholder="Sabab"
                  value={blockForm.reason}
                  onChange={e => setBlockForm(f => ({ ...f, reason: e.target.value }))}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                />
                <select
                  value={blockForm.duration}
                  onChange={e => setBlockForm(f => ({ ...f, duration: e.target.value }))}
                  className="px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                >
                  <option value="1h">1 soat</option>
                  <option value="24h">24 soat</option>
                  <option value="7d">7 kun</option>
                  <option value="30d">30 kun</option>
                  <option value="permanent">Doimiy</option>
                </select>
                <button
                  onClick={handleBlock}
                  className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 font-medium"
                >
                  🚫 Bloklash
                </button>
              </div>
            </div>

            {/* Blocked List */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">📋 Bloklangan ro'yxat</h3>
              <div className="space-y-2">
                {blocklist.filter(b => b.isActive).map(item => (
                  <div key={item._id} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-lg">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {item.ip && <span className="font-mono text-sm bg-red-100 dark:bg-red-900/30 px-2 py-0.5 rounded">IP: {item.ip}</span>}
                        {item.deviceId && <span className="font-mono text-sm bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 rounded">Device: {item.deviceId}</span>}
                      </div>
                      <p className="text-xs text-gray-500">
                        📝 {item.reason} | 📅 {new Date(item.blockedAt).toLocaleString('uz')}
                        {item.expiresAt && ` | ⏳ ${new Date(item.expiresAt).toLocaleString('uz')} gacha`}
                        {!item.expiresAt && ' | ♾️ Doimiy'}
                      </p>
                    </div>
                    <button
                      onClick={() => handleUnblock(item._id)}
                      className="px-3 py-1.5 bg-green-500 text-white text-xs rounded-lg hover:bg-green-600"
                    >
                      ✅ Blokdan chiqarish
                    </button>
                  </div>
                ))}
                {blocklist.filter(b => b.isActive).length === 0 && (
                  <div className="text-center py-8 text-gray-500 text-sm">
                    <div className="text-3xl mb-2">✅</div>
                    <p>Bloklangan IP yoki qurilma yo'q</p>
                  </div>
                )}
              </div>

              {/* Inactive (history) */}
              {blocklist.filter(b => !b.isActive).length > 0 && (
                <details className="mt-4">
                  <summary className="text-sm text-gray-500 cursor-pointer hover:text-gray-700">
                    📜 Blokdan chiqarilganlar tarixi ({blocklist.filter(b => !b.isActive).length})
                  </summary>
                  <div className="space-y-2 mt-2">
                    {blocklist.filter(b => !b.isActive).map(item => (
                      <div key={item._id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg opacity-60">
                        <div>
                          {item.ip && <span className="font-mono text-xs">IP: {item.ip}</span>}
                          {item.deviceId && <span className="font-mono text-xs ml-2">Device: {item.deviceId}</span>}
                          <span className="text-xs text-gray-500 ml-2">| {item.reason}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        )}

        {/* ─── PROFANITY TAB ─── */}
        {activeTab === 'profanity' && (
          <div className="space-y-6">
            {/* Add single word */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">➕ Yangi so'z qo'shish</h3>
              <div className="flex gap-3">
                <input
                  placeholder="Yomon so'z kiriting..."
                  value={newBadWord}
                  onChange={e => setNewBadWord(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAddBadWord()}
                  className="flex-1 px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm"
                />
                <button
                  onClick={handleAddBadWord}
                  disabled={!newBadWord.trim()}
                  className="px-4 py-2 bg-blue-500 text-white rounded-lg text-sm hover:bg-blue-600 font-medium disabled:opacity-40"
                >
                  ➕ Qo'shish
                </button>
              </div>
            </div>

            {/* Bulk add */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">📦 Ko'plab qo'shish</h3>
              <textarea
                placeholder="So'zlarni vergul yoki yangi qator bilan ajrating...&#10;masalan: bad1, bad2, bad3&#10;yoki har qatorda bittadan"
                value={bulkBadWords}
                onChange={e => setBulkBadWords(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm resize-y"
              />
              <button
                onClick={handleBulkAddWords}
                disabled={!bulkBadWords.trim()}
                className="mt-2 px-4 py-2 bg-purple-500 text-white rounded-lg text-sm hover:bg-purple-600 font-medium disabled:opacity-40"
              >
                📦 Barchasini qo'shish
              </button>
            </div>

            {/* Custom words */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <h3 className="font-bold text-gray-800 dark:text-white mb-4">
                🔧 Qo'shimcha so'zlar ({profanityData?.custom?.length || 0})
              </h3>
              {profanityData?.custom?.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {profanityData.custom.map(word => (
                    <span key={word} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-full text-sm">
                      <span className="text-red-700 dark:text-red-400">{word}</span>
                      <button
                        onClick={() => handleRemoveBadWord(word)}
                        className="text-red-400 hover:text-red-600 font-bold ml-1"
                        title="O'chirish"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center py-4">Qo'shimcha so'zlar yo'q. Yuqorida qo'shing.</p>
              )}
            </div>

            {/* Default words */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
              <details>
                <summary className="font-bold text-gray-800 dark:text-white cursor-pointer hover:text-blue-600">
                  📋 Standart so'zlar ro'yxati ({profanityData?.defaults?.length || 0}) — ochish uchun bosing
                </summary>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {profanityData?.defaults?.map(word => (
                    <span key={word} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                      {word}
                    </span>
                  ))}
                </div>
              </details>
            </div>

            {/* Stats */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow text-center">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Jami filtrdagi so'zlar: <span className="font-bold text-lg text-red-500">{profanityData?.total || 0}</span>
              </p>
            </div>
          </div>
        )}
      </main>

      {/* Confirm Modal */}
      <ConfirmModal
        open={confirmModal.open}
        onClose={() => setConfirmModal({ open: false })}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
      />
    </div>
  );
}
