const Quiz = require('../models/Quiz');

// Simple in-memory cache for Q&A pairs (caching common queries)
const qaCache = new Map();

// Helper to check if OpenAI or Gemini is properly configured
const isAIConfigured =
  (process.env.OPENAI_API_KEY &&
    process.env.OPENAI_API_KEY !== 'your_openai_api_key' &&
    process.env.OPENAI_API_KEY !== 'mock_openai_api_key') ||
  (process.env.GEMINI_API_KEY &&
    process.env.GEMINI_API_KEY !== 'your_gemini_api_key' &&
    process.env.GEMINI_API_KEY !== 'mock_gemini_api_key');

/**
 * Ask a question about a lecture's transcript.
 * @param {string} lectureId - The lecture ID
 * @param {string} lectureTitle - The lecture title
 * @param {string} transcript - The lecture transcript text
 * @param {string} question - The user's question
 * @returns {Promise<string>} - The AI response
 */
const askLectureAssistant = async (lectureId, lectureTitle, transcript, question) => {
  const cacheKey = `${lectureId}:${question.toLowerCase().trim()}`;
  if (qaCache.has(cacheKey)) {
    console.log('Serving AI answer from cache...');
    return qaCache.get(cacheKey);
  }

  let answer = '';

  if (isAIConfigured) {
    try {
      const systemPrompt = `You are a helpful e-learning assistant for the course lecture titled "${lectureTitle}".
Answer the student's question based strictly on the provided lecture transcript below. 
If the question cannot be answered using only this transcript, respond with a helpful answer using general web development knowledge, but start with the prefix: "[Not verified against video transcript] ".

Lecture Transcript:
"""
${transcript || '(No transcript available for this lecture)'}
"""`;

      const usingGemini = !!process.env.GEMINI_API_KEY;
      const url = usingGemini
        ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const apiKey = usingGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
      const model = usingGemini ? 'gemini-3.5-flash' : 'gpt-3.5-turbo';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: question },
          ],
          temperature: 0.5,
          max_tokens: 500,
        }),
      });

      const data = await response.json();
      if (data.choices && data.choices.length > 0) {
        answer = data.choices[0].message.content.trim();
      } else {
        throw new Error('Empty response from OpenAI API');
      }
    } catch (error) {
      console.error('Real AI API call failed, falling back to local simulation:', error.message);
      answer = generateMockAIAnswer(lectureTitle, transcript, question);
    }
  } else {
    // Generate simulated/mock AI response
    answer = generateMockAIAnswer(lectureTitle, transcript, question);
  }

  // Cache answer
  qaCache.set(cacheKey, answer);
  return answer;
};

/**
 * Generate a multiple-choice practice quiz for a chapter based on its lecture transcripts.
 * @param {string} chapterId - Chapter ID
 * @param {string} chapterTitle - Chapter title
 * @param {Array<Object>} lectures - Array of lecture objects in this chapter
 * @returns {Promise<Object>} - The Quiz model record
 */
const generateChapterQuiz = async (chapterId, chapterTitle, lectures) => {
  // Check if quiz already exists
  let quiz = await Quiz.findOne({ chapterId });
  if (quiz) return quiz;

  let questions = [];

  // Gather all transcripts
  const transcriptsText = lectures
    .map((l) => `Lecture: ${l.title}\nTranscript: ${l.transcript || ''}`)
    .join('\n\n');

  if (isAIConfigured) {
    try {
      const prompt = `You are a curriculum designer. Generate a 5-question multiple-choice practice quiz for a chapter titled "${chapterTitle}" based on these lecture transcripts:
"""
${transcriptsText}
"""

Return your response strictly as a JSON array of objects. Do not include markdown codeblocks or any additional text.
Each question object must follow this JSON schema:
{
  "questionText": "What is ...?",
  "options": ["Option A", "Option B", "Option C", "Option D"],
  "correctOptionIndex": 0,
  "explanation": "Brief explanation of why this option is correct."
}`;

      const usingGemini = !!process.env.GEMINI_API_KEY;
      const url = usingGemini
        ? 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions'
        : 'https://api.openai.com/v1/chat/completions';
      const apiKey = usingGemini ? process.env.GEMINI_API_KEY : process.env.OPENAI_API_KEY;
      const model = usingGemini ? 'gemini-3.5-flash' : 'gpt-3.5-turbo';

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      });

      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Clean potential JSON markdown blocks
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      questions = JSON.parse(cleanJson);
    } catch (error) {
      console.error('Real Quiz Generation failed, creating smart offline quiz:', error.message);
      questions = generateMockQuizQuestions(chapterTitle, lectures);
    }
  } else {
    questions = generateMockQuizQuestions(chapterTitle, lectures);
  }

  // Save the generated quiz to database
  quiz = await Quiz.create({
    chapterId,
    questions,
  });

  return quiz;
};

// --- Fallback Local Semantic Generators ---

const generateMockAIAnswer = (title, transcript, question) => {
  const query = question.toLowerCase();
  
  if (!transcript) {
    return `[Not verified against video transcript] This answer is compiled from general e-learning knowledge, as no transcript was found for this lecture. Regarding your question: "${question}", in MERN development, this is typically handled by creating clean modular architectures, configuring Cors policy on Express backend, and setting up appropriate state handling in React.`;
  }

  // Basic local semantic search (scanning transcript for matches)
  const sentences = transcript.split(/[.!?]+/);
  const matchingSentences = sentences.filter((s) =>
    query.split(' ').some((word) => word.length > 4 && s.toLowerCase().includes(word))
  );

  if (matchingSentences.length > 0) {
    return `[AI Video Assistant]: Based on the video content, the instructor mentions: "${matchingSentences[0].trim()}." Additionally, this aligns with industry standards for "${title}" where proper database setups and error routing prevent application crashes.`;
  }

  return `[AI Video Assistant]: In this lecture, "${title}", the instructor covers the overall implementation workflow. Regarding your query about "${question}", the recommended practice is to check your mongoose schema validations, configure environment keys securely, and verify HTTP status codes on responses.`;
};

const generateMockQuizQuestions = (chapterTitle, lectures) => {
  // Generate generic smart MCQs based on chapter title keywords
  const title = chapterTitle.toLowerCase();
  
  if (title.includes('mongoose') || title.includes('models') || title.includes('database')) {
    return [
      {
        questionText: 'What Mongoose method hashes a password before saving it to MongoDB?',
        options: ['pre-save hook', 'post-save hook', 'schema.validator', 'bcrypt.hash() directly in controller'],
        correctOptionIndex: 0,
        explanation: 'Mongoose pre-save hooks intercept model save events, allowing developers to hash sensitive attributes securely before persistence.',
      },
      {
        questionText: 'Which option represents a valid compound unique index in Mongoose?',
        options: ['schema.index({ field1: 1, field2: 1 }, { unique: true })', 'schema.addIndex()', 'mongoose.compoundIndex()', 'schema.field.unique = true'],
        correctOptionIndex: 0,
        explanation: 'Compound unique indexes are defined on schemas using schema.index() with fields listed in order and { unique: true } configuration.',
      },
      {
        questionText: 'What happens by default if select: false is specified in a schema attribute?',
        options: ['The field cannot be updated', 'The field is excluded from query outputs unless explicitly selected', 'The field is encrypted', 'The field is deleted'],
        correctOptionIndex: 1,
        explanation: 'Setting select: false instructs Mongoose to omit the attribute from find queries, preserving security for fields like password hashes.',
      },
      {
        questionText: 'Which package is commonly used as a Mongoose database connector in Node.js?',
        options: ['mongoose', 'mysql2', 'pg', 'redis'],
        correctOptionIndex: 0,
        explanation: 'Mongoose is the standard MongoDB Object Document Mapper (ODM) for Node.js environments.',
      },
      {
        questionText: 'How can you validate that a number is non-negative in a Mongoose schema?',
        options: ['min: 0 validation rule', 'max: 0 validation rule', 'positive: true key', 'negative: false key'],
        correctOptionIndex: 0,
        explanation: 'The min validation property enforces that any numerical inputs remain at or above the designated threshold (e.g. 0).',
      },
    ];
  }

  // Default fallback quiz
  return [
    {
      questionText: 'What is the main advantage of creating separate clients and servers in full-stack setups?',
      options: ['Clean separation of concerns', 'Slower deployments', 'Exposing environment keys', 'Harder debugging'],
      correctOptionIndex: 0,
      explanation: 'Separating client (UI representation) and server (business calculations) establishes clean boundaries, improving modularity and deployment workflows.',
    },
    {
      questionText: 'How are unlisted YouTube video IDs typically integrated into web players?',
      options: ['Embedded via iframe or react-youtube component', 'Downloaded locally', 'Uploaded directly to MongoDB', 'Converted to PDFs'],
      correctOptionIndex: 0,
      explanation: 'Unlisted YouTube content is securely streamed and rendered using HTML iframes or packages like react-youtube.',
    },
    {
      questionText: 'Which environment file is used to store sensitive API credentials locally?',
      options: ['.env file', 'package.json', 'README.md', 'DECISIONS.md'],
      correctOptionIndex: 0,
      explanation: 'The .env file manages local configurations and API credentials, keeping secrets out of public version control repositories.',
    },
    {
      questionText: 'Which HTTP status code corresponds to a validation error?',
      options: ['400 Bad Request', '401 Unauthorized', '403 Forbidden', '500 Server Error'],
      correctOptionIndex: 0,
      explanation: '400 Bad Request indicates that the server cannot process the request due to client validation issues.',
    },
    {
      questionText: 'How do you structure responses consistently across REST API routes?',
      options: ['Wrap outputs in a standard JSON wrapper', 'Return raw strings', 'Return HTML text directly', 'Response formatting is unnecessary'],
      correctOptionIndex: 0,
      explanation: 'A standardized wrapper like { success: true, data: {} } improves predictability for client-side API integrations.',
    },
  ];
};

module.exports = {
  askLectureAssistant,
  generateChapterQuiz,
};
