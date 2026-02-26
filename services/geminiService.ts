import { GoogleGenAI } from "@google/genai";

const getAiClient = () => {
  const apiKey =
    import.meta.env.VITE_GEMINI_API_KEY ||
    import.meta.env.GEMINI_API_KEY;

  if (!apiKey || apiKey === "PLACEHOLDER_API_KEY") {
    throw new Error(
      "Gemini API key is missing. Set VITE_GEMINI_API_KEY in .env.local."
    );
  }

  return new GoogleGenAI({ apiKey });
};

async function urlToBase64(url: string): Promise<{ mimeType: string; data: string } | null> {
  // If already base64 data URI
  if (url.startsWith('data:')) {
      const [meta, data] = url.split(',');
      const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/png';
      return { mimeType, data };
  }
  
  // If http/https URL, try to fetch it
  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        const [meta, data] = base64String.split(',');
        const mimeType = meta.match(/:(.*?);/)?.[1] || 'image/png';
        resolve({ mimeType, data });
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.warn("Could not convert image URL to base64, proceeding with text only:", error);
    return null;
  }
}

export const generatePlotVisualization = async (
  originalImageUrl: string,
  currentDescription: string,
  ideas: string[],
  userPrompt: string,
  style: string = 'Photorealistic',
  aspectRatio: string = '1:1'
): Promise<string> => {
  try {
    const ai = getAiClient();

    // Use an image-capable Gemini model for image editing/generation.
    const primaryModel =
      import.meta.env.VITE_GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const fallbackModel = "gemini-2.5-flash";

    const imageData = await urlToBase64(originalImageUrl);

    let styleInstruction = "Photorealistic, high quality architectural visualization.";
    if (style === 'Sketch') styleInstruction = "Architectural pencil sketch, loose lines, concept art style.";
    if (style === 'Watercolor') styleInstruction = "Soft watercolor painting style, artistic, vibrant.";
    if (style === 'Futuristic') styleInstruction = "Futuristic, sci-fi, neon lights, high-tech urban design.";
    if (style === 'Nature-Takeover') styleInstruction = "Overgrown, solarpunk, nature reclaiming the space, lush greenery.";

    const promptText = `Edit this image to show a transformation of the urban space. 
    CRITICAL: You MUST use the provided image as the base geometry. Keep the perspective, lighting, and main structures (buildings, roads) matching the original image provided EXACTLY.
    The goal is to visualize: ${userPrompt}.
    Context: ${currentDescription.substring(0, 150)}.
    Desired Features: ${ideas.join(', ')}.
    Style: ${styleInstruction}
    Ensure the result seamlessly integrates with the original environment, looking like a realistic renovation or intervention.`;

    const parts: any[] = [];

    // Add image part if available
    if (imageData) {
        parts.push({
            inlineData: {
                mimeType: imageData.mimeType,
                data: imageData.data
            }
        });
    }

    // Add text prompt
    parts.push({ text: promptText });

    let response;
    try {
      response = await ai.models.generateContent({
        model: primaryModel,
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: aspectRatio
          }
        }
      });
    } catch (primaryError: any) {
      const message = String(primaryError?.message || primaryError || "");
      if (!message.includes("NOT_FOUND") && !message.includes("404")) {
        throw primaryError;
      }
      // Fallback to the text+vision flash model if image-specific model is unavailable.
      response = await ai.models.generateContent({
        model: fallbackModel,
        contents: [{ role: "user", parts }],
        config: {
          responseModalities: ["TEXT", "IMAGE"],
          imageConfig: {
            aspectRatio: aspectRatio
          }
        }
      });
    }

    const responseParts = response.candidates?.[0]?.content?.parts;
    
    // Check for image
    if (responseParts) {
        for (const part of responseParts) {
          if (part.inlineData && part.inlineData.data) {
            return `data:${part.inlineData.mimeType || "image/png"};base64,${part.inlineData.data}`;
          }
        }

        // Check if model returned text (often a refusal or clarification)
        const textPart = responseParts.find((p) => p.text);
        if (textPart) {
          console.warn("Model returned text:", textPart.text);
          throw new Error(textPart.text || "Model did not return an image.");
        }
    }

    throw new Error(
      "Generation failed: model returned no image. Check model access and API key permissions."
    );
  } catch (error) {
    console.error("Error generating visualization:", error);
    if (error instanceof Error) {
       throw error; 
    }
    throw new Error("An unexpected error occurred during generation.");
  }
};
