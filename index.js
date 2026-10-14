import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';

const app = express();
const PORT = Number(process.env.PORT || 3001);
const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY;

app.use(cors());
app.use(express.json({ limit: '1mb' }));

const TABLES = new Set([
  'institutes','profiles','academic_years','classes','sections','subjects',
  'class_subjects','students','teachers','teacher_subjects',
  'teacher_class_assignments','attendance','teacher_attendance','exams',
  'exam_routines','grading_rules','marks','results','timetables','notices',
  'homework','homework_submissions','roles','fee_structures','student_fees',
  'payments','documents','notifications','audit_logs','system_settings'
]);

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'SchoolDesk API', supabaseConfigured: Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) });
});

// Use the signed-in user's JWT, so Supabase RLS remains the authority.
// This server intentionally never uses a service_role/secret key.
app.use('/api/data/:table', async (req, res, next) => {
  try {
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return res.status(503).json({ error: 'Supabase configuration is missing. Set SUPABASE_URL and SUPABASE_ANON_KEY.' });
    }
    const table = req.params.table;
    if (!TABLES.has(table)) return res.status(404).json({ error: 'Unknown table.' });
    const auth = req.headers.authorization || '';
    if (!auth.startsWith('Bearer ')) return res.status(401).json({ error: 'Sign in first.' });

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: auth } }
    });
    const { data: { user }, error: authError } = await supabase.auth.getUser(auth.slice(7));
    if (authError || !user) return res.status(401).json({ error: 'Session expired. Please sign in again.' });

    req.schooldesk = { supabase, table };
    next();
  } catch (err) {
    res.status(500).json({ error: err.message || 'Unexpected server error.' });
  }
});

app.get('/api/data/:table', async (req, res) => {
  const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
  const { data, error } = await req.schooldesk.supabase
    .from(req.schooldesk.table).select('*').limit(limit);
  if (error) return res.status(400).json({ error: error.message, code: error.code });
  res.json({ data });
});

app.post('/api/data/:table', async (req, res) => {
  if (!req.body || Array.isArray(req.body) || typeof req.body !== 'object') {
    return res.status(400).json({ error: 'Send one JSON object.' });
  }
  const { data, error } = await req.schooldesk.supabase
    .from(req.schooldesk.table).insert(req.body).select().single();
  if (error) return res.status(400).json({ error: error.message, code: error.code });
  res.status(201).json({ data });
});

app.patch('/api/data/:table', async (req, res) => {
  const { id, ...changes } = req.body || {};
  if (id === undefined || id === null || id === '') return res.status(400).json({ error: 'An id is required for updates.' });
  const { data, error } = await req.schooldesk.supabase
    .from(req.schooldesk.table).update(changes).eq('id', id).select().single();
  if (error) return res.status(400).json({ error: error.message, code: error.code });
  res.json({ data });
});

app.delete('/api/data/:table', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'An id query parameter is required.' });
  const { error } = await req.schooldesk.supabase
    .from(req.schooldesk.table).delete().eq('id', id);
  if (error) return res.status(400).json({ error: error.message, code: error.code });
  res.json({ ok: true });
});

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error.' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`SchoolDesk API listening on port ${PORT}`);
});