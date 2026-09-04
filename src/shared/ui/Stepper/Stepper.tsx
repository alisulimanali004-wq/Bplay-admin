import { motion, useReducedMotion } from 'framer-motion';
import { CheckIcon } from '../icons';
import { clsx } from '../clsx';
import styles from './Stepper.module.css';

export interface StepperStep {
  key: string;
  label: string;
}

export interface StepperProps {
  steps: StepperStep[];
  activeIndex: number;
  'aria-label'?: string;
}

/**
 * Horizontal wizard progress on a glass rail. Completed nodes fill with the
 * primary mint + CheckIcon, the active node gets a focus ring, and each
 * connector fills as its step is reached (instant under reduced motion).
 * Fully RTL-safe: flex order and the connector fill follow the document
 * direction via logical flow.
 */
export function Stepper({ steps, activeIndex, 'aria-label': ariaLabel }: StepperProps) {
  const reduceMotion = useReducedMotion();

  return (
    <ol className={styles.stepper} aria-label={ariaLabel}>
      {steps.map((step, index) => {
        const isDone = index < activeIndex;
        const isActive = index === activeIndex;
        return (
          <li
            key={step.key}
            className={clsx(styles.item, isDone && styles.done, isActive && styles.active)}
            aria-current={isActive ? 'step' : undefined}
          >
            {index > 0 && (
              <span className={styles.connector} aria-hidden>
                <motion.span
                  className={styles.connectorFill}
                  initial={false}
                  animate={{ width: isDone || isActive ? '100%' : '0%' }}
                  transition={
                    reduceMotion ? { duration: 0 } : { duration: 0.35, ease: 'easeOut' }
                  }
                />
              </span>
            )}
            <span className={styles.step}>
              <span className={styles.node} aria-hidden>
                {isDone ? <CheckIcon /> : index + 1}
              </span>
              <span className={styles.label}>{step.label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}
