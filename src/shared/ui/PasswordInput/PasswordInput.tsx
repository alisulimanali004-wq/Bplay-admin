import { forwardRef, useState } from 'react';
import { clsx } from '../clsx';
import { Input, type InputProps } from '../Input/Input';
import { EyeIcon, EyeOffIcon } from '../icons';
import styles from './PasswordInput.module.css';

export interface PasswordInputProps extends Omit<InputProps, 'type' | 'leftIcon'> {
  /** Toggle aria-label while the password is hidden (click reveals it). */
  showLabel?: string;
  /** Toggle aria-label while the password is visible (click hides it). */
  hideLabel?: string;
  /** Controlled visibility (e.g. reveal after generating a suggestion). */
  visible?: boolean;
  onVisibleChange?: (visible: boolean) => void;
}

/**
 * A password Input with a reveal/hide eye toggle. Wraps the base Input so it
 * inherits every field style, and forwards its ref so react-hook-form's
 * `register` binds to the underlying <input>. Visibility is uncontrolled by
 * default; pass `visible`/`onVisibleChange` to drive it (e.g. reveal a
 * just-generated password).
 */
export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(function PasswordInput(
  { className, showLabel = 'Show password', hideLabel = 'Hide password', visible, onVisibleChange, ...rest },
  ref,
) {
  const [internal, setInternal] = useState(false);
  const shown = visible ?? internal;

  const toggle = () => {
    const next = !shown;
    if (visible === undefined) setInternal(next);
    onVisibleChange?.(next);
  };

  return (
    <span className={styles.wrap}>
      <Input
        ref={ref}
        type={shown ? 'text' : 'password'}
        className={clsx(styles.input, className)}
        {...rest}
      />
      <button
        type="button"
        className={styles.toggle}
        onClick={toggle}
        aria-label={shown ? hideLabel : showLabel}
        aria-pressed={shown}
      >
        {shown ? <EyeOffIcon /> : <EyeIcon />}
      </button>
    </span>
  );
});
