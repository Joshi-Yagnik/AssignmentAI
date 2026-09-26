require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcrypt');
const supabaseAdmin = require('./config/supabaseAdmin');

async function createAdmin() {
  try {
    const email = "imbhagya2005@gmail.com";
    const password = "Bhagya@123";
    
    console.log(`Checking if user ${email} exists...`);
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    if (existing) {
      console.log(`User exists. Updating to admin and setting password...`);
      const { error } = await supabaseAdmin
        .from('users')
        .update({
          password_hash: passwordHash,
          role: 'admin'
        })
        .eq('email', email);
      
      if (error) throw error;
      console.log('Admin updated successfully.');
    } else {
      console.log(`User does not exist. Creating...`);
      const { error } = await supabaseAdmin
        .from('users')
        .insert([{
          email,
          password_hash: passwordHash,
          role: 'admin',
          first_name: 'Bhagya',
          last_name: 'Admin'
        }]);
      
      if (error) throw error;
      console.log('Admin created successfully.');
    }
  } catch (err) {
    console.error('Error creating admin:', err);
  }
}

createAdmin();
