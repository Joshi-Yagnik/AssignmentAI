const axios = require('axios');
const API = 'http://localhost:5000/api';

async function run() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY
    );

    // Get any student
    const { data: students } = await supabase.from('users').select('*').eq('role', 'student').limit(1);
    if (!students || students.length === 0) return console.log('No student found');
    const student = students[0];

    // Force password
    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('Password123!', 10);
    await supabase.from('users').update({ password_hash: hash }).eq('id', student.id);

    // Login
    const loginRes = await axios.post(`${API}/auth/login`, {
      email: student.email,
      password: 'Password123!',
      role: 'student'
    });
    const token = loginRes.data.token;

    // Create a mock session directly
    const { data: session } = await supabase.from('viva_sessions').insert([{
      title: 'Mock Viva',
      status: 'live',
      student_id: student.id,
      subject: 'Math',
      topic: 'Algebra',
      difficulty: 'easy',
      total_questions: 5
    }]).select().single();

    // Fetch next question
    console.log('Fetching next question for session:', session.id);
    const res = await axios.post(`${API}/viva/sessions/${session.id}/next-question`, {
      transcriptMessages: [],
      currentQuestionCount: 0
    }, {
      headers: { Authorization: `Bearer ${token}` }
    });

    console.log('Result:', res.data);

  } catch (err) {
    if (err.response) {
      console.error('API Error:', err.response.status, err.response.data);
    } else {
      console.error('Error:', err);
    }
  }
}

run();
