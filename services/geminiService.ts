
import { GoogleGenAI, Modality } from "@google/genai";
import type { EditedImageResult } from '../types';

const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result.split(',')[1]);
      } else {
        resolve(''); // Should not happen with readAsDataURL
      }
    };
    reader.readAsDataURL(file);
  });
  
  const base64EncodedData = await base64EncodedDataPromise;
  
  return {
    inlineData: {
      data: base64EncodedData,
      mimeType: file.type,
    },
  };
};

export const editImageWithGemini = async (imageFile: File, prompt: string): Promise<EditedImageResult> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    // This error indicates a server-side configuration problem.
    throw new Error("error_env_var_not_set");
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });

    const imagePart = await fileToGenerativePart(imageFile);
    const textPart = { text: prompt };

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image-preview',
      contents: {
        parts: [imagePart, textPart],
      },
      config: {
        responseModalities: [Modality.IMAGE, Modality.TEXT],
      },
    });

    if (!response.candidates || response.candidates.length === 0) {
      throw new Error("error_no_candidates");
    }

    const candidate = response.candidates[0];
    let imageUrl: string | null = null;
    let text: string | null = null;

    if (candidate?.content?.parts) {
        for (const part of candidate.content.parts) {
          if (part.inlineData) {
            const base64ImageBytes = part.inlineData.data;
            imageUrl = `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
          } else if (part.text) {
            text = part.text;
          }
        }
    } else {
        // This handles cases where the response was blocked or is otherwise empty.
        throw new Error("error_no_candidates");
    }

    if (!imageUrl) {
      throw new Error("error_no_image_in_response");
    }

    return { imageUrl, text };
  } catch (error) {
    console.error("Error editing image with Gemini:", error);
    if (error instanceof Error && (error.message === 'error_no_candidates' || error.message === 'error_no_image_in_response' || error.message === 'error_env_var_not_set')) {
        throw error; // Re-throw custom error keys
    }
    // A more generic error for API communication issues, which can include invalid API keys.
    throw new Error("error_gemini_communication");
  }
};
