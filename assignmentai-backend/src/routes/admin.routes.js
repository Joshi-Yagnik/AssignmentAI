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

    // Pre-load all departments once so we don't hit DB per row
    const { data: allDepts } = await supabase
      .from('departments')
      .select('id, code');
    const deptByCode = {};
    (allDepts || []).forEach(d => { deptByCode[d.code.toUpperCase()] = d.id; });

    const success = [];
    const failed  = [];

    for (const u of users) {
      try {
        if (!u.email || !u.name || !u.password) {
          throw new Error('Missing required fields (name, email, password)');
        }

        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(u.password, salt);

        // Split full name into first_name/last_name columns
        const { first_name, last_name } = splitName(u.name);

        // ── Resolve department_code → department_id ─────────────────────────
        let department_id = null;
        const inputVal = (u.department_code || u.dept_code || u.department_id || '').trim();

        if (inputVal) {
          // Check if the user pasted a raw UUID
          const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(inputVal);
          
          if (isUUID) {
            department_id = inputVal;
          } else {
            // Otherwise treat it as a department code (even if they used the old 'department_id' CSV column)
            const deptCode = inputVal.toUpperCase();
            if (!deptByCode[deptCode]) {
              throw new Error(`Department code '${deptCode}' not found. Check the code or create the department first.`);
            }
            department_id = deptByCode[deptCode];
          }
        }

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


// ─────────────────────────────────────────────────────────────
// REPORTS — SYSTEM OVERVIEW
// ─────────────────────────────────────────────────────────────
router.get('/reports/overview', ...adminOnly, async (req, res) => {
  try {
    const [
      { count: totalTeachers },
      { count: totalStudents },
      { count: totalAssignments },
      { count: totalSubmissions },
      { count: gradedSubmissions },
      { data: recentSubs },
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('assignments').select('id', { count: 'exact', head: true }),
      supabase.from('submissions').select('id', { count: 'exact', head: true }),
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('status', 'graded'),
      supabase.from('ai_reports').select('final_score').not('final_score', 'is', null).limit(1000),
    ]);

    const scores = (recentSubs || []).map(r => r.final_score).filter(s => s !== null);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
    const atRisk   = scores.filter(s => s < 60).length;
    const passing  = scores.filter(s => s >= 60).length;

    res.json({
      totalTeachers:    totalTeachers    || 0,
      totalStudents:    totalStudents    || 0,
      totalAssignments: totalAssignments || 0,
      totalSubmissions: totalSubmissions || 0,
      gradedSubmissions: gradedSubmissions || 0,
      avgScore,
      atRisk,
      passing,
    });
  } catch (err) {
    console.error('[Reports overview]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// ADMIN DASHBOARD STATS
// ─────────────────────────────────────────────────────────────
router.get('/dashboard/stats', ...adminOnly, async (req, res) => {
  try {
    const [
      { count: totalTeachers },
      { count: totalStudents },
      { count: totalAssignments },
      { count: totalSubmissions },
      { data: recentSubs },
      { data: departments },
      { data: vivaSessions },
      { data: users },
      { data: subjects },
      { data: allAssignments },
      { data: allSubmissions }
    ] = await Promise.all([
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'teacher'),
      supabase.from('users').select('id', { count: 'exact', head: true }).eq('role', 'student'),
      supabase.from('assignments').select('id', { count: 'exact', head: true }),
      supabase.from('submissions').select('id', { count: 'exact', head: true }),
      // Get recent activity (submissions)
      supabase.from('submissions')
        .select('id, status, submitted_at, users!submissions_student_id_fkey(first_name, last_name, role), assignments(title)')
        .order('submitted_at', { ascending: false })
        .limit(5),
      // Get departments for list
      supabase.from('departments').select('id, name, code'),
      // Get active/recent viva sessions
      supabase.from('viva_sessions').select('id, title, status, teacher_id, users!viva_sessions_teacher_id_fkey(first_name, last_name)').order('created_at', { ascending: false }).limit(2),
      // Raw data for department aggregation
      supabase.from('users').select('id, department_id, role'),
      supabase.from('subjects').select('id, department_id'),
      supabase.from('assignments').select('id, subject_id'),
      supabase.from('submissions').select('id, status, assignment_id')
    ]);

    // Mock AI accuracy & system uptime
    const aiAccuracy = 94.7;
    const systemUptime = 99.9;
    const vivaSessionsMonth = vivaSessions ? vivaSessions.length : 0; // Simple fallback

    // Map recent activity
    const recentActivity = (recentSubs || []).map(sub => ({
      id: sub.id,
      user: `${sub.users?.first_name} ${sub.users?.last_name}`,
      role: sub.users?.role || 'student',
      action: `Submitted: ${sub.assignments?.title || 'Assignment'}`,
      time: new Date(sub.submitted_at).toLocaleDateString(),
      status: sub.status === 'graded' ? 'success' : 'pending'
    }));

    // Group items for department counts
    const depsList = (departments || []).map(d => {
      const depStudents = (users || []).filter(u => u.department_id === d.id && u.role === 'student').length;
      const depSubjects = (subjects || []).filter(s => s.department_id === d.id);
      const depSubjectIds = depSubjects.map(s => s.id);
      const depAssignments = (allAssignments || []).filter(a => depSubjectIds.includes(a.subject_id));
      const depAssignmentIds = depAssignments.map(a => a.id);
      
      const pendingReviews = (allSubmissions || []).filter(sub => 
        depAssignmentIds.includes(sub.assignment_id) && 
        (sub.status === 'pending' || sub.status === 'submitted')
      ).length;

      return {
        id: d.id,
        name: d.name,
        code: d.code,
        courses: depSubjects.length,
        students: depStudents,
        pendingReviews: pendingReviews
      };
    });

    // Map viva sessions
    const mappedVivas = (vivaSessions || []).map(v => ({
      id: v.id,
      title: v.title,
      teacher: `${v.users?.first_name} ${v.users?.last_name}`,
      status: v.status,
      students: 0 // We'd need to count participants
    }));

    res.json({
      overview: {
        totalTeachers: totalTeachers || 0,
        totalStudents: totalStudents || 0,
        totalAssignments: totalAssignments || 0,
        totalSubmissions: totalSubmissions || 0,
        aiAccuracy,
        systemUptime,
        vivaSessionsMonth
      },
      departments: depsList,
      recentActivity,
      vivaSessions: mappedVivas
    });
  } catch (err) {
    console.error('[Admin Dashboard Stats]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// REPORTS — ASSIGNMENT BREAKDOWN
// ─────────────────────────────────────────────────────────────
router.get('/reports/assignments', ...adminOnly, async (req, res) => {
  try {
    // Fetch all assignments with subject info
    const { data: assignments, error: aErr } = await supabase
      .from('assignments')
      .select(`
        id, title, deadline, max_marks, created_at,
        subjects(name, code)
      `)
      .order('created_at', { ascending: false });

    if (aErr) throw aErr;

    // Fetch submissions with AI reports for analytics
    const { data: submissions, error: sErr } = await supabase
      .from('submissions')
      .select('assignment_id, status, ai_reports(final_score)');

    if (sErr) throw sErr;

    // Aggregate per assignment
    const result = (assignments || []).map(a => {
      const subs = (submissions || []).filter(s => s.assignment_id === a.id);
      const graded = subs.filter(s => s.status === 'graded' && !!s.ai_reports);
      const scores = graded.map(s => s.ai_reports?.final_score).filter(v => v !== null && v !== undefined);
      const avg = scores.length > 0 ? Math.round(scores.reduce((acc, v) => acc + v, 0) / scores.length) : null;
      // Teacher tracking might be derived from subjects.teachers mapping if it exists, otherwise omit
      const teacherName = '—';
      return {
        id: a.id,
        title: a.title,
        subject: a.subjects?.name || '—',
        subjectCode: a.subjects?.code || '—',
        teacher: teacherName,
        deadline: a.deadline,
        maxMarks: a.max_marks,
        totalSubmissions: subs.length,
        gradedCount: graded.length,
        pendingCount: subs.filter(s => s.status === 'submitted').length,
        avgScore: avg,
        passRate: scores.length > 0 ? Math.round((scores.filter(s => s >= 60).length / scores.length) * 100) : null,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[Reports assignments]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// REPORTS — STUDENT PERFORMANCE
// ─────────────────────────────────────────────────────────────
router.get('/reports/students', ...adminOnly, async (req, res) => {
  try {
    // Fetch all students
    const { data: students, error: stErr } = await supabase
      .from('users')
      .select('id, first_name, last_name, email, department_id, created_at, departments(name)')
      .eq('role', 'student')
      .order('created_at', { ascending: false });

    if (stErr) throw stErr;

    // Fetch all submissions with AI reports
    const { data: submissions, error: sErr } = await supabase
      .from('submissions')
      .select('student_id, assignment_id, status, submitted_at, ai_reports(final_score)');

    if (sErr) throw sErr;

    // Aggregate per student
    const result = (students || []).map(s => {
      const mySubs = (submissions || []).filter(sub => sub.student_id === s.id);
      const graded = mySubs.filter(sub => sub.status === 'graded' && !!sub.ai_reports);
      const scores = graded.map(sub => sub.ai_reports?.final_score).filter(v => v !== null && v !== undefined);
      const avg = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
      const latest = mySubs.length > 0
        ? mySubs.reduce((a, b) => new Date(a.submitted_at) > new Date(b.submitted_at) ? a : b).submitted_at
        : null;

      return {
        id: s.id,
        name: [s.first_name, s.last_name].filter(Boolean).join(' ') || s.email,
        email: s.email,
        department: s.departments?.name || '—',
        submissionCount: mySubs.length,
        gradedCount: graded.length,
        avgScore: avg,
        status: avg === null ? 'pending' : avg >= 70 ? 'good' : avg >= 50 ? 'average' : 'at_risk',
        latestSubmission: latest,
      };
    });

    res.json(result);
  } catch (err) {
    console.error('[Reports students]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PLATFORM SETTINGS
// ─────────────────────────────────────────────────────────────

router.get('/settings', ...adminOnly, async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .single();

    if (error) {
      if (error.code === '42P01' || error.code === 'PGRST205' || error.message?.includes('does not exist') || error.code === 'PGRST116') {
        // Return default mock settings if table is missing or empty
        return res.json({
          maintenance_mode: false,
          default_grading_strictness: 'normal',
          theme_preference: 'system',
          require_2fa: false,
          session_timeout_minutes: 120
        });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error('[Admin settings GET]', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.patch('/settings', ...adminOnly, async (req, res) => {
  try {
    const updates = req.body;
    
    // Check if table exists by doing a select first
    const { data: existing, error: checkErr } = await supabase
      .from('platform_settings')
      .select('id')
      .limit(1)
      .maybeSingle();

    if (checkErr && (checkErr.code === '42P01' || checkErr.code === 'PGRST205')) {
      return res.status(400).json({ error: 'platform_settings table does not exist. Please run the SQL migration.' });
    }

    let result;
    if (!existing) {
      // Insert if empty
      const { data, error } = await supabase
        .from('platform_settings')
        .insert([updates])
        .select()
        .single();
      if (error) throw error;
      result = data;
    } else {
      // Update
      const { data, error } = await supabase
        .from('platform_settings')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single();
      if (error) throw error;
      result = data;
    }

    res.json(result);
  } catch (err) {
    console.error('[Admin settings PATCH]', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
