import type { SVGProps } from 'react';
import styles from './SyrianFlag.module.css';
import { clsx } from '../clsx';

/**
 * The Syrian flag (2025) — green / white / black tricolour with three red stars.
 * Flag colours are fixed national constants, so the raw hexes live here as a
 * sanctioned brand asset (like BrandMark and the leaflet pins) rather than tokens.
 * Purely decorative — always paired with a text label, so it is aria-hidden.
 */
const STAR = 'M0,-1.9 L0.43,-0.59 L1.81,-0.59 L0.69,0.22 L1.12,1.54 L0,0.73 L-1.12,1.54 L-0.69,0.22 L-1.81,-0.59 L-0.43,-0.59 Z';

export function SyrianFlag({ className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 16"
      className={clsx(styles.flag, className)}
      role="img"
      aria-hidden
      {...props}
    >
      <rect x="0" y="0" width="24" height="5.334" fill="#007A3D" />
      <rect x="0" y="5.334" width="24" height="5.333" fill="#FFFFFF" />
      <rect x="0" y="10.667" width="24" height="5.333" fill="#000000" />
      <g fill="#CE1126">
        <path d={STAR} transform="translate(6 8)" />
        <path d={STAR} transform="translate(12 8)" />
        <path d={STAR} transform="translate(18 8)" />
      </g>
    </svg>
  );
}
