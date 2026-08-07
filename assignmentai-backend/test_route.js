const axios = require('axios');
const API = 'http://localhost:5000/api';

async function run() {
  try {
    // 1. Get TA list from users API using service key or direct DB query
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data: tas } = await supabase.from('users').select('*').eq('role', 'ta').limit(1);
    if (!tas || tas.length === 0) {
      console.log('No TA found in DB');
      return;
    }
    const ta = tas[0];
    console.log('Found TA:', ta.email);

    // Let's force a password update for testing
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('Password123!', 10);
    await supabase.from('users').update({ password_hash: hash }).eq('id', ta.id);

    // 2. Login
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: ta.email,
      password: 'Password123!',
      role: 'ta'
    });
    
    const token = loginRes.data.token;
    console.log('Logged in successfully');

    // 3. Get TA sessions
    const sessionsRes = await axios.get(`${API}/viva/ta/sessions`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    console.log('Sessions:', sessionsRes.data);

  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err);
    }
  }
}

run();
