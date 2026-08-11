const axios = require('axios');
async function run() {
  try {
    const res = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'iiimbhagya2005@gmail.com',
      password: 'admin123',
      role: 'admin'
    });
    console.log('Login success:', res.data);
  } catch (err) {
    console.error('Login failed:', err.response ? err.response.data : err.message);
  }
}
run();