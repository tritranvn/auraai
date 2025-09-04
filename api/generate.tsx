// This file should be placed in the `api` directory at the root of your project.
import type { VercelRequest, VercelResponse } from '@vercel/node';

interface GeminiResponsePart {
  inlineData?: {
    mimeType: string;
    data: string;
  };
  text?: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error('API_KEY environment variable is not set');
    // Send a specific error message the frontend can use for translation
    return res.status(500).json({ error: 'Application configuration error: API key is missing.' });
  }

  try {
    const { prompt, imageBase64, mimeType } = req.body;

    if (!prompt || !imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing required fields: prompt, imageBase64, mimeType' });
    }
    
    // This is the correct, complete request body for the nano-banana model.
    // It includes the mandatory `generation_config` to specify image output.
    const geminiRequestBody = {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } },
          { text: prompt }
        ]
      }],
      generation_config: {
        // This tells the model to return an image. It is a required field.
        response_modalities: ["IMAGE", "TEXT"] 
      }
    };

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(geminiRequestBody),
      }
    );

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error('Google Gemini API Error:', errorText);
      try {
        // Try to parse the error from Google, it's often JSON
        const errorJson = JSON.parse(errorText);
        return res.status(geminiResponse.status).json({ error: 'Failed to communicate with the AI model.', details: errorJson });
      } catch (e) {
        // If it's not JSON, return the raw text
        return res.status(geminiResponse.status).json({ error: 'Failed to communicate with the AI model.', details: errorText });
      }
    }

    const data = await geminiResponse.json();

    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in Gemini response:', data);
      return res.status(500).json({ error: 'The AI did not return any results.' });
    }

    const candidate = data.candidates[0];
    let imageUrl: string | null = null;
    let text: string | null = null;

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts as GeminiResponsePart[]) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          text = part.text;
        }
      }
    }

    if (!imageUrl) {
      console.error('No image in Gemini response parts:', data);
      return res.status(500).json({ error: 'The AI response did not contain an image.' });
    }

    // Return the structured data the frontend expects
    res.status(200).json({ imageUrl, text });
  } catch (error) {
    console.error('Error in /api/generate route:', error);
    const message = error instanceof Error ? error.message : 'An unknown error occurred';
    res.status(500).json({ error: 'An internal server error occurred.', details: message });
  }
}
