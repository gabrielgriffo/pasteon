// src/services/ai/config.ts

export const AI_PROVIDERS = {
  OLLAMA: 'ollama',
  GEMINI: 'gemini',
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
};
