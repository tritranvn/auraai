// This file should be placed in the `api` directory at the root of your project.

// Using `any` for req/res types to avoid needing `@vercel/node` dependency
// in this simple project setup.
// Vercel will correctly interpret this as a serverless function.

interface GeminiResponsePart {
  inline_data?: {
    mime_type: string;
    data: string;
  };
  text?: string;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).end(`Method ${req.method} Not Allowed`);
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
    
    // Correct request body for the gemini-2.5-flash-image-preview model using snake_case
    const geminiRequestBody = {
      contents: [{
        parts: [
          { inline_data: { mime_type: mimeType, data: imageBase64 } }, // Use snake_case
          { text: prompt }
        ]
      }],
      // This config is required for the image model to return an image
      generation_config: {
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

    const data = await geminiResponse.json();

    if (!geminiResponse.ok) {
      console.error('Google Gemini API Error:', data);
      return res.status(geminiResponse.status).json({ error: `Failed to communicate with the AI model. Details: ${data?.error?.message || 'Unknown error'}` });
    }

    if (!data.candidates || data.candidates.length === 0) {
      console.error('No candidates in Gemini response:', data);
      return res.status(500).json({ error: 'The AI did not return any results.' });
    }

    const candidate = data.candidates[0];
    let imageUrl: string | null = null;
    let text: string | null = null;

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts as GeminiResponsePart[]) {
        if (part.inline_data) { // Use snake_case
          imageUrl = `data:${part.inline_data.mime_type};base64,${part.inline_data.data}`;
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
    res.status(500).json({ error: 'An internal server error occurred.' });
  }
}
