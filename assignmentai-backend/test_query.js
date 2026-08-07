const supabase = require('./src/config/supabaseClient');

async function test() {
  const { data, error } = await supabase
    .from('viva_exam_sessions')
    .select(`
      id, title, status, scheduled_at, duration_minutes, lab_batch, class_name, score_policy,
      users!viva_exam_sessions_teacher_id_fkey(first_name, last_name, email)
    `)
    .limit(1);

  console.log('Data:', data);
  console.log('Error:', error);
}

test();
