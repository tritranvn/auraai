// This file should be placed in the `api` directory at the root of your project.

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Modality } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error('API_KEY environment variable is not set on Vercel.');
    // Send a specific error message the frontend can use for translation
    return res.status(500).json({ error: 'Application configuration error: API key is missing.' });
  }

  try {
    const { prompt, imageBase64, mimeType } = req.body;

    if (!prompt || !imageBase64 || !mimeType) {
      return res.status(400).json({ error: 'Missing required fields: prompt, imageBase64, mimeType' });
    }
    
    // Initialize the official Google AI SDK
    const ai = new GoogleGenAI({ apiKey });

    // Prepare the image and text parts for the multimodal request
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: mimeType,
      },
    };
    const textPart = { text: prompt };

    // Call the Gemini API using the SDK
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: { parts: [imagePart, textPart] },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      console.error('No candidates in Gemini response:', response);
      return res.status(500).json({ error: 'The AI did not return any results.' });
    }
    
    // Extract the image and text from the response
    const candidate = response.candidates[0];
    let imageUrl: string | null = null;
    let text: string | null = null;

    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData) {
          imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        } else if (part.text) {
          text = part.text;
        }
      }
    }

    if (!imageUrl) {
      console.error('No image in Gemini response parts:', response);
      return res.status(500).json({ error: 'The AI response did not contain an image.' });
    }
    
    // Return the structured data the frontend expects
    res.status(200).json({ imageUrl, text });

  } catch (error) {
    console.error('Error in /api/generate route:', error);
    const errorMessage = error instanceof Error ? error.message : 'An internal server error occurred.';
    res.status(500).json({ error: errorMessage });
  }
}
