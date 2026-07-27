const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabaseAdmin = require('../config/supabaseAdmin');
const { requireAuth } = require('../middleware/auth.middleware');

const JWT_SECRET = process.env.JWT_SECRET || 'your-jwt-secret-key-for-auth';

// ── Helper: resolve display name from DB row ──────────────────────────────────
function buildName(row) {
  if (row.name)      return row.name;
  if (row.first_name || row.last_name)
    return [row.first_name, row.last_name].filter(Boolean).join(' ');
  return row.email;
}

// ── Helper: split a "Full Name" string into first/last ────────────────────────
function splitName(fullName = '') {
  const parts = fullName.trim().split(/\s+/);
  return {
    first_name: parts[0] || '',
    last_name:  parts.slice(1).join(' ') || '',
  };
}

// ── POST /signup ──────────────────────────────────────────────────────────────
router.post('/signup', async (req, res) => {
  try {
    const { name, email, password, role, firstName, lastName, instituteId } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ error: 'email, password, and role are required' });
    }

    const validRoles = ['admin', 'teacher', 'student'];
    const normalizedRole = role.toLowerCase();
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({ error: 'Invalid role. Must be admin, teacher, or student.' });
    }

    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check if email already exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Build full name — accept either { name } or { firstName, lastName }
    const fullName = name || [firstName, lastName].filter(Boolean).join(' ') || '';
    const { first_name, last_name } = splitName(fullName);

    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{
        email:         email.toLowerCase(),
        password_hash: passwordHash,
        role:          normalizedRole,
        first_name,
        last_name,
        ...(instituteId ? { institute_id: instituteId } : {}),
      }])
      .select('id, email, first_name, last_name, role')
      .single();

    if (error) {
      console.error('[Auth/signup] insert error:', error);
      throw error;
    }

    const token = jwt.sign(
      { id: data.id, role: data.role, email: data.email },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.status(201).json({
      message: 'Account created successfully.',
      user: {
        id:    data.id,
        email: data.email,
        name:  buildName(data),
        role:  data.role,
      },
      token,
    });
  } catch (err) {
    console.error('[Auth/signup]', err.message);
    res.status(400).json({ error: err.message });
  }
});

// ── POST /login ───────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (error || !dbUser) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    if (dbUser.is_active === false) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact your administrator.' });
    }

    const validPassword = await bcrypt.compare(password, dbUser.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    // ── Role check: ensure the user is logging in as the correct role ─────────
    if (role) {
      const normalizedRole = role.toLowerCase();
      if (dbUser.role !== normalizedRole) {
        return res.status(403).json({
          error: `This account is registered as a ${dbUser.role}. Please select the correct role to sign in.`,
        });
      }
    }

    const token = jwt.sign(
      { id: dbUser.id, role: dbUser.role, email: dbUser.email },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    res.json({
      token,
      user: {
        id:         dbUser.id,
        email:      dbUser.email,
        name:       buildName(dbUser),
        first_name: dbUser.first_name || '',
        last_name:  dbUser.last_name  || '',
        role:       dbUser.role,
      },
    });
  } catch (err) {
    console.error('[Auth/login]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── GET /me ───────────────────────────────────────────────────────────────────
router.get('/me', requireAuth, async (req, res) => {
  try {
    const { data: dbUser, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, is_active, department_id')
      .eq('id', req.user.id)
      .maybeSingle();

    if (error || !dbUser) {
      return res.status(401).json({ error: 'User not found.' });
    }

    if (dbUser.is_active === false) {
      return res.status(403).json({ error: 'Account deactivated.' });
    }

    res.json({
      id:            dbUser.id,
      email:         dbUser.email,
      name:          buildName(dbUser),
      first_name:    dbUser.first_name || '',
      last_name:     dbUser.last_name  || '',
      role:          dbUser.role,
      department_id: dbUser.department_id || null,
    });
  } catch (err) {
    console.error('[Auth/me]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

const { sendMail } = require('../services/mailService');

// ── POST /forgot-password ─────────────────────────────────────────────────────
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required.' });
    }

    // Look up user (don't reveal if email exists — always return 200)
    const { data: dbUser } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name')
      .eq('email', email.toLowerCase())
      .maybeSingle();

    if (dbUser) {
      // Generate a short-lived password reset token
      const resetToken = jwt.sign(
        { id: dbUser.id, email: dbUser.email, purpose: 'password-reset' },
        JWT_SECRET,
        { expiresIn: '1h' },
      );

      const resetUrl = `http://localhost:5173/reset-password?token=${resetToken}`;
      
      const htmlBody = `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Reset Your Password</h2>
          <p>Hi ${dbUser.first_name || 'there'},</p>
          <p>We received a request to reset your password for AssignmentAI.</p>
          <p>Click the button below to set a new password:</p>
          <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #6366F1; color: white; text-decoration: none; border-radius: 5px; margin: 15px 0;">Reset Password</a>
          <p>If you didn't request this, you can safely ignore this email.</p>
        </div>
      `;

      // Send the email using our new mail service!
      await sendMail({
        to: email,
        subject: 'Password Reset - AssignmentAI',
        text: `Reset your password here: ${resetUrl}`,
        html: htmlBody
      });
    }

    // Always respond with 200 to prevent email-enumeration attacks
    res.json({
      message: 'If an account with that email exists, a password reset link has been sent.',
    });
  } catch (err) {
    console.error('[Auth/forgot-password]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /reset-password ──────────────────────────────────────────────────────
router.post('/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required.' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Reset link is invalid or has expired.' });
    }

    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ error: 'Invalid reset token.' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(newPassword, salt);

    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash: passwordHash })
      .eq('id', decoded.id);

    if (error) throw error;

    res.json({ message: 'Password updated successfully. You can now sign in.' });
  } catch (err) {
    console.error('[Auth/reset-password]', err.message);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// ── POST /logout ──────────────────────────────────────────────────────────────
// JWT is stateless — client drops the token; nothing to invalidate server-side.
router.post('/logout', (req, res) => {
  res.json({ message: 'Logged out successfully.' });
});

module.exports = router;
