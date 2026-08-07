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

/**
 * Dynamically generate the next question based on the conversation history.
 */
async function generateNextVivaQuestion(subject, topic, difficulty, transcriptMessages, currentQuestionCount, totalQuestions, assignmentContext = null) {
  if (!GROK_API_KEY) {
    return {
      evaluation_of_last_answer: "Mock evaluation (no API key).",
      next_question: `Mock question ${currentQuestionCount + 1} about ${topic}.`,
      should_end: currentQuestionCount >= totalQuestions
    };
  }

  const assignmentSection = assignmentContext 
    ? `\nAssignment Title: ${assignmentContext.title}\nAssignment Instructions/Content:\n${assignmentContext.instructions || 'No explicit instructions provided. Base questions on the title and topic.'}\n\nCRITICAL INSTRUCTION: You MUST base your questions strictly on the provided Assignment Content. Evaluate the student's answers by matching them against the expected answers or concepts from this specific assignment.`
    : '';

  const prompt = `
You are an expert academic examiner conducting a viva (oral exam) for a student.
Subject: ${subject}
Topic: ${topic}
Target Difficulty Level: ${difficulty}
Current Question Progress: ${currentQuestionCount} out of ${totalQuestions}${assignmentSection}

Here is the conversation history so far:
${JSON.stringify(transcriptMessages, null, 2)}

Task:
1. Briefly evaluate the student's last answer (if any).
2. Generate the NEXT question to ask the student.
   - If the student answered poorly, adjust the difficulty slightly down or ask for clarification.
   - If they answered well, ask a more advanced follow-up or move to the next subtopic.
   - Keep the question concise, spoken-friendly, and engaging.
3. If the Current Question Progress equals or exceeds the Total Questions, set "should_end" to true and provide a brief concluding remark instead of a new question.

Return ONLY a JSON object with these exact keys:
"evaluation_of_last_answer" (string)
"next_question" (string)
"should_end" (boolean)
  `;

  try {
    const response = await axios.post(
      GROK_API_URL,
      {
        messages: [
          { role: 'system', content: 'You are an AI examiner that outputs only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'grok-2-latest',
        temperature: 0.5
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        }
      }
    );
    let content = response.data.choices[0].message.content;
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(content);
  } catch (err) {
    console.error("Grok AI Error (next-question):", err.response?.data || err.message);
    throw new Error('Failed to generate next question');
  }
}

/**
 * Generate a comprehensive final evaluation report for the entire viva session.
 */
async function evaluateVivaSession(subject, topic, transcriptMessages, assignmentContext = null) {
  if (!GROK_API_KEY) {
    return {
      overall_score: 80,
      subject_knowledge_score: 85,
      communication_score: 75,
      confidence_score: 80,
      pronunciation_score: 90,
      strengths: ["Good understanding of basics.", "Clear mock pronunciation."],
      weaknesses: ["Needs deeper detail on advanced topics."],
      topics_to_improve: ["Advanced concepts in " + topic],
      ai_feedback: "Mock feedback since no API key is provided.",
      final_rating: "Good"
    };
  }

  const assignmentSection = assignmentContext 
    ? `\nAssignment Title: ${assignmentContext.title}\nAssignment Instructions/Content:\n${assignmentContext.instructions || 'No explicit instructions.'}\n\nCRITICAL INSTRUCTION: Evaluate the student based strictly on how accurately their verbal answers match the expected answers/concepts from the provided Assignment Content.`
    : '';

  const prompt = `
You are an expert academic examiner. The viva examination has concluded.
Subject: ${subject}
Topic: ${topic}${assignmentSection}

Conversation Transcript:
${JSON.stringify(transcriptMessages, null, 2)}

Task:
Evaluate the student's overall performance based on the transcript.
Generate a comprehensive JSON report containing the following metrics (scores out of 100):
- overall_score (integer)
- subject_knowledge_score (integer)
- communication_score (integer)
- confidence_score (integer)
- pronunciation_score (integer) (estimate based on transcript clarity, assuming speech-to-text was used)
- strengths (array of strings, max 3)
- weaknesses (array of strings, max 3)
- topics_to_improve (array of strings, max 3)
- ai_feedback (string, a paragraph summarizing the performance)
- final_rating (string, e.g., "Excellent", "Good", "Average", "Poor")

Return ONLY valid JSON with these exact keys.
  `;

  try {
    const response = await axios.post(
      GROK_API_URL,
      {
        messages: [
          { role: 'system', content: 'You are an AI examiner that outputs only valid JSON.' },
          { role: 'user', content: prompt }
        ],
        model: 'grok-2-latest',
        temperature: 0.2
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROK_API_KEY}`
        }
      }
    );
    let content = response.data.choices[0].message.content;
    content = content.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(content);
  } catch (err) {
    console.error("Grok AI Error (evaluate):", err.response?.data || err.message);
    throw new Error('Failed to evaluate viva session');
  }
}

module.exports = {
  compareVivaWithSubmission,
  generateNextVivaQuestion,
  evaluateVivaSession
};
