require('dotenv').config();
const supabaseAdmin = require('./config/supabaseAdmin');

async function run() {
  const buckets = ['question-papers', 'answer-keys', 'submissions', 'study-materials'];

  for (const name of buckets) {
    const { data, error } = await supabaseAdmin.storage.updateBucket(name, {
      allowedMimeTypes: null, // Allow all
      fileSizeLimit: 52428800, // 50MB just in case
    });
    if (error) {
      console.error(`Failed to update ${name}:`, error.message);
    } else {
      console.log(`Updated bucket ${name}`);
    }
  }
}
run();
