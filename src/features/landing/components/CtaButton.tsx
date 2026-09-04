import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { clsx } from '@ui';
import styles from './CtaLink.module.css';

export interface CtaButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

/**
 * The action twin of {@link CtaLink} — a real <button> for in-page actions
 * (e.g. smooth-scroll) that must look identical to the navigation CTAs.
 */
export const CtaButton = forwardRef<HTMLButtonElement, CtaButtonProps>(function CtaButton(
  { variant = 'primary', size = 'md', leftIcon, rightIcon, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={clsx(styles.cta, styles[variant], styles[size], className)}
      {...rest}
    >
      {leftIcon && (
        <span className={styles.icon} aria-hidden>
          {leftIcon}
        </span>
      )}
      <span className={styles.label}>{children}</span>
      {rightIcon && (
        <span className={clsx(styles.icon, 'flipInRtl')} aria-hidden>
          {rightIcon}
        </span>
      )}
    </button>
  );
});
