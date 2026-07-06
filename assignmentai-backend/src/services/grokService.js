const axios = require('axios');

const GROK_API_URL = 'https://api.x.ai/v1/chat/completions';
const GROK_API_KEY = process.env.GROK_API_KEY;

async function compareVivaWithSubmission(vivaTranscript, writtenSubmissionText) {
  if (!GROK_API_KEY) {
    console.warn("GROK_API_KEY not found. Returning mock comparison.");
    return {
      integrity_score: 85,
      rationale: "Mock rationale: The student's spoken answers closely align with the written submission concepts."
    };
  }

  const prompt = `
You are an academic integrity AI assistant. 
Compare the student's written submission text with the live spoken transcript from their Viva examination.
Written Submission: "${writtenSubmissionText}"
Live Viva Transcript: "${vivaTranscript}"

Determine an integrity score from 0 to 100 based on how well the spoken answers demonstrate the knowledge shown in the written text. 
Return ONLY a JSON object with two keys:
"integrity_score" (number)
"rationale" (string, max 3 sentences)
  `;

  try {
    const response = await axios.post(
      GROK_API_URL,
      {
        messages: [
          { role: 'system', content: 'You are a helpful academic AI assistant that outputs only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'grok-beta',
        temperature: 0.1
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        }
      }
    );

    let content = response.data.choices[0].message.content;
    // Strip markdown formatting if any
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(content);
  } catch (err) {
    console.error("Grok API Error:", err.response?.data || err.message);
    throw new Error('Failed to run AI integrity comparison');
  }
}

module.exports = {
  compareVivaWithSubmission
};
