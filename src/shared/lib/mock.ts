/** Mock-data infrastructure. Toggle with VITE_USE_MOCKS; going live = flip the flag. */
export const USE_MOCKS = import.meta.env.VITE_USE_MOCKS === 'true';

/** Simulate network latency so loading states are exercised realistically. */
export function mockDelay(ms = 450): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
