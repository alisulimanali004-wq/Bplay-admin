import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { clsx } from '../clsx';
import { ChevronDownIcon, CheckIcon } from '../icons';
import styles from './Select.module.css';

export interface SelectOption {
  label: string;
  value: string;
  /**
   * Render indented, as a child of the option above it.
   *
   * Purely presentational — an indented option is still selectable and still
   * occupies one slot in `options`, so `activeIndex`, arrow-key navigation and
   * `commit()` need no special cases. A separate non-selectable header row was
   * the other way to show hierarchy, but it printed the parent's name twice:
   * once as the heading and again as the row that selects the whole parent.
   */
  indent?: boolean;
}

export interface SelectProps {
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  name?: string;
  className?: string;
  'aria-label'?: string;
}

/**
 * A fully-themed, accessible listbox (not a native <select>) so the dropdown
 * matches the dark Pitch-Forest theme. Keyboard + aria supported; the menu is
 * portaled to <body> and positioned to the trigger so it never clips in modals.
 */
export function Select({
  value,
  onChange,
  onBlur,
  options,
  placeholder,
  disabled = false,
  id,
  name,
  className,
  'aria-label': ariaLabel,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const selected = options.find((option) => option.value === value);

  const close = () => {
    setOpen(false);
    onBlur?.();
  };

  const openMenu = () => {
    if (triggerRef.current) setRect(triggerRef.current.getBoundingClientRect());
    setActiveIndex(Math.max(0, options.findIndex((option) => option.value === value)));
    setOpen(true);
  };

  const commit = (index: number) => {
    const option = options[index];
    if (option) onChange(option.value);
    close();
  };

  // Close on outside click, scroll, or resize (menu position is fixed to the trigger).
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current?.contains(target) && !listRef.current?.contains(target)) close();
    };
    const onReflow = (event: Event) => {
      // Scrolling INSIDE the menu must not close it — only an ancestor/page scroll
      // (which would detach the fixed-positioned menu from its trigger) should.
      if (event.type === 'scroll' && listRef.current?.contains(event.target as Node)) return;
      close();
    };
    document.addEventListener('mousedown', onPointerDown);
    window.addEventListener('scroll', onReflow, true);
    window.addEventListener('resize', onReflow);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('scroll', onReflow, true);
      window.removeEventListener('resize', onReflow);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (!open) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(event.key)) {
        event.preventDefault();
        openMenu();
      }
      return;
    }
    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'ArrowDown':
        event.preventDefault();
        setActiveIndex((i) => Math.min(options.length - 1, i + 1));
        break;
      case 'ArrowUp':
        event.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (activeIndex >= 0) commit(activeIndex);
        break;
      case 'Tab':
        close();
        break;
      default:
        break;
    }
  };

  return (
    <div ref={rootRef} className={clsx(styles.wrap, className)}>
      <button
        ref={triggerRef}
        type="button"
        id={id}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={styles.trigger}
        onClick={() => (open ? close() : openMenu())}
        onKeyDown={onKeyDown}
      >
        <span className={clsx(styles.value, !selected && styles.placeholder)}>
          {selected ? selected.label : (placeholder ?? '')}
        </span>
        <ChevronDownIcon className={clsx(styles.chevron, open && styles.chevronOpen)} />
      </button>

      {open &&
        rect &&
        createPortal(
          <ul
            ref={listRef}
            id={listId}
            role="listbox"
            aria-label={ariaLabel}
            className={styles.list}
            style={{ top: rect.bottom + 4, left: rect.left, width: rect.width }}
          >
            {options.map((option, index) => (
              <li
                key={option.value}
                role="option"
                aria-selected={option.value === value}
                className={clsx(
                  styles.option,
                  option.indent && styles.optionNested,
                  index === activeIndex && styles.optionActive,
                )}
                onMouseEnter={() => setActiveIndex(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  commit(index);
                }}
              >
                <span className={styles.optionLabel}>{option.label}</span>
                {option.value === value && <CheckIcon className={styles.check} />}
              </li>
            ))}
          </ul>,
          document.body,
        )}

      {name && <input type="hidden" name={name} value={value ?? ''} readOnly />}
    </div>
  );
}
