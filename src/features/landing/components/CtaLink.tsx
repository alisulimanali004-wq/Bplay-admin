import { forwardRef, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { clsx } from '@ui';
import styles from './CtaLink.module.css';

export interface CtaLinkProps extends Omit<LinkProps, 'className'> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'md' | 'lg';
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
}

/**
 * A marketing CTA styled in the app's brand language but rendered as a real
 * router <Link> (correct semantics for navigation). Shares its stylesheet with
 * {@link CtaButton} so link- and action-CTAs stay pixel-identical.
 */
export const CtaLink = forwardRef<HTMLAnchorElement, CtaLinkProps>(function CtaLink(
  { variant = 'primary', size = 'md', leftIcon, rightIcon, className, children, ...rest },
  ref,
) {
  return (
    <Link ref={ref} className={clsx(styles.cta, styles[variant], styles[size], className)} {...rest}>
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
    </Link>
  );
});
