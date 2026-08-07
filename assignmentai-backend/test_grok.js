require('dotenv').config();
const axios = require('axios');

async function run() {
  try {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        messages: [
          { role: 'system', content: 'You are an AI examiner that outputs only valid JSON.' },
          { role: 'user', content: 'test' }
        ],
        model: 'grok-4.5',
        temperature: 0.5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.GROK_API_KEY}`
        }
      }
    );
    console.log('Success!', response.data);
  } catch (err) {
    console.log('Error:', err.response?.data || err.message);
  }
}
run();
