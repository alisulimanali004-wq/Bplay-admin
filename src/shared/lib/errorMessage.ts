import i18n from '@shared/i18n';
import { errorMessageKey, isAppError } from './errors';

/** Minimal shape of i18next's `t` — keeps this file free of a react-i18next import. */
export type TranslateFn = (key: string, options?: { defaultValue?: string }) => string;

/**
 * The one implementation that turns a thrown error into user-facing text.
 *
 * Order: a translated message for a known backend code → the server's own
 * message → a generic fallback. Passing `t` in keeps this pure, so the React
 * hook and the non-React global toast share exactly one behaviour.
 */
export function resolveErrorMessage(error: unknown, t: TranslateFn): string | undefined {
  if (!error) return undefined;

  const serverMessage = isAppError(error) ? error.message : (error as Error)?.message;
  const fallback = serverMessage || t('common.loadError');
  const key = errorMessageKey(error);

  return key ? t(key, { defaultValue: fallback }) : fallback;
}

/** For callers outside React (the global query/mutation error toasts). */
export function translateError(error: unknown): string {
  return resolveErrorMessage(error, (key, options) => i18n.t(key, options)) ?? '';
}
