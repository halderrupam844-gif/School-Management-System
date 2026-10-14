import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { createClient } from '@supabase/supabase-js';
import {
  GraduationCap, LayoutDashboard, Users, UserRound, School, CalendarCheck,
  BookOpen, ClipboardList, Wallet, Bell, FileText, LogOut, Menu, X, Search,
  RefreshCw, Plus, ShieldCheck, ChevronRight, AlertCircle, CheckCircle2
} from 'lucide-react';
import './style.css';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://csrjykobfgvkiimzpihh.supabase.co';
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

const modules = [
  { table: 'students', label: 'শিক্ষার্থী', en: 'Students', icon: Users },
  { table: 'teachers', label: 'শিক্ষক', en: 'Teachers', icon: UserRound },
  { table: 'classes', label: 'ক্লাস', en: 'Classes', icon: School },
  { table: 'attendance', label: 'উপস্থিতি', en: 'Attendance', icon: CalendarCheck },
  { table: 'subjects', label: 'বিষয়', en: 'Subjects', icon: BookOpen },
  { table: 'exams', label: 'পরীক্ষা', en: 'Exams', icon: ClipboardList },
  { table: 'results', label: 'ফলাফল', en: 'Results', icon: FileText },
  { table: 'student_fees', label: 'ফি', en: 'Fees', icon: Wallet },
  { table: 'notices', label: 'নোটিশ', en: 'Notices', icon: Bell },
  { table: 'homework', label: 'হোমওয়ার্ক', en: 'Homework', icon: BookOpen },
  { table: 'sections', label: 'সেকশন', en: 'Sections', icon: School },
  { table: 'academic_years', label: 'শিক্ষাবর্ষ', en: 'Academic years', icon: CalendarCheck },
];

function App() {
  const [session, setSession] = useState(null);
  const [authBusy, setAuthBusy] = useState(true);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [authError, setAuthError] = useState('');
  const [active, setActive] = useState('dashboard');
  const [drawer, setDrawer] = useState(false);
  const [rows, setRows] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [newRecord, setNewRecord] = useState('{\n  \n}');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    if (!supabase) { setAuthBusy(false); return; }
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setAuthBusy(false); });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const api = async (table, method = 'GET', body) => {
    const token = session?.access_token;
    const response = await fetch(`/api/data/${table}${method === 'DELETE' ? `?id=${encodeURIComponent(body.id)}` : ''}`, {
      method,
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body && method !== 'DELETE' ? { 'Content-Type': 'application/json' } : {}) },
      ...(body && method !== 'DELETE' ? { body: JSON.stringify(body) } : {})
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || `Request failed (${response.status})`);
    return payload;
  };

  const loadDashboard = async () => {
    if (!session) return;
    setLoading(true); setError('');
    try {
      const result = await Promise.all(modules.map(async m => {
        try { const d = await api(m.table); return [m.table, d.data?.length ?? 0]; }
        catch (e) { return [m.table, null]; }
      }));
      setCounts(Object.fromEntries(result));
    } finally { setLoading(false); }
  };

  const loadTable = async (table) => {
    setLoading(true); setError(''); setRows([]);
    try { const result = await api(table); setRows(result.data || []); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (!session) return;
    if (active === 'dashboard') loadDashboard();
    else if (active !== 'settings') loadTable(active);
  }, [session, active]);

  const selectedModule = modules.find(m => m.table === active);
  const filteredRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(row => JSON.stringify(row).toLowerCase().includes(q));
  }, [rows, query]);

  const submitAuth = async (e) => {
    e.preventDefault(); setAuthError('');
    if (!supabase) return;
    setAuthBusy(true);
    try {
      if (authMode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } });
        if (error) throw error;
        setAuthError('অ্যাকাউন্ট তৈরির অনুরোধ সফল। ইমেইল confirmation চালু থাকলে inbox দেখো।');
        setAuthMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (e) { setAuthError(e.message || 'লগইন করা যায়নি।'); }
    finally { setAuthBusy(false); }
  };

  const addRecord = async () => {
    try {
      const value = JSON.parse(newRecord);
      await api(active, 'POST', value);
      setShowAdd(false); setNotice('রেকর্ড যোগ হয়েছে'); setTimeout(() => setNotice(''), 3000);
      await loadTable(active);
    } catch (e) { setError(`রেকর্ড যোগ হয়নি: ${e.message}`); }
  };

  if (!SUPABASE_KEY) return <Setup />;
  if (authBusy) return <div className="center-screen"><div className="spinner" /><p>লোড হচ্ছে…</p></div>;
  if (!session) return <div className="auth-page"><div className="auth-card">
    <div className="brand-mark"><GraduationCap size={32}/></div><p className="eyebrow">SCHOOL MANAGEMENT</p>
    <h1>SchoolDesk</h1><p className="muted">তোমার স্কুল, এক জায়গায়।</p>
    <div className="auth-tabs"><button className={authMode === 'login' ? 'selected' : ''} onClick={() => { setAuthMode('login'); setAuthError(''); }}>লগইন</button><button className={authMode === 'signup' ? 'selected' : ''} onClick={() => { setAuthMode('signup'); setAuthError(''); }}>নতুন অ্যাকাউন্ট</button></div>
    <form onSubmit={submitAuth} className="auth-form">
      {authMode === 'signup' && <label>পুরো নাম<input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="তোমার নাম" required /></label>}
      <label>ইমেইল<input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required /></label>
      <label>পাসওয়ার্ড<input type="password" value={password} onChange={e => setPassword(e.target.value)} minLength={6} placeholder="কমপক্ষে ৬ অক্ষর" required /></label>
      {authError && <div className="inline-message"><AlertCircle size={16}/>{authError}</div>}
      <button className="primary-btn full" disabled={authBusy}>{authBusy ? 'অপেক্ষা করো…' : authMode === 'login' ? 'লগইন করো' : 'অ্যাকাউন্ট তৈরি করো'}<ChevronRight size={18}/></button>
    </form>
    <p className="security-note"><ShieldCheck size={15}/> Supabase authentication · নিরাপদ session</p>
  </div></div>;

  const signOut = async () => { await supabase.auth.signOut(); setRows([]); setCounts({}); };
  const navItem = (id, label, Icon) => <button key={id} className={`nav-item ${active === id ? 'active' : ''}`} onClick={() => { setActive(id); setDrawer(false); setQuery(''); setError(''); }}><Icon size={19}/><span>{label}</span>{active === id && <ChevronRight className="nav-chevron" size={16}/>}</button>;

  return <div className="app-shell">
    <aside className={`sidebar ${drawer ? 'open' : ''}`}>
      <div className="sidebar-brand"><div className="brand-mark small"><GraduationCap size={23}/></div><div><strong>SchoolDesk</strong><small>School Management</small></div><button className="close-drawer" onClick={() => setDrawer(false)}><X size={20}/></button></div>
      <div className="nav-label">মূল মেনু</div>
      {navItem('dashboard', 'ড্যাশবোর্ড', LayoutDashboard)}
      <div className="nav-label">স্কুল পরিচালনা</div>
      {modules.map(m => navItem(m.table, m.label, m.icon))}
      <div className="sidebar-bottom"><div className="user-chip"><div className="avatar">{(session.user.email || 'U')[0].toUpperCase()}</div><div className="user-info"><strong>{session.user.user_metadata?.full_name || 'School Admin'}</strong><small>{session.user.email}</small></div></div><button className="logout-btn" onClick={signOut}><LogOut size={17}/> লগআউট</button></div>
    </aside>
    {drawer && <button className="scrim" aria-label="Close menu" onClick={() => setDrawer(false)} />}
    <main className="main-area">
      <header className="topbar"><button className="menu-toggle" onClick={() => setDrawer(true)}><Menu size={22}/></button><div className="crumb"><span>SchoolDesk</span><ChevronRight size={15}/><strong>{active === 'dashboard' ? 'ড্যাশবোর্ড' : selectedModule?.label || 'সেটিংস'}</strong></div><div className="topbar-right"><span className="status-dot"/> <span className="online-label">সংযুক্ত</span><button className="icon-btn" title="Refresh" onClick={() => active === 'dashboard' ? loadDashboard() : loadTable(active)}><RefreshCw size={17}/></button></div></header>
      <div className="page-content">
        {notice && <div className="success-banner"><CheckCircle2 size={17}/>{notice}</div>}
        {error && <div className="error-banner"><AlertCircle size={17}/><span>{error}</span><button onClick={() => setError('')}><X size={16}/></button></div>}
        {active === 'dashboard' ? <>
          <div className="welcome-row"><div><p className="eyebrow">SCHOOL OVERVIEW</p><h1>স্বাগতম 👋</h1><p className="muted">তোমার স্কুলের গুরুত্বপূর্ণ তথ্য এক নজরে দেখো।</p></div><div className="today-pill"><CalendarCheck size={16}/>{new Date().toLocaleDateString('bn-BD', { day: 'numeric', month: 'short', year: 'numeric' })}</div></div>
          <div className="hero-card"><div className="hero-copy"><span className="hero-tag">SCHOOL ADMINISTRATION</span><h2>স্কুল পরিচালনা এখন আরও সহজ</h2><p>শিক্ষার্থী, শিক্ষক, উপস্থিতি ও ফলাফল—সব এক জায়গায়।</p><button className="hero-btn" onClick={() => setActive('students')}>শিক্ষার্থীদের দেখো <ChevronRight size={17}/></button></div><div className="hero-graphic"><div className="graphic-circle"><GraduationCap size={70}/></div><span className="float-dot dot-one"/><span className="float-dot dot-two"/></div></div>
          <div className="section-heading"><div><h2>স্কুলের সারসংক্ষেপ</h2><p className="muted">ডাটাবেস থেকে পাওয়া রেকর্ড</p></div><button className="text-btn" onClick={loadDashboard}><RefreshCw size={15}/> রিফ্রেশ</button></div>
          <div className="stats-grid">{modules.slice(0,8).map((m, i) => { const Icon = m.icon; const value = counts[m.table]; return <button className="stat-card" key={m.table} onClick={() => setActive(m.table)}><div className={`stat-icon tint-${i % 4}`}><Icon size={21}/></div><span className="stat-label">{m.label}</span><strong>{loading ? '…' : value === null || value === undefined ? '—' : value}</strong><small>{value === null ? 'অ্যাক্সেস/টেবিল পরীক্ষা করো' : 'রেকর্ড পাওয়া গেছে'}</small></button>; })}</div>
          <div className="section-heading"><div><h2>দ্রুত প্রবেশ</h2><p className="muted">যে মডিউলটি দরকার বেছে নাও</p></div></div>
          <div className="quick-grid">{modules.slice(0,6).map(m => { const Icon = m.icon; return <button className="quick-link" key={m.table} onClick={() => setActive(m.table)}><span><Icon size={20}/></span><strong>{m.label}</strong><ChevronRight size={17}/></button>; })}</div>
          <div className="info-note"><ShieldCheck size={18}/><div><strong>নিরাপত্তা সক্রিয়</strong><p>ডেটা অ্যাক্সেস Supabase Auth ও Row Level Security (RLS)-এর নিয়ম মেনে চলে।</p></div></div>
        </> : <div className="data-page">
          <div className="welcome-row"><div><p className="eyebrow">{selectedModule?.en?.toUpperCase() || 'SCHOOL SETTINGS'}</p><h1>{selectedModule?.label || 'সেটিংস'}</h1><p className="muted">Supabase থেকে রেকর্ড দেখা ও নতুন রেকর্ড যোগ করা।</p></div><button className="primary-btn" onClick={() => { setNewRecord('{\n  \n}'); setShowAdd(true); }}><Plus size={18}/> নতুন রেকর্ড</button></div>
          <div className="table-toolbar"><div className="search-box"><Search size={18}/><input value={query} onChange={e => setQuery(e.target.value)} placeholder="রেকর্ড খুঁজুন…" /></div><span className="record-count">{filteredRows.length}টি রেকর্ড</span></div>
          {showAdd && <div className="add-panel"><div className="add-panel-head"><strong>নতুন রেকর্ড (JSON)</strong><button className="icon-btn" onClick={() => setShowAdd(false)}><X size={18}/></button></div><p className="muted">টেবিলের কলামের নাম অনুযায়ী JSON দাও। যেমন: <code>{'{"name":"Rahim"}'}</code>। প্রয়োজনীয় field তোমার database schema অনুযায়ী দিতে হবে।</p><textarea className="json-editor" value={newRecord} onChange={e => setNewRecord(e.target.value)} rows={6} spellCheck="false"/><button className="primary-btn" onClick={addRecord}><Plus size={17}/> রেকর্ড সংরক্ষণ</button></div>}
          {loading ? <div className="empty-state"><div className="spinner"/><p>ডেটা লোড হচ্ছে…</p></div> : error ? <div className="empty-state"><AlertCircle size={30}/><strong>ডেটা পাওয়া যায়নি</strong><p>টেবিলের অনুমতি, RLS policy ও database schema পরীক্ষা করো।</p></div> : filteredRows.length === 0 ? <div className="empty-state"><FileText size={34}/><strong>এখনও কোনো রেকর্ড নেই</strong><p>ডেটা না থাকলে নতুন রেকর্ড যোগ করতে পারো।</p></div> : <div className="record-list">{filteredRows.map((row, i) => <div className="record-card" key={row.id ?? i}><div className="record-avatar">{(String(row.name || row.full_name || row.title || row.student_name || selectedModule?.label || 'R'))[0]}</div><div className="record-main"><strong>{row.name || row.full_name || row.title || row.student_name || row.subject_name || `${selectedModule?.label || 'রেকর্ড'} #${row.id ?? i + 1}`}</strong><small>{Object.entries(row).filter(([k]) => !['id','created_at','updated_at','name','full_name','title'].includes(k)).slice(0,2).map(([k,v]) => `${k}: ${String(v ?? '—')}`).join(' · ') || `ID: ${row.id ?? '—'}`}</small></div><span className="record-id">#{row.id ?? i + 1}</span></div>)}</div>}
        </div>}
        <footer className="footer">SchoolDesk <span>•</span> School Management System <span>•</span> Supabase</footer>
      </div>
    </main>
  </div>;
}

function Setup() {
  return <div className="setup-page"><div className="setup-card"><div className="brand-mark"><GraduationCap size={30}/></div><p className="eyebrow">ONE-TIME SETUP</p><h1>Supabase key যোগ করো</h1><p className="muted">ওয়েবসাইট চালাতে Supabase Publishable/anon key দরকার। মোবাইলে project-এর Secrets বা Environment Variables-এ এই দুটি variable যোগ করো।</p><div className="env-line"><span>VITE_SUPABASE_URL</span><code>https://csrjykobfgvkiimzpihh.supabase.co</code></div><div className="env-line"><span>VITE_SUPABASE_ANON_KEY</span><code>তোমার Publishable key</code></div><a className="primary-btn full link-btn" href="https://supabase.com/dashboard/project/csrjykobfgvkiimzpihh/settings/api-keys" target="_blank" rel="noreferrer">Supabase API Keys খুলুন <ChevronRight size={18}/></a><p className="security-note"><ShieldCheck size={15}/> service_role বা secret key এখানে ব্যবহার করবে না।</p></div></div>;
}

createRoot(document.getElementById('root')).render(<App />);