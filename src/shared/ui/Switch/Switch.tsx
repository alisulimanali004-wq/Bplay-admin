import { useId, type ReactNode } from 'react';
import { clsx } from '../clsx';
import styles from './Switch.module.css';

export interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** The visible label. Clicking it toggles the switch. */
  label: string;
  /** Optional one-line explanation under the label. */
  description?: string;
  /** Leading glyph, e.g. the icon of the feature being granted. */
  icon?: ReactNode;
  disabled?: boolean;
  id?: string;
  testId?: string;
}

/**
 * An accessible on/off toggle for a boolean setting (feature flags, entitlements).
 * A real `<input type="checkbox" role="switch">` under the hood, so it is keyboard
 * operable, form-associable and announced correctly; the track/thumb are painted
 * from tokens and flip automatically in RTL (logical properties only).
 */
export function Switch({
  checked,
  onChange,
  label,
  description,
  icon,
  disabled = false,
  id,
  testId,
}: SwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;

  return (
    <div className={clsx(styles.row, disabled && styles.disabled)}>
      {icon && (
        <span className={styles.icon} aria-hidden>
          {icon}
        </span>
      )}
      <label className={styles.text} htmlFor={inputId}>
        <span className={styles.label}>{label}</span>
        {description && <span className={styles.description}>{description}</span>}
      </label>
      <input
        id={inputId}
        type="checkbox"
        role="switch"
        className={styles.input}
        checked={checked}
        disabled={disabled}
        data-testid={testId}
        onChange={(event) => onChange(event.target.checked)}
      />
      <span className={styles.track} aria-hidden>
        <span className={styles.thumb} />
      </span>
    </div>
  );
}
