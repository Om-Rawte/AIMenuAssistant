// ai.js
// AI translation and recommendation helpers for customer web app

// AI Provider selection
let currentProvider = 'openai'; // Default to OpenAI

const OPENAI_API_KEY = window.OPENAI_API_KEY || import.meta.env.VITE_OPENAI_API_KEY || '';
const DEEPSEEK_API_KEY = window.DEEPSEEK_API_KEY || import.meta.env.VITE_DEEPSEEK_API_KEY || '';
const GOOGLE_TRANSLATE_API_KEY = window.GOOGLE_TRANSLATE_API_KEY || import.meta.env.VITE_GOOGLE_TRANSLATE_API_KEY || '';

// Translate text to target language using OpenAI, Deepseek, or Google Translate
export async function translateText(text, targetLanguage) {
  if (targetLanguage === 'en') return text;
  
  try {
    // Get API key from secure storage or use development key
    const apiKey = await getSecureAPIKey(currentProvider);
    
    const prompt = `Translate the following text to ${targetLanguage}. Only return the translated text, nothing else: "${text}"`;
    
    let translatedText;
    if (currentProvider === 'openai') {
      translatedText = await callOpenAI(prompt, apiKey);
    } else {
      translatedText = await callDeepseek(prompt, apiKey);
    }
    
    return translatedText.trim();
  } catch (error) {
    console.error('Translation error:', error);
    return text; // Fallback to original text
  }
}

// Get AI recommendations (upsells, bundles, etc.)
export async function getAIRecommendations(context, language) {
  try {
    const apiKey = await getSecureAPIKey(currentProvider);
    
    const prompt = `
    You are an intelligent restaurant assistant. Based on the following context, provide personalized recommendations to enhance the customer's dining experience.
    
    Context: ${context}
    Customer Language: ${language}
    
    Please provide:
    1. Personalized dish recommendations based on time of day, weather, and menu popularity
    2. Complementary item suggestions
    3. Special occasion recommendations if applicable
    4. Seasonal or local event-based suggestions
    
    Respond in ${language} and keep it friendly, helpful, and concise.
    `;
    
    let recommendations;
    if (currentProvider === 'openai') {
      recommendations = await callOpenAI(prompt, apiKey);
    } else {
      recommendations = await callDeepseek(prompt, apiKey);
    }
    
    return recommendations.trim();
  } catch (error) {
    console.error('AI recommendations error:', error);
    return `Welcome! I'm here to help you discover our delicious menu. Feel free to ask me about our specialties, recommendations, or any dietary preferences you have.`;
  }
}

// Get AI chat response
export async function getAIChatResponse(context, language) {
  try {
    const apiKey = await getSecureAPIKey(currentProvider);
    if (!apiKey) {
        return "Sorry, the AI assistant is currently unavailable.";
    }

    const prompt = `
    You are an intelligent, friendly, and helpful restaurant assistant chatbot.
    Your personality is witty and charming.
    You are speaking to a customer who is looking at a menu.
    Your goal is to answer their questions about the menu items, help them choose, and provide a delightful experience.
    NEVER suggest items not on the menu.
    Keep your responses concise and conversational.

    MENU CONTEXT:
    ${context}
    
    Respond in ${language}.
    `;
    
    let response;
    if (currentProvider === 'openai') {
      response = await callOpenAI(prompt, apiKey);
    } else {
      response = await callDeepseek(prompt, apiKey);
    }
    
    return response.trim();
  } catch (error) {
    console.error('AI chat error:', error);
    throw error; // Re-throw to be caught by the UI
  }
}

// Detect language (optional, for auto-language selection)
export async function detectLanguage(text) {
  // Example: Google Translate API
  if (GOOGLE_TRANSLATE_API_KEY) {
    const url = `https://translation.googleapis.com/language/translate/v2/detect?key=${GOOGLE_TRANSLATE_API_KEY}`;
    const body = { q: text };
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const data = await res.json();
    return data.data.detections[0][0].language;
  }
  // Add OpenAI/Deepseek detection if needed
  return 'en';
}

// MARK: - API Calls
async function callOpenAI(prompt, apiKey) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: 'You are a helpful restaurant assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

async function callDeepseek(prompt, apiKey) {
  const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a helpful restaurant assistant.' },
        { role: 'user', content: prompt }
      ],
      max_tokens: 300,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    throw new Error(`Deepseek API error: ${response.status}`);
  }
  
  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

// MARK: - Secure API Key Management
async function getSecureAPIKey(provider) {
  try {
    const storedKey = localStorage.getItem(`secure_${provider}_key`);
    if (storedKey) {
      return atob(storedKey);
    }
    console.warn("No local API key found. A key must be provided for AI features to work.");
    return '';
  } catch (error) {
    console.error('Error getting API key:', error);
    return '';
  }
}

// MARK: - Provider Management
export function setAIProvider(provider) {
  currentProvider = provider;
  localStorage.setItem('ai_provider', provider);
}

export function getAIProvider() {
  return localStorage.getItem('ai_provider') || 'openai';
}

// MARK: - Key Validation
export async function validateAPIKey(apiKey, provider) {
  try {
    const testPrompt = 'Hello';
    let isValid = false;
    
    if (provider === 'openai') {
      await callOpenAI(testPrompt, apiKey);
      isValid = true;
    } else if (provider === 'deepseek') {
      await callDeepseek(testPrompt, apiKey);
      isValid = true;
    }
    
    return { isValid, error: null };
  } catch (error) {
    return { isValid: false, error: error.message };
  }
}

// MARK: - Secure Key Storage
export function storeSecureAPIKey(apiKey, provider) {
  try {
    // Simple encryption (in production, use more robust encryption)
    const encryptedKey = btoa(apiKey);
    localStorage.setItem(`secure_${provider}_key`, encryptedKey);
    return true;
  } catch (error) {
    console.error('Error storing API key:', error);
    return false;
  }
}

export function removeSecureAPIKey(provider) {
  try {
    localStorage.removeItem(`secure_${provider}_key`);
    return true;
  } catch (error) {
    console.error('Error removing API key:', error);
    return false;
  }
}

// Initialize provider from storage
currentProvider = getAIProvider(); 