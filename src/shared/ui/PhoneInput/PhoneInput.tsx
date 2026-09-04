import { forwardRef, type InputHTMLAttributes } from 'react';
import { clsx } from '../clsx';
import { SyrianFlag } from '../SyrianFlag/SyrianFlag';
import styles from './PhoneInput.module.css';

export interface PhoneInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** The 9-digit local part only (e.g. 988324051) — callers prepend 963 on submit. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

/**
 * Syrian phone field: a fixed, non-editable +963 prefix chip (flag + code) and an
 * editable 9-digit local part (digits only, capped at 9). The bound value is the
 * 9-digit local string; the api layer prepends the 963 country code on submit.
 * Always LTR regardless of page direction, since the number reads left-to-right.
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { value, onChange, invalid, className, disabled, placeholder = '9XXXXXXXX', ...rest },
  ref,
) {
  return (
    <div
      dir="ltr"
      className={clsx(styles.wrap, invalid && styles.invalid, disabled && styles.disabled, className)}
      aria-invalid={invalid || undefined}
    >
      <span className={styles.prefix}>
        <SyrianFlag className={styles.flag} />
        <span className={styles.code}>+963</span>
      </span>
      <input
        ref={ref}
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        dir="ltr"
        disabled={disabled}
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 9))}
        maxLength={9}
        className={styles.input}
        {...rest}
      />
    </div>
  );
});

/**
 * Reduce any stored phone to the 9-digit local part the field edits — drops
 * non-digits and a leading 963 country code (and any legacy leading 0). Used to
 * seed the field when editing an existing admin (whose phone is stored as 963...).
 */
export function toLocalPhone(phone?: string | null): string {
  const digits = (phone ?? '').replace(/\D/g, '');
  const local = digits.startsWith('963') ? digits.slice(3) : digits;
  return local.replace(/^0+/, '').slice(-9);
}
