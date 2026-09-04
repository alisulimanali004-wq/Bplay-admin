import { useEffect, useState } from 'react';

/** Canonical search debounce. Do not override without a justifying comment. */
export const SEARCH_DEBOUNCE_MS = 300;

export function useDebounce<T>(value: T, delay: number = SEARCH_DEBOUNCE_MS): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}
