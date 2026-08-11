require('dotenv').config();
const supabaseAdmin = require('./config/supabaseAdmin');

async function run() {
  const { data: insts } = await supabaseAdmin.from('institutes').select('*');
  console.log('Institutes:', insts);
}
run();
