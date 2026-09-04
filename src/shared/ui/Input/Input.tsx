import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';
import { clsx } from '../clsx';
import styles from './Input.module.css';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { leftIcon, className, ...rest },
  ref,
) {
  if (leftIcon) {
    return (
      <span className={styles.wrap}>
        <span className={styles.leftIcon}>{leftIcon}</span>
        <input ref={ref} className={clsx(styles.input, styles.hasIcon, className)} {...rest} />
      </span>
    );
  }
  return <input ref={ref} className={clsx(styles.input, className)} {...rest} />;
});
