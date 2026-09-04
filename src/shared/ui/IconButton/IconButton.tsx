import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from '../Spinner/Spinner';
import { clsx } from '../clsx';
import styles from './IconButton.module.css';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: ReactNode;
  /** Required accessible name (icon-only buttons must be labelled). */
  label: string;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'caution';
  size?: 'sm' | 'md' | 'lg';
  /** Swaps the glyph for a spinner and disables the button, exactly like `Button`. */
  isLoading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    label,
    variant = 'ghost',
    size = 'md',
    isLoading = false,
    disabled,
    className,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={clsx(styles.iconBtn, styles[variant], styles[size], className)}
      {...rest}
    >
      {isLoading ? <Spinner size="sm" /> : icon}
    </button>
  );
});
