import { useTranslation } from 'react-i18next';
import { resolveErrorMessage } from '@shared/lib/errorMessage';

/**
 * Turn any thrown error into a message a user can act on, re-resolved when the
 * language changes. Returns undefined when there is no error, so the result can
 * go straight into `<Alert>` / `<Field error>`.
 */
export function useErrorMessage(error: unknown): string | undefined {
  const { t } = useTranslation();
  return resolveErrorMessage(error, t);
}
