import type { EditedImageResult } from '../types';

// Helper to convert a file to a base64 string
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            // Get the part after 'base64,'
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error('Failed to convert file to base64.'));
        }
    };
    reader.onerror = error => reject(error);
  });
};

export const editImageWithGemini = async (imageFile: File, prompt: string): Promise<EditedImageResult> => {
  try {
    const imageBase64 = await fileToBase64(imageFile);

    const response = await fetch('/api/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt,
        imageBase64,
        mimeType: imageFile.type,
      }),
    });

    const result = await response.json();

    if (!response.ok) {
        // Map specific backend errors to translation keys for the UI.
        if (result.error?.includes('configuration error')) {
            throw new Error('error_env_var_not_set');
        }
        throw new Error('error_gemini_communication');
    }
    
    // The serverless function now returns data in the exact format the app needs.
    return result as EditedImageResult;

  } catch (error) {
    console.error("Error in editImageWithGemini:", error);
    // Re-throw the error so the UI component can catch it and display a translated message.
    if (error instanceof Error) {
        throw error;
    }
    throw new Error("error_unknown");
  }
};