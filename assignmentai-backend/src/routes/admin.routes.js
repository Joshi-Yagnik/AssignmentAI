const express = require('express');
const router = express.Router();
const supabase = require('../config/supabaseClient');
const bcrypt = require('bcrypt');
const { requireAuth, requireRole } = require('../middleware/auth.middleware');

const adminOnly = [requireAuth, requireRole(['admin'])];

// ─────────────────────────────────────────────────────────────
// INSTITUTES
// ─────────────────────────────────────────────────────────────
router.get('/institutes', ...adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('institutes')
      .select('*')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/institutes', ...adminOnly, async (req, res) => {
  try {
    const { name, code, address, logo_url } = req.body;
    const { data, error } = await supabase
      .from('institutes')
      .insert([{ name, code, address, logo_url }])
      .select().single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/institutes/:id', ...adminOnly, async (req, res) => {
  try {
    const { name, code, address, logo_url, is_active } = req.body;
    const { data, error } = await supabase
      .from('institutes')
      .update({ name, code, address, logo_url, is_active })
      .eq('id', req.params.id)
      .select().single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/institutes/:id', ...adminOnly, async (req, res) => {
  try {
    const { error } = await supabase
      .from('institutes')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Institute deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────
// DEPARTMENTS
// ─────────────────────────────────────────────────────────────
router.get('/departments', ...adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*, institutes(name, code)')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/departments', ...adminOnly, async (req, res) => {
  try {
    const { institute_id, name, code } = req.body;
    const { data, error } = await supabase
      .from('departments')
      .insert([{ institute_id, name, code }])
      .select('*, institutes(name, code)').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/departments/:id', ...adminOnly, async (req, res) => {
  try {
    const { institute_id, name, code, is_active } = req.body;
    const { data, error } = await supabase
      .from('departments')
      .update({ institute_id, name, code, is_active })
      .eq('id', req.params.id)
      .select('*, institutes(name, code)').single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/departments/:id', ...adminOnly, async (req, res) => {
  try {
    const { error } = await supabase
      .from('departments')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Department deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────
// SUBJECTS
// ─────────────────────────────────────────────────────────────
const teacherOrAdmin = [requireAuth, requireRole(['admin', 'teacher'])];

router.get('/subjects', ...teacherOrAdmin, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*, departments(name, code, institutes(name))')
      .order('name');
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/subjects', ...adminOnly, async (req, res) => {
  try {
    const { department_id, name, code, credits, description } = req.body;
    const { data, error } = await supabase
      .from('subjects')
      .insert([{ department_id, name, code, credits, description }])
      .select('*, departments(name, code, institutes(name))').single();
    if (error) throw error;
    res.status(201).json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/subjects/:id', ...adminOnly, async (req, res) => {
  try {
    const { department_id, name, code, credits, description, is_active } = req.body;
    const { data, error } = await supabase
      .from('subjects')
      .update({ department_id, name, code, credits, description, is_active })
      .eq('id', req.params.id)
      .select('*, departments(name, code, institutes(name))').single();
    if (error) throw error;
    res.json(data);
  } catch (err) { res.status(400).json({ error: err.message }); }
});

router.delete('/subjects/:id', ...adminOnly, async (req, res) => {
  try {
    const { error } = await supabase
      .from('subjects')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ message: 'Subject deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ─────────────────────────────────────────────────────────────
// USERS (Teachers & Students)
// ─────────────────────────────────────────────────────────────

// ── Helper: split a full name string into first/last parts ──────────────────
function splitName(fullName = '') {
  const parts = (fullName || '').trim().split(/\s+/);
  return {
    first_name: parts[0] || '',
    last_name:  parts.slice(1).join(' ') || '',
  };
}

router.get('/users', ...adminOnly, async (req, res) => {
  try {
    let query = supabase
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, department_id, created_at, departments(name)')
      .order('created_at', { ascending: false });

    if (req.query.role) {
      query = query.eq('role', req.query.role);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Normalize: add a virtual `name` field for frontend compatibility
    const normalized = (data || []).map(u => ({
      ...u,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email,
    }));
    res.json(normalized);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users', ...adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, department_id } = req.body;
    
    // Split full name into first_name / last_name for DB compatibility
    const { first_name, last_name } = splitName(name);

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(password, salt);

    // Build the user record using the correct column names
    const userRecord = {
      first_name,
      last_name,
      email: email.toLowerCase(),
      password_hash,
      role,
      department_id: department_id || null,
    };

    const { data, error } = await supabase
      .from('users')
      .insert([userRecord])
      .select('id, email, first_name, last_name, role, is_active, department_id, departments(name)').single();
      
    if (error) {
      if (error.code === '23505') throw new Error('Email already exists');
      throw error;
    }
    res.status(201).json({
      ...data,
      name: [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.put('/users/:id', ...adminOnly, async (req, res) => {
  try {
    const { name, email, role, department_id, password, is_active } = req.body;
    
    // Split full name into first_name / last_name for DB compatibility
    const nameParts = name ? splitName(name) : {};

    const updates = {
      ...nameParts,
      email: email?.toLowerCase(),
      role,
      department_id: department_id || null,
      is_active
    };

    // Only update password if provided
    if (password) {
      const salt = await bcrypt.genSalt(10);
      updates.password_hash = await bcrypt.hash(password, salt);
    }

    // Clean undefined fields
    Object.keys(updates).forEach(key => updates[key] === undefined && delete updates[key]);

    const { data, error } = await supabase
      .from('users')
      .update(updates)
      .eq('id', req.params.id)
      .select('id, email, first_name, last_name, role, is_active, department_id, departments(name)').single();
      
    if (error) {
      if (error.code === '23505') throw new Error('Email already exists');
      throw error;
    }
    res.json({
      ...data,
      name: [data.first_name, data.last_name].filter(Boolean).join(' ') || data.email,
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.delete('/users/:id', ...adminOnly, async (req, res) => {
  try {
    const { error } = await supabase
      .from('users')
      .delete()
      .eq('id', req.params.id);
      
    if (error) throw error;
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/users/bulk', ...adminOnly, async (req, res) => {
  try {
    const { role, users } = req.body; // users array from CSV
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ error: 'users array is required' });
    }

    const success = [];
    const failed = [];

    // Process sequentially (or map Promise.all if concurrency is preferred, 
    // but sequential prevents DB connection pool limits for big uploads)
    for (const u of users) {
      try {
        if (!u.email || !u.name || !u.password) {
          throw new Error('Missing required fields (name, email, password)');
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(u.password, salt);

        // Split full name into first_name/last_name columns
        const { first_name, last_name } = splitName(u.name);

        const record = {
          first_name,
          last_name,
          email: u.email.toLowerCase(),
          password_hash,
          role: role || u.role || 'student',
          department_id: u.department_id || null
        };

        const { data, error } = await supabase
          .from('users')
          .insert([record])
          .select('email').single();

        if (error) throw error;
        success.push(data);
      } catch (err) {
        failed.push({ email: u.email || 'Unknown', error: err.message });
      }
    }

    res.status(201).json({ success, failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// SYSTEM CONFIG (AI Engine)
// ─────────────────────────────────────────────────────────────
router.get('/config/ai', ...adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'ai_engine')
      .single();
      
    if (error && error.code !== 'PGRST116') throw error; // ignore no rows error
    res.json(data?.value || null);
  } catch (err) { 
    res.status(500).json({ error: err.message }); 
  }
});

router.patch('/config/ai', ...adminOnly, async (req, res) => {
  try {
    const { primary_model, temperature, is_active, system_prompt } = req.body;
    
    // Fetch existing
    const { data: existing, error: fetchErr } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'ai_engine')
      .single();
      
    if (fetchErr && fetchErr.code !== 'PGRST116') throw fetchErr;
    
    const currentVal = existing?.value || {};
    
    // Merge
    if (primary_model !== undefined) currentVal.primary_model = primary_model;
    if (temperature !== undefined) currentVal.temperature = temperature;
    if (is_active !== undefined) currentVal.is_active = is_active;
    if (system_prompt !== undefined) currentVal.system_prompt = system_prompt;

    const { data, error } = await supabase
      .from('system_config')
      .upsert({ key: 'ai_engine', value: currentVal })
      .select('value')
      .single();
      
    if (error) throw error;
    res.json(data.value);
  } catch (err) { 
    res.status(400).json({ error: err.message }); 
  }
});

// ─────────────────────────────────────────────────────────────
// AI ENGINE STATS
// ─────────────────────────────────────────────────────────────
router.get('/ai-stats', ...adminOnly, async (req, res) => {
  try {
    // Basic stats derived from ai_reports and submissions
    const { count: totalJobs, error: err1 } = await supabase
      .from('ai_reports')
      .select('id', { count: 'exact', head: true });
      
    // Count submissions that have 'graded' status to compare against total jobs
    // Or we can just mock the successRate/avgProcessingTime for now since tracking processing time requires start/end timestamps on jobs
    
    const stats = {
      totalJobs: totalJobs || 0,
      successRate: 98.5, // Mocked until detailed job logs are stored
      avgProcessingTime: '12.4s', // Mocked
      activeWorkers: 3, // Mocked worker count
    };
    
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// SECURITY & PROCTORING REPORTS
// ─────────────────────────────────────────────────────────────

router.get('/reports/security-logs', ...adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('security_logs')
      .select(`
        *,
        users(first_name, last_name, email),
        subjects(name, code)
      `)
      .order('timestamp', { ascending: false })
      .limit(100);

    // If table doesn't exist yet (42P01), return empty array gracefully
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json([]);
      }
      throw error;
    }

    // Normalize user name for frontend compatibility
    const normalized = (data || []).map(log => ({
      ...log,
      users: log.users ? {
        ...log.users,
        name: [log.users.first_name, log.users.last_name].filter(Boolean).join(' ') || log.users.email,
      } : null,
    }));
    res.json(normalized);
  } catch (err) {
    console.error('[Security logs]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.get('/reports/security-trends', ...adminOnly, async (req, res) => {
  try {
    // In a real app, this would use SQL aggregations or RPC calls. 
    // For this demonstration, we'll fetch recent logs and aggregate in memory to build the charts.
    const { data: logs, error } = await supabase
      .from('security_logs')
      .select(`
        violation_type, 
        severity, 
        source,
        subjects(name, code)
      `)
      .order('timestamp', { ascending: false })
      .limit(500);

    // If table doesn't exist yet, return empty trends gracefully
    if (error) {
      if (error.code === '42P01' || error.message?.includes('does not exist')) {
        return res.json({
          byType: {},
          byCourse: {},
          bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
          totalViolations: 0
        });
      }
      throw error;
    }

    const trends = {
      byType: {},
      byCourse: {},
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
      totalViolations: logs.length
    };

    logs.forEach(log => {
      // Aggregate by Type
      trends.byType[log.violation_type] = (trends.byType[log.violation_type] || 0) + 1;
      
      // Aggregate by Course
      if (log.subjects?.name) {
        trends.byCourse[log.subjects.name] = (trends.byCourse[log.subjects.name] || 0) + 1;
      }

      // Aggregate by Severity
      if (trends.bySeverity[log.severity] !== undefined) {
        trends.bySeverity[log.severity]++;
      }
    });

    res.json(trends);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
