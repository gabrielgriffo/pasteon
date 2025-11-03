// src/services/aiSettingsService.ts

import { supabase } from '@/lib/supabase';
import type { AIProvider } from '@/services/ai/AIService';

export interface AIProviderSettings {
  id: string;
  provider: AIProvider;
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
};

/**
 * Retorna a data atual no formato YYYY-MM-DD
 */
function getCurrentDay(): string {
  const now = new Date();
  return now.toISOString().split('T')[0];
}

/**
 * Retorna o minuto atual em timestamp
 */
function getCurrentMinute(): number {
  const now = new Date();
  now.setSeconds(0, 0);
  return now.getTime();
}

/**
 * Converte settings do banco para RateLimitConfig
 */
function toRateLimitConfig(settings: AIProviderSettings): RateLimitConfig {
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
}

/**
 * Carrega as configurações de um provider do banco
 */
export async function loadProviderSettings(provider: AIProvider): Promise<RateLimitConfig> {
  try {
    const { data, error } = await supabase
      .from('ai_provider_settings')
      .select('*')
      .eq('provider', provider)
      .single();

    if (error) throw error;
    if (!data) return DEFAULT_SETTINGS[provider];

    return toRateLimitConfig(data);
  } catch (error) {
    console.warn(`Erro ao carregar settings de ${provider}, usando defaults:`, error);
    return DEFAULT_SETTINGS[provider];
  }
}

/**
 * Salva as configurações de um provider no banco
 */
export async function saveProviderSettings(
  provider: AIProvider,
  config: RateLimitConfig
): Promise<void> {
  try {
    const { error } = await supabase
      .from('ai_provider_settings')
      .upsert({
        provider,
        rpm_enabled: config.rpmEnabled,
        rpm_limit: config.rpmLimit,
        current_rpm: config.currentRpm,
        last_reset_minute: config.lastResetMinute,
        rpd_enabled: config.rpdEnabled,
        rpd_limit: config.rpdLimit,
        current_rpd: config.currentRpd,
        last_reset_day: config.lastResetDay,
        updated_at: new Date().toISOString(),
      });

    if (error) throw error;
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

  // Reset do contador de dia se mudou de dia
  if (config.lastResetDay !== currentDay) {
    config.currentRpd = 0;
    config.lastResetDay = currentDay;
    updated = true;
  }

  // Reset do contador de minuto se mudou de minuto
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

  // Verifica RPD primeiro (mais crítico)
  if (config.rpdEnabled && config.currentRpd >= config.rpdLimit) {
    return {
      canMakeRequest: false,
      reason: 'rpd_limit',
      waitTimeMs: 0,
    };
  }

  // Verifica RPM
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
