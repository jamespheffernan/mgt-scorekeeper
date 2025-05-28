import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import express from 'express';
import fetch from 'node-fetch'; // Or use built-in fetch in Node 18+
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001; // Use a port different from your React app

// Middleware
app.use(cors()); // Enable CORS for all routes (customize as needed for production)
app.use(express.json({ limit: '10mb' })); // To parse JSON request bodies, increased limit for base64 image

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_API_URL_BASE = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// API Endpoint to process scorecard
app.post('/api/process-scorecard', async (req, res) => {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key not configured on server.');
    return res.status(500).json({ error: 'API key not configured on server. Please check server environment variables.' });
  }

  const { prompt, imageBase64, mimeType, generationConfig: clientGenerationConfig } = req.body;

  if (!imageBase64 || !mimeType || !prompt) {
    return res.status(400).json({ error: 'Missing required fields: prompt, imageBase64, mimeType.' });
  }

  const completeGeminiApiUrl = `${GEMINI_API_URL_BASE}?key=${GEMINI_API_KEY}`;

  // Default generationConfig, can be overridden by client if needed
  const defaultGenerationConfig = {
    responseMimeType: "application/json",
    responseSchema: {
      type: "OBJECT",
      properties: {
        course_name: { type: "STRING", description: "The official name of the golf course." },
        played_on_date: { type: "STRING", description: "The date the game was played, if available on the scorecard, in YYYY-MM-DD format." },
        holes: {
          type: "ARRAY",
          description: "An array of all holes listed on the scorecard, typically 1 to 18.",
          items: {
            type: "OBJECT",
            properties: {
              hole_number: { type: "NUMBER", description: "The specific hole number (e.g., 1, 9, 18)." },
              par: { type: "NUMBER", description: "The par value for this hole." },
              stroke_index: { type: "NUMBER", description: "The stroke index (handicap) for this hole." },
              // Add other per-hole fields you expect, e.g., yards, player scores if they are part of this initial extraction
            },
            required: ["hole_number"] // Par and stroke_index might be optional if not always present
          }
        },
        // Add other top-level fields you expect, e.g., player_names array, total_score
      },
      required: ["holes"] // Course name might be optional if not always present
    }
  };

  const generationConfig = clientGenerationConfig || defaultGenerationConfig;


  const payload = {
    contents: [
      {
        role: "user",
        parts: [
          { text: prompt },
          {
            inlineData: {
              mimeType: mimeType,
              data: imageBase64
            }
          }
        ]
      }
    ],
    generationConfig: generationConfig
  };

  console.log('Sending payload to Gemini API:', JSON.stringify(payload, null, 2)); // Log the payload for debugging

  try {
    const geminiResponse = await fetch(completeGeminiApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const responseBodyText = await geminiResponse.text(); // Read body as text first for better error diagnosis
    console.log('Gemini API Status:', geminiResponse.status);
    console.log('Gemini API Response Body Text:', responseBodyText);


    if (!geminiResponse.ok) {
      let errorData;
      try {
        errorData = JSON.parse(responseBodyText); // Try to parse as JSON
      } catch (e) {
        // If not JSON, use the raw text
        errorData = { error: { message: responseBodyText || 'Unknown API error format.' }};
      }
      console.error('Gemini API Error:', errorData);
      return res.status(geminiResponse.status).json({
        error: `Gemini API request failed: ${errorData?.error?.message || 'Unknown API error'}`,
        details: errorData?.error?.details
      });
    }

    const result = JSON.parse(responseBodyText); // Now parse as JSON, assuming it's OK
    console.log('Successfully received and parsed response from Gemini API.');
    res.json(result);

  } catch (error) {
    console.error('Proxy Server Error:', error);
    res.status(500).json({ error: `Proxy server error: ${error.message}` });
  }
});

// Basic root route to check if server is running
app.get('/', (req, res) => {
  res.send('Gemini OCR Proxy Server is running!');
});

app.listen(PORT, () => {
  console.log(`Proxy server running on http://localhost:${PORT}`);
  if (!GEMINI_API_KEY) {
    console.warn('WARNING: GEMINI_API_KEY is not set in the environment. The /api/process-scorecard endpoint will not function.');
  }
}); 