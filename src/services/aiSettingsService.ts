import type { AIProvider } from '@/services/ai/config';

// Use /api which will be proxied by Vite to the backend
const API_BASE_URL = '/api';

export interface AIProviderSettings {
  id: string;
  provider: AIProvider;
  is_active: boolean;
  rpm_enabled: boolean;
  rpm_limit: number;
  current_rpm: number;
  last_reset_minute: number;
  rpd_enabled: boolean;
  rpd_limit: number;
  current_rpd: number;
  last_reset_day: string;
  created_at: string;
  updated_at: string;
}

export interface RateLimitConfig {
  rpmEnabled: boolean;
  rpmLimit: number;
  currentRpm: number;
  lastResetMinute: number;
  rpdEnabled: boolean;
  rpdLimit: number;
  currentRpd: number;
  lastResetDay: string;
}

// Defaults por provider (caso o banco falhe)
const DEFAULT_SETTINGS: Record<AIProvider, RateLimitConfig> = {
  ollama: {
    rpmEnabled: false,
    rpmLimit: 0,
    currentRpm: 0,
    lastResetMinute: Date.now(),
    rpdEnabled: false,
    rpdLimit: 0,
    currentRpd: 0,
    lastResetDay: getCurrentDay(),
  },
  gemini: {
    rpmEnabled: true,
    rpmLimit: 10,
    currentRpm: 0,
    lastResetMinute: Date.now(),
    rpdEnabled: true,
    rpdLimit: 50,
    currentRpd: 0,
    lastResetDay: getCurrentDay(),
  },
  groq: {
    rpmEnabled: true,
    rpmLimit: 30,
    currentRpm: 0,
    lastResetMinute: Date.now(),
    rpdEnabled: true,
    rpdLimit: 14400,
    currentRpd: 0,
    lastResetDay: getCurrentDay(),
  },
  openrouter: {
    rpmEnabled: true,
    rpmLimit: 20,
    currentRpm: 0,
    lastResetMinute: Date.now(),
    rpdEnabled: true,
    rpdLimit: 200,
    currentRpd: 0,
    lastResetDay: getCurrentDay(),
  },
};

function getCurrentDay(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

function getCurrentMinute(): number {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.getTime();
}

/**
 * Carrega as configurações de um provider do banco via API
 */
export async function loadProviderSettings(provider: AIProvider): Promise<RateLimitConfig> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-settings/${provider}`);

    if (response.status === 404) {
      // First time using this provider
      return DEFAULT_SETTINGS[provider];
    }

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const settings = await response.json();

    return {
      rpmEnabled: settings.rpm_enabled,
      rpmLimit: settings.rpm_limit,
      currentRpm: settings.current_rpm,
      lastResetMinute: settings.last_reset_minute,
      rpdEnabled: settings.rpd_enabled,
      rpdLimit: settings.rpd_limit,
      currentRpd: settings.current_rpd,
      lastResetDay: settings.last_reset_day,
    };
  } catch (error) {
    console.warn(`Erro ao carregar settings de ${provider}, usando defaults:`, error);
    return DEFAULT_SETTINGS[provider];
  }
}

/**
 * Salva as configurações de um provider no banco via API
 */
export async function saveProviderSettings(
  provider: AIProvider,
  config: RateLimitConfig
): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/ai-settings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        provider,
        requests_per_minute: config.rpmEnabled ? config.rpmLimit : null,
        requests_per_day: config.rpdEnabled ? config.rpdLimit : null,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
  } catch (error) {
    console.error(`Erro ao salvar settings de ${provider}:`, error);
    throw error;
  }
}

/**
 * Reseta os contadores se necessário (minuto ou dia mudou)
 */
async function resetCountersIfNeeded(provider: AIProvider): Promise<RateLimitConfig> {
  const config = await loadProviderSettings(provider);
  const currentDay = getCurrentDay();
  const currentMinute = getCurrentMinute();
  let updated = false;

  if (config.lastResetDay !== currentDay) {
    config.currentRpd = 0;
    config.lastResetDay = currentDay;
    updated = true;
  }

  if (config.lastResetMinute !== currentMinute) {
    config.currentRpm = 0;
    config.lastResetMinute = currentMinute;
    updated = true;
  }

  if (updated) {
    await saveProviderSettings(provider, config);
  }

  return config;
}

/**
 * Incrementa os contadores de requisições
 */
export async function incrementRequestCount(provider: AIProvider): Promise<void> {
  const config = await resetCountersIfNeeded(provider);
  config.currentRpm += 1;
  config.currentRpd += 1;
  await saveProviderSettings(provider, config);
}

/**
 * Verifica se pode fazer uma requisição
 */
export async function canMakeRequest(provider: AIProvider): Promise<{
  canMakeRequest: boolean;
  reason: 'rpm_limit' | 'rpd_limit' | 'ok';
  waitTimeMs: number;
}> {
  const config = await resetCountersIfNeeded(provider);

  if (config.rpdEnabled && config.currentRpd >= config.rpdLimit) {
    return {
      canMakeRequest: false,
      reason: 'rpd_limit',
      waitTimeMs: 0,
    };
  }

  if (config.rpmEnabled && config.currentRpm >= config.rpmLimit) {
    const now = Date.now();
    const nextMinute = config.lastResetMinute + 60000;
    const waitTimeMs = Math.max(0, nextMinute - now);

    return {
      canMakeRequest: false,
      reason: 'rpm_limit',
      waitTimeMs,
    };
  }

  return {
    canMakeRequest: true,
    reason: 'ok',
    waitTimeMs: 0,
  };
}

/**
 * Retorna quantas requisições restam para RPM e RPD
 */
export async function getRemainingRequests(provider: AIProvider): Promise<{
  rpm: { current: number; limit: number; remaining: number };
  rpd: { current: number; limit: number; remaining: number };
}> {
  const config = await resetCountersIfNeeded(provider);

  return {
    rpm: {
      current: config.currentRpm,
      limit: config.rpmLimit,
      remaining: config.rpmEnabled ? Math.max(0, config.rpmLimit - config.currentRpm) : Infinity,
    },
    rpd: {
      current: config.currentRpd,
      limit: config.rpdLimit,
      remaining: config.rpdEnabled ? Math.max(0, config.rpdLimit - config.currentRpd) : Infinity,
    },
  };
}

/**
 * Reset manual dos contadores
 */
export async function resetCounters(provider: AIProvider): Promise<void> {
  const config = await loadProviderSettings(provider);
  config.currentRpm = 0;
  config.currentRpd = 0;
  config.lastResetMinute = getCurrentMinute();
  config.lastResetDay = getCurrentDay();
  await saveProviderSettings(provider, config);
}

/**
 * Obtém os defaults de um provider
 */
export function getDefaultSettings(provider: AIProvider): RateLimitConfig {
  return DEFAULT_SETTINGS[provider];
}

/**
 * Retorna o provider atualmente ativo (usa apenas .env por enquanto)
 */
export async function getActiveProvider(): Promise<AIProvider> {
  return (import.meta.env.VITE_AI_PROVIDER || 'gemini') as AIProvider;
}

/**
 * Define um provider como ativo (usa apenas .env por enquanto)
 */
export async function setActiveProvider(provider: AIProvider): Promise<void> {
  console.log(`Active provider set to: ${provider} (via .env)`);
}
