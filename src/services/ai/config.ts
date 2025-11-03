// src/services/ai/config.ts

export const AI_PROVIDERS = {
  OLLAMA: 'ollama',
  GEMINI: 'gemini',
  GROQ: 'groq',
} as const;

export type AIProvider = typeof AI_PROVIDERS[keyof typeof AI_PROVIDERS];

export const config = {
  // Provider ativo (definido por variável de ambiente)
  activeProvider: (import.meta.env.VITE_AI_PROVIDER || AI_PROVIDERS.GEMINI) as AIProvider,

  // Configurações do Ollama (Local)
  ollama: {
    baseUrl: import.meta.env.VITE_OLLAMA_URL || 'http://localhost:11434',
    model: import.meta.env.VITE_OLLAMA_MODEL || 'llama3.2',
    options: {
      temperature: 0.3,
      num_predict: 500, // Descrições curtas
    },
  },

  // Configurações do Gemini (Cloud)
  gemini: {
    apiKey: import.meta.env.VITE_GEMINI_API_KEY || '',
    model: import.meta.env.VITE_GEMINI_MODEL || 'gemini-2.0-flash-exp',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/models',
    options: {
      temperature: 0.3,
      maxOutputTokens: 500, // Descrições curtas
    },
  },

  // Configurações do Groq (Cloud - Ultra Fast)
  groq: {
    apiKey: import.meta.env.VITE_GROQ_API_KEY || '',
    model: import.meta.env.VITE_GROQ_MODEL || 'llama3-8b-8192',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    options: {
      temperature: 0.3,
      max_tokens: 500, // Descrições curtas
    },
  },
};
