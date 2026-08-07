require('dotenv').config();
const axios = require('axios');
const API = 'http://localhost:5000/api';
async function run() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    
    // Login as admin
    const { data: admins } = await supabase.from('users').select('*').eq('role', 'admin').limit(1);
    if (!admins || admins.length === 0) return console.log('No admin found');
    
    // Force password
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('Password123!', 10);
    await supabase.from('users').update({ password_hash: hash }).eq('id', admins[0].id);

    const loginRes = await axios.post(`${API}/auth/login`, {
      email: admins[0].email,
      password: 'Password123!',
      role: 'admin'
    });

    console.log('Fetching users...');
    const res = await axios.get(`${API}/admin/users`, {
      headers: { Authorization: `Bearer ${loginRes.data.token}` }
    });
    console.log('Success, found users:', res.data.length);
  } catch (err) {
    console.log('Error:', err.response?.data || err.message);
  }
}
run();
