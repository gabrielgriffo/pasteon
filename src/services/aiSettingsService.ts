// src/services/aiSettingsService.ts

import { supabase } from '@/lib/supabase';
import type { AIProvider } from '@/services/ai/config';

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
      .maybeSingle(); // Usa maybeSingle() ao invés de single() para não dar erro se não existir

    if (error) throw error;
    if (!data) {
      // Primeira vez usando este provider, retorna defaults silenciosamente
      return DEFAULT_SETTINGS[provider];
    }

    return toRateLimitConfig(data as AIProviderSettings);
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
      .upsert(
        {
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
        },
        {
          onConflict: 'provider', // Especifica a coluna de conflito
          ignoreDuplicates: false, // Atualiza se existir
        }
      );

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

/**
 * Retorna o provider atualmente ativo do banco de dados
 */
export async function getActiveProvider(): Promise<AIProvider> {
  try {
    const { data, error } = await supabase
      .from('ai_provider_settings')
      .select('provider')
      .eq('is_active', true)
      .maybeSingle();

    if (error) throw error;

    if (data) {
      return data.provider as AIProvider;
    }

    // Fallback para .env se não encontrar no banco
    return (import.meta.env.VITE_AI_PROVIDER || 'gemini') as AIProvider;
  } catch (error) {
    console.warn('Erro ao carregar provider ativo do banco, usando .env:', error);
    return (import.meta.env.VITE_AI_PROVIDER || 'gemini') as AIProvider;
  }
}

/**
 * Define um provider como ativo (desativa os outros automaticamente)
 */
export async function setActiveProvider(provider: AIProvider): Promise<void> {
  try {
    // 1. Desativa todos os providers
    await supabase
      .from('ai_provider_settings')
      .update({ is_active: false })
      .neq('provider', '__none__'); // Atualiza todos (workaround para "update all")

    // 2. Ativa o provider selecionado (cria se não existir)
    const defaults = DEFAULT_SETTINGS[provider];
    const { error } = await supabase
      .from('ai_provider_settings')
      .upsert(
        {
          provider,
          is_active: true,
          rpm_enabled: defaults.rpmEnabled,
          rpm_limit: defaults.rpmLimit,
          current_rpm: defaults.currentRpm,
          last_reset_minute: defaults.lastResetMinute,
          rpd_enabled: defaults.rpdEnabled,
          rpd_limit: defaults.rpdLimit,
          current_rpd: defaults.currentRpd,
          last_reset_day: defaults.lastResetDay,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'provider',
          ignoreDuplicates: false,
        }
      );

    if (error) throw error;
  } catch (error) {
    console.error(`Erro ao definir provider ativo (${provider}):`, error);
    throw error;
  }
}
