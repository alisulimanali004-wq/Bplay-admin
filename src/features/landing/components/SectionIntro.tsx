import { motion } from 'framer-motion';
import { clsx } from '@ui';
import { fadeUp, staggerContainer, revealOnce } from './landingShared';
import styles from './SectionIntro.module.css';

export interface SectionIntroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  align?: 'center' | 'start';
}

/** Shared eyebrow + heading + subtitle block used by every content section. */
export function SectionIntro({ eyebrow, title, subtitle, align = 'center' }: SectionIntroProps) {
  return (
    <motion.div
      className={clsx(styles.intro, align === 'start' && styles.start)}
      variants={staggerContainer}
      {...revealOnce}
    >
      {eyebrow && (
        <motion.span className={styles.eyebrow} variants={fadeUp}>
          {eyebrow}
        </motion.span>
      )}
      <motion.h2 className={styles.title} variants={fadeUp}>
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p className={styles.subtitle} variants={fadeUp}>
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
}
