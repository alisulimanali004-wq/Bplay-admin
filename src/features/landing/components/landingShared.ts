import type { Variants } from 'framer-motion';

/**
 * One motion language across every landing section. Entrance transforms are
 * neutralized automatically under reduced-motion because the page is wrapped in
 * <MotionConfig reducedMotion="user"> — only the opacity fade remains.
 */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
  },
};

/** Parent variant that reveals its children in a gentle staggered sequence. */
export const staggerContainer: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

/** Reveal-on-scroll props — fires once, slightly before the block is fully in view. */
export const revealOnce = {
  initial: 'hidden',
  whileInView: 'visible',
  viewport: { once: true, margin: '-80px' },
} as const;

/** Smooth-scroll to an in-page section, honoring the user's reduced-motion setting. */
export function scrollToSection(id: string): void {
  const el = document.getElementById(id);
  if (!el) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}
