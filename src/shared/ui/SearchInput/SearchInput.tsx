import { useEffect, useRef, useState } from 'react';
import { Input } from '../Input/Input';
import { SearchIcon } from '../icons';
import { SEARCH_DEBOUNCE_MS } from '@shared/hooks/useDebounce';

export interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  debounceMs?: number;
  /** Explicit accessible label when the placeholder isn't descriptive enough. */
  ariaLabel?: string;
  testId?: string;
}

export function SearchInput({
  value,
  onChange,
  placeholder,
  debounceMs = SEARCH_DEBOUNCE_MS,
  ariaLabel,
  testId,
}: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const isFirst = useRef(true);

  // Keep in sync if the controlled value changes externally (e.g. "clear filters").
  useEffect(() => {
    setLocal(value);
  }, [value]);

  // Debounce local edits up to the parent.
  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const id = setTimeout(() => onChangeRef.current(local), debounceMs);
    return () => clearTimeout(id);
  }, [local, debounceMs]);

  return (
    <Input
      type="search"
      leftIcon={<SearchIcon />}
      placeholder={placeholder}
      aria-label={ariaLabel ?? placeholder ?? 'Search'}
      value={local}
      onChange={(event) => setLocal(event.target.value)}
      data-testid={testId}
    />
  );
}
