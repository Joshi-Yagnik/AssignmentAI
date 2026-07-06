const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const supabase = require('../config/supabaseClient');

// Signup
router.post('/signup', async (req, res) => {
  try {
    const { email, password, firstName, lastName, role, instituteId } = req.body;
    
    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Insert user into users table (custom table)
    const { data, error } = await supabase
      .from('users')
      .insert([
        {
          email,
          password_hash: passwordHash,
          first_name: firstName,
          last_name: lastName,
          role,
          institute_id: instituteId
        }
      ])
      .select('id, email, first_name, last_name, role')
      .single();

    if (error) throw error;

    // Generate JWT
    const token = jwt.sign(
      { id: data.id, role: data.role, email: data.email },
      process.env.JWT_SECRET || 'your-jwt-secret-key-for-auth',
      { expiresIn: '1d' }
    );

    res.status(201).json({ user: data, token });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // --- TEMPORARY SUPABASE BYPASS ---
    // WARNING: Remove this before deploying to production!
    const user = {
      id: 'temp-bypass-id-123',
      email: email,
      first_name: 'Bypass',
      last_name: 'User',
      name: 'Bypass User', // Added this line because frontend expects user.name
      role: role || 'student', // Using the role sent from frontend, or default to student
      password_hash: 'bypassed'
    };
    /* 
    const { data: dbUser, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !dbUser) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, dbUser.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    */
    // --- END TEMPORARY BYPASS ---

    const token = jwt.sign(
      { id: user.id, role: user.role, email: user.email },
      process.env.JWT_SECRET || 'your-jwt-secret-key-for-auth',
      { expiresIn: '1d' }
    );

    res.json({
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        name: user.name || `${user.first_name} ${user.last_name}`,
        role: user.role
      },
      token
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
