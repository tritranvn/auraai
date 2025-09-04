// This file should be placed in the `api` directory at the root of your project.

import type { VercelRequest, VercelResponse } from '@vercel/node';

// This is the correct structure for the Google Gemini REST API
// Note the use of snake_case for all properties
interface GeminiRestApiRequest {
  contents: {
    parts: (
      | { text: string }
      | { inline_data: { mime_type: string; data: string } }
    )[];
  }[];
  generation_config: {
    response_modalities: string[];
  };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 1. Basic validation and setup
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error('API_KEY environment variable is not set.');
    return res.status(500).json({ error: 'Application configuration error: API key is missing.' });
  }

  try {
    const { prompt, imageBase64, mimeType } = req.body;
    if (!prompt || !imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing required fields: prompt, imageBase64, or mimeType' });
    }

    // 2. Construct the request body with the correct snake_case format
    const requestBody: GeminiRestApiRequest = {
      contents: [
        {
          parts: [
            {
              inline_data: {
                mime_type: mimeType,
                data: imageBase64,
              },
            },
            { text: prompt },
          ],
        },
      ],
      // The image editing model requires this specific config
      generation_config: {
        response_modalities: ["IMAGE", "TEXT"],
      },
    };

    // 3. Make the API call using fetch
    const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`;

    const geminiResponse = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    const geminiResult = await geminiResponse.json();

    // 4. Handle potential errors from the Gemini API itself
    if (!geminiResponse.ok) {
        console.error('Gemini API Error:', geminiResult);
        const errorText = geminiResult?.error?.message || 'Failed to communicate with the AI model.';
        return res.status(geminiResponse.status).json({ error: errorText });
    }
    
    // 5. Process the successful response
    const candidate = geminiResult.candidates?.[0];
    if (!candidate) {
        console.error('No candidates in Gemini response:', geminiResult);
        return res.status(500).json({ error: 'The AI did not return any results.' });
    }

    let imageUrl: string | null = null;
    let text: string | null = null;

    if (candidate.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inline_data) {
          // Note the snake_case here as well for response parsing
          imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
        } else if (part.text) {
          text = part.text;
        }
      }
    }

    if (!imageUrl) {
        console.error('No image found in Gemini response parts:', candidate.content.parts);
        return res.status(500).json({ error: 'The AI response did not contain an image.' });
    }

    // 6. Send the final, correctly formatted response to the client
    return res.status(200).json({ imageUrl, text });

  } catch (error) {
    console.error('Internal Server Error in /api/generate:', error);
    // This is a catch-all for network errors or JSON parsing failures on our side
    return res.status(500).json({ error: 'An unexpected error occurred on the server.' });
  }
}
