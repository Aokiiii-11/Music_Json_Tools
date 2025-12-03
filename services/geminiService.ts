import { GoogleGenAI, GenerateContentResponse, Chat } from "@google/genai";
import { ApiSettings, ApiProvider } from "../types";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const getNestedValue = (obj: any, path: string): any => {
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
};

const callCustomApi = async (prompt: string, settings: ApiSettings): Promise<string> => {
  const { customUrl, customMethod, customHeaders, customBodyTemplate, customResponsePath } = settings;
  
  // 1. Prepare Headers
  let headers = {};
  try {
    headers = JSON.parse(customHeaders);
  } catch (e) {
    throw new Error("Invalid Custom Headers format. Must be valid JSON.");
  }

  // 2. Prepare Body
  // We assume the user placed {{prompt}} where the content should go.
  // To keep JSON valid, we JSON.stringify the prompt, which gives "quoted string".
  // If the user's template is "query": {{prompt}}, replacing {{prompt}} with "text" works.
  // If the user's template is "query": "{{prompt}}", we need to be careful.
  
  // Robust Strategy: Replace {{prompt}} with the JSON-escaped string content WITHOUT surrounding quotes,
  // assuming the user provided the surrounding quotes in the template? 
  // OR, simply replace {{prompt}} with JSON.stringify(prompt) and assume user did NOT quote it.
  
  // Let's assume the user puts: "content": {{prompt}}  <-- this is the safest assumption for JSON injection.
  // So {{prompt}} becomes "The prompt text..." including the quotes.
  
  // However, often textareas act as raw strings.
  // Let's try to replace `{{prompt}}` with the safely escaped string representation of the prompt.
  const escapedPrompt = JSON.stringify(prompt); // This includes start/end quotes: "prompt..."
  
  let bodyStr = customBodyTemplate;
  
  // Check if template has quotes around the placeholder like "{{prompt}}"
  // If so, we should remove the quotes from our escaped string or the template.
  if (bodyStr.includes('"{{prompt}}"')) {
     // User wrote "key": "{{prompt}}". 
     // escapedPrompt is "text". 
     // We want "key": "text".
     // So we replace "{{prompt}}" with escapedPrompt.
     bodyStr = bodyStr.replace('"{{prompt}}"', escapedPrompt);
  } else {
     // User wrote "key": {{prompt}}.
     // We replace {{prompt}} with escapedPrompt.
     bodyStr = bodyStr.replace('{{prompt}}', escapedPrompt);
  }

  // 3. Fetch
  const response = await fetch(customUrl, {
    method: customMethod,
    headers: headers,
    body: customMethod === 'POST' ? bodyStr : undefined,
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Custom API Error (${response.status}): ${errText}`);
  }

  const json = await response.json();
  
  // 4. Extract Response
  const resultText = getNestedValue(json, customResponsePath);
  
  if (typeof resultText !== 'string') {
    console.warn("Response extracted:", resultText);
    throw new Error(`Could not find string at path '${customResponsePath}' in response.`);
  }

  return resultText;
};

export const translateJson = async (jsonData: any, customPrompt?: string, apiSettings?: ApiSettings): Promise<any> => {
  const modelId = 'gemini-3-pro-preview';
  
  const defaultSystemInstruction = `
    你是翻译专家，并且是音乐爱好者，你会讲输入的各个国家的语言、音乐描述、术语、歌词等音乐信息准确的翻译成中文。
    
    RULES:
    1. Keep the JSON structure exactly the same. Do not change keys.
    2. For every string value that is English text, translate it to Chinese.
    3. Format the final value as "Original English Value | Chinese Translation".
    4. If the value is empty, keep it empty.
    5. If the value is a number or technical ID (like UUID), keep it as is.
    6. Ensure music terminology is accurate (e.g., "Verse", "Chorus", "BPM", "Chord Progression").
    
    Example:
    Input: { "description": "High energy rock song" }
    Output: { "description": "High energy rock song | 高能量摇滚歌曲" }
  `;

  const systemInstruction = customPrompt || defaultSystemInstruction;

  // Minify JSON
  const jsonString = JSON.stringify(jsonData);
  
  // Construct the full prompt content
  // Note: For Gemini SDK we pass systemInstruction separately.
  // For Custom API, we usually need to combine them.
  const fullPromptForCustom = `${systemInstruction}\n\nTask: Please translate the following JSON:\n\n\`\`\`json\n${jsonString}\n\`\`\``;
  
  // For Gemini SDK, we use just the user prompt
  const geminiUserPrompt = `Please translate the following JSON:\n\n\`\`\`json\n${jsonString}\n\`\`\``;

  let lastError;
  const maxRetries = 3;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      let text = "";

      if (apiSettings && apiSettings.provider === ApiProvider.CUSTOM) {
        text = await callCustomApi(fullPromptForCustom, apiSettings);
      } else {
        // Default Gemini
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: modelId,
          contents: geminiUserPrompt,
          config: {
            systemInstruction: systemInstruction,
            responseMimeType: "application/json",
          }
        });
        text = response.text || "";
      }

      if (!text) throw new Error("No response text received");

      // Robust JSON Extraction
      let cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
      const jsonMatch = cleanText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
          cleanText = jsonMatch[0];
      }

      return JSON.parse(cleanText);

    } catch (error: any) {
      console.warn(`Translation attempt ${attempt} failed:`, error);
      lastError = error;
      if (attempt === maxRetries) break;
      await delay(1000 * Math.pow(2, attempt));
    }
  }
  
  throw lastError || new Error("Translation failed after multiple attempts");
};

export const createChatSession = (contextData?: any): Chat => {
  const contextString = contextData ? JSON.stringify(contextData).substring(0, 10000) : "No specific file loaded.";
  
  return ai.chats.create({
    model: 'gemini-3-pro-preview',
    config: {
      systemInstruction: `You are an intelligent assistant for a Music JSON Translation tool. 
      Users are editing a JSON file containing music analysis data.
      
      Current File Context (Truncated):
      ${contextString}
      
      Help the user with:
      1. Explaining music terminology (BPM, Timbre, Chord Progressions).
      2. Suggesting better translations for specific terms.
      3. Validating the JSON structure.
      `,
    },
  });
};

export const sendMessage = async (chat: Chat, message: string): Promise<string> => {
  const response: GenerateContentResponse = await chat.sendMessage({ message });
  return response.text || "I couldn't generate a response.";
};