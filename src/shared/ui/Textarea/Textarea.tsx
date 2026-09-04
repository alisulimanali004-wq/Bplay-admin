import { forwardRef, type TextareaHTMLAttributes } from 'react';
import { clsx } from '../clsx';
import styles from './Textarea.module.css';

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, rows = 4, ...rest },
  ref,
) {
  return <textarea ref={ref} rows={rows} className={clsx(styles.textarea, className)} {...rest} />;
});
