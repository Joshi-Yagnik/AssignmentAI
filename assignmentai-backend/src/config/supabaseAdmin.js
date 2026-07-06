const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

/**
 * Supabase Admin client — uses the service-role key to bypass RLS.
 * Used ONLY by the background worker; never exposed to users via HTTP routes.
 */
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY || 'placeholder-key',
);

module.exports = supabaseAdmin;
