// src/utils/toast.ts

import { toast as sonnerToast } from 'sonner';

/**
 * Toast helper functions para padronizar mensagens do sistema
 */
export const toast = {
  /**
   * Toast de sucesso (verde)
   */
  success: (message: string, description?: string) => {
    return sonnerToast.success(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * Toast de erro (vermelho)
   */
  error: (message: string, description?: string) => {
    return sonnerToast.error(message, {
      description,
      duration: 4000,
    });
  },

  /**
   * Toast informativo (azul)
   */
  info: (message: string, description?: string) => {
    return sonnerToast.info(message, {
      description,
      duration: 3000,
    });
  },

  /**
   * Toast de aviso (amarelo)
   */
  warning: (message: string, description?: string) => {
    return sonnerToast.warning(message, {
      description,
      duration: 3500,
    });
  },

  /**
   * Toast com loading/promise
   */
  promise: <T,>(
    promise: Promise<T>,
    messages: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: any) => string);
    }
  ) => {
    return sonnerToast.promise(promise, messages);
  },

  /**
   * Toast customizado
   */
  custom: (message: string, options?: Parameters<typeof sonnerToast>[1]) => {
    return sonnerToast(message, options);
  },
};
