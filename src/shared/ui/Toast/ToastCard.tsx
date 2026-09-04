import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { IconButton } from '../IconButton/IconButton';
import { AlertTriangleIcon, CheckIcon, InfoIcon, XIcon } from '../icons';
import { clsx } from '../clsx';
import { TOAST_DURATION_MS, type ToastItem, type ToastVariant } from './toast';
import styles from './Toaster.module.css';

const VARIANT_ICON: Record<ToastVariant, typeof CheckIcon> = {
  success: CheckIcon,
  error: XIcon,
  warning: AlertTriangleIcon,
  info: InfoIcon,
};

/** Release past this horizontal offset (px) OR flick velocity dismisses the toast. */
const SWIPE_OFFSET = 90;
const SWIPE_VELOCITY = 400;

interface ToastCardProps {
  toast: ToastItem;
  onDismiss: (id: number) => void;
}

/**
 * One live toast: swipe horizontally (or press ✕) to dismiss, auto-dismisses after
 * TOAST_DURATION_MS with a slim countdown bar that pauses while the user hovers,
 * focuses, or drags. Enter/exit + drag are spring-animated and reduced-motion aware.
 */
export function ToastCard({ toast, onDismiss }: ToastCardProps) {
  const { t } = useTranslation();
  const reduce = useReducedMotion();
  const Icon = VARIANT_ICON[toast.variant];

  // Pause the countdown while the user is reading (hover/focus) or dragging.
  const [hovering, setHovering] = useState(false);
  const [focused, setFocused] = useState(false);
  const [dragging, setDragging] = useState(false);
  const paused = hovering || focused || dragging;

  const dismiss = useCallback(() => onDismiss(toast.id), [onDismiss, toast.id]);

  // Pausable timer: banks the elapsed time whenever it stops, resumes with the remainder.
  const remainingRef = useRef(TOAST_DURATION_MS);
  useEffect(() => {
    if (paused) return;
    const startedAt = Date.now();
    const timer = window.setTimeout(dismiss, remainingRef.current);
    return () => {
      window.clearTimeout(timer);
      remainingRef.current -= Date.now() - startedAt;
    };
  }, [paused, dismiss]);

  return (
    <motion.div
      className={clsx(styles.toast, styles[toast.variant], paused && styles.paused)}
      data-testid={`toast-${toast.variant}`}
      drag="x"
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.5}
      dragMomentum={false}
      onDragStart={() => setDragging(true)}
      onDragEnd={(_, info) => {
        setDragging(false);
        if (Math.abs(info.offset.x) > SWIPE_OFFSET || Math.abs(info.velocity.x) > SWIPE_VELOCITY) {
          dismiss();
        }
      }}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocused(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setFocused(false);
      }}
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.96 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
      exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.9, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 520, damping: 40, mass: 0.9 }}
    >
      <span className={styles.accent} aria-hidden />
      <span className={styles.iconChip} aria-hidden>
        <Icon />
      </span>
      <span className={styles.message}>{toast.message}</span>
      <IconButton
        className={styles.close}
        variant="ghost"
        size="sm"
        label={t('common.dismiss')}
        icon={<XIcon />}
        onClick={dismiss}
        // Pressing ✕ must not start a drag on the card.
        onPointerDownCapture={(e) => e.stopPropagation()}
      />
      {!reduce && <span className={styles.progress} aria-hidden />}
    </motion.div>
  );
}
