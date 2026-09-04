# 03 — UI Kit: The Shared Primitives Catalog

The design system as code. Every button, input, modal, and table in **bplay-admin** is built from these primitives — not hand-rolled. This file gives the exact TS prop contract, an implementation template, the `*.module.css` sketch (tokens-only), and a usage example for each primitive. Cross-references: tokens live in `styles/tokens.css` (see 02-design-system.md); the data layer that feeds `DataTable` lives in `features/*/api` (see 04-data-layer.md); forms wire `Field`/`Input`/`Select` via RHF+Zod (see 05-state-i18n-forms.md).

## The problem this solves

**Today the app has ZERO shared primitives.** Every feature hand-rolls its own modal (raw `<div>` overlay, no focus trap, no Esc, no `aria`), its own table markup, its own button with inline `style={{...}}` and hardcoded hex, and duplicates the `err?.response?.data?.message` + spinner + "no data" markup in every page. There is no `data-testid`, no keyboard support, no RTL. The result is visual drift, broken accessibility, and copy-paste rot.

**The fix:** one `shared/ui` kit. Build once, reuse everywhere. Every primitive is:

- **Tokens-only** — no hardcoded hex/rgba, no inline `style` objects. CSS Modules read `var(--...)`.
- **Keyboard-accessible** — focusable, Esc/Enter where relevant, `aria-*`, visible focus ring.
- **RTL-safe** — logical properties only (`margin-inline`, `padding-inline`, `inset-inline`, `text-align: start/end`); never `left`/`right`.
- **`forwardRef`** where it wraps a native control (so React Hook Form's `register()` can attach its ref).
- **Testable** — `data-testid` passthrough on interactive nodes.

**Rule:** Reuse these everywhere. To evolve a primitive, add an **optional prop centrally** — never fork a private copy into a feature. A `<button className={styles.btn}>` or a raw `<table>` inside `features/` is a defect.

---

## Catalog

| Primitive | One-liner | Key props |
|---|---|---|
| `Button` | The only button; variants + loading spinner | `variant`, `size`, `isLoading`, `leftIcon`, `fullWidth` |
| `IconButton` | Square icon-only button with required aria label | `icon`, `label`, `variant`, `size` |
| `Field` | Label + hint + `role="alert"` error wrapper | `label`, `error`, `hint`, `required`, `htmlFor` |
| `Input` | Text input (forwardRef, RHF-ready) | `label`, `error`, `hint`, `leftIcon` |
| `Select` | Native select from `options[]` (forwardRef) | `label`, `error`, `options`, `placeholder` |
| `Textarea` | Multiline input (forwardRef) | `label`, `error` |
| `Modal` | Portal dialog: focus-trap + Esc + overlay-close + aria | `isOpen`, `onClose`, `title`, `size`, `footer` |
| `ConfirmDialog` | Modal preset for destructive/confirm actions | `onConfirm`, `title`, `message`, `variant`, `isLoading` |
| `DataTable<T>` | Generic table; loading/error/empty handled inside | `columns`, `data`, `isLoading`, `error`, `onRetry`, `getRowId`, `rowActions` |
| `Badge` | Semantic status pill | `variant`, `size` |
| `Card` | Surface container with padding scale | `padding`, `as` |
| `Alert` | Inline banner, `role="alert"` | `variant`, `title`, `onClose` |
| `Spinner` | Loading indicator with aria label | `size`, `label` |
| `EmptyState` | "Nothing here yet" panel + optional action | `icon`, `title`, `description`, `action` |
| `ErrorState` | Error panel + retry | `title`, `message`, `onRetry` |
| `Pagination` | Page navigation | `page`, `pageCount`, `onPageChange` |
| `SearchInput` | Debounced search field | `value`, `onChange`, `debounceMs` |
| `Toast` / `useToast` | Transient notifications; provider at root | `success/error/info/warning(msg)` |

All primitives are exported from a single barrel: `shared/ui/index.ts`. Import as `import { Button, Modal, Field, Input } from '@ui'`.

```ts
// shared/ui/index.ts
export * from './Button';
export * from './IconButton';
export * from './Field';
export * from './Input';
export * from './Select';
export * from './Textarea';
export * from './Modal';
export * from './ConfirmDialog';
export * from './DataTable';
export * from './Badge';
export * from './Card';
export * from './Alert';
export * from './Spinner';
export * from './EmptyState';
export * from './ErrorState';
export * from './Pagination';
export * from './SearchInput';
export * from './Toast';
```

---

## Button

The single canonical button. Shows a spinner and is disabled while `isLoading`.

```tsx
// shared/ui/Button/Button.tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Spinner } from '../Spinner';
import styles from './Button.module.css';
import { clsx } from '../clsx';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', isLoading = false, leftIcon, rightIcon,
    fullWidth = false, disabled, className, children, type = 'button', ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={clsx(styles.btn, styles[variant], styles[size], fullWidth && styles.full, className)}
      {...rest}
    >
      {isLoading ? <Spinner size="sm" /> : leftIcon && <span className={styles.icon}>{leftIcon}</span>}
      {children && <span className={styles.label}>{children}</span>}
      {!isLoading && rightIcon && <span className={styles.icon}>{rightIcon}</span>}
    </button>
  );
});
```

```css
/* shared/ui/Button/Button.module.css */
.btn {
  display: inline-flex; align-items: center; justify-content: center;
  gap: var(--space-2);
  border: 1px solid transparent; border-radius: var(--radius-md);
  font-family: var(--font-sans); font-weight: 600; line-height: var(--leading-tight);
  cursor: pointer; white-space: nowrap;
  transition: background var(--transition-fast), border-color var(--transition-fast), opacity var(--transition-fast);
}
.btn:disabled { opacity: 0.55; cursor: not-allowed; }
.btn:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }

.sm { padding-block: var(--space-1); padding-inline: var(--space-3); font-size: var(--text-sm); }
.md { padding-block: var(--space-2); padding-inline: var(--space-4); font-size: var(--text-base); }
.lg { padding-block: var(--space-3); padding-inline: var(--space-6); font-size: var(--text-lg); }
.full { width: 100%; }

.primary { background: var(--gradient-brand); color: var(--color-on-primary); }
.primary:hover:not(:disabled) { background: var(--color-primary-hover); }
.secondary { background: var(--color-surface-2); color: var(--color-text); border-color: var(--color-border-strong); }
.secondary:hover:not(:disabled) { border-color: var(--color-primary-accent); }
.danger { background: var(--color-danger); color: var(--color-on-primary); }
.danger:hover:not(:disabled) { background: var(--color-danger-hover); }
.ghost { background: transparent; color: var(--color-text-subtle); }
.ghost:hover:not(:disabled) { background: var(--color-surface-2); }

.icon { display: inline-flex; }
```

```tsx
<Button variant="primary" leftIcon={<PlusIcon />} onClick={open}>Invite admin</Button>
<Button variant="danger" isLoading={mutation.isPending} onClick={remove}>Delete</Button>
```

**Never:** `<button style={{ background: '#2563eb' }}>`. Use `variant`.

---

## IconButton

Icon-only button. `label` is **required** and becomes `aria-label` (icon-only buttons must be labelled).

```tsx
// shared/ui/IconButton/IconButton.tsx
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import styles from './IconButton.module.css';
import { clsx } from '../clsx';

export interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label'> {
  icon: ReactNode;
  label: string;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { icon, label, variant = 'ghost', size = 'md', className, type = 'button', ...rest }, ref,
) {
  return (
    <button ref={ref} type={type} aria-label={label} title={label}
      className={clsx(styles.iconBtn, styles[variant], styles[size], className)} {...rest}>
      {icon}
    </button>
  );
});
```

```css
/* shared/ui/IconButton/IconButton.module.css */
.iconBtn {
  display: inline-flex; align-items: center; justify-content: center;
  border: 1px solid transparent; border-radius: var(--radius-md);
  cursor: pointer; color: var(--color-text-subtle);
  transition: background var(--transition-fast);
}
.iconBtn:hover { background: var(--color-surface-2); color: var(--color-text); }
.iconBtn:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 2px; }
.sm { width: 28px; height: 28px; } .md { width: 36px; height: 36px; } .lg { width: 44px; height: 44px; }
.danger:hover { color: var(--color-danger); }
```

```tsx
<IconButton icon={<TrashIcon />} label={t('common.delete')} variant="danger" onClick={remove} />
```

---

## Field

The label/hint/error wrapper shared by every form control. Renders `<label>`, an optional hint, and a `role="alert"` error region. `Input`/`Select`/`Textarea` embed it, but it's exported for custom controls too.

```tsx
// shared/ui/Field/Field.tsx
import { type ReactNode } from 'react';
import styles from './Field.module.css';

export interface FieldProps {
  label?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  htmlFor?: string;
  children: ReactNode;
}

export function Field({ label, error, hint, required, htmlFor, children }: FieldProps) {
  return (
    <div className={styles.field}>
      {label && (
        <label htmlFor={htmlFor} className={styles.label}>
          {label}{required && <span className={styles.req} aria-hidden="true"> *</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className={styles.hint}>{hint}</p>}
      {error && <p className={styles.error} role="alert">{error}</p>}
    </div>
  );
}
```

```css
/* shared/ui/Field/Field.module.css */
.field { display: flex; flex-direction: column; gap: var(--space-2); }
.label { font-size: var(--text-sm); font-weight: 600; color: var(--color-text-subtle); text-align: start; }
.req { color: var(--color-danger); }
.hint { font-size: var(--text-xs); color: var(--color-text-muted); text-align: start; margin: 0; }
.error { font-size: var(--text-xs); color: var(--color-danger); text-align: start; margin: 0; }
```

---

## Input

`forwardRef` so RHF `register()` attaches its ref. Composes `Field`. Generates an id for label/error association.

```tsx
// shared/ui/Input/Input.tsx
import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Field } from '../Field';
import styles from './Input.module.css';
import { clsx } from '../clsx';

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, required, id, className, ...rest }, ref,
) {
  const autoId = useId();
  const inputId = id ?? autoId;
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={inputId}>
      <div className={clsx(styles.wrap, error && styles.invalid)}>
        {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
        <input
          ref={ref} id={inputId} className={clsx(styles.input, className)}
          aria-invalid={!!error} required={required} {...rest}
        />
      </div>
    </Field>
  );
});
```

```css
/* shared/ui/Input/Input.module.css */
.wrap {
  display: flex; align-items: center; gap: var(--space-2);
  background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-md); padding-inline: var(--space-3);
  transition: border-color var(--transition-fast);
}
.wrap:focus-within { border-color: var(--color-primary-accent); box-shadow: 0 0 0 3px var(--color-focus); }
.invalid { border-color: var(--color-danger); }
.leftIcon { display: inline-flex; color: var(--color-text-muted); }
.input {
  flex: 1; min-width: 0; background: transparent; border: none; outline: none;
  color: var(--color-text); font-family: var(--font-sans); font-size: var(--text-base);
  padding-block: var(--space-2); text-align: start;
}
.input::placeholder { color: var(--color-text-muted); }
```

```tsx
// RHF-compatible: register spreads name + ref + onChange onto Input
<Input label={t('admin.email')} type="email" error={errors.email?.message} {...register('email')} />
```

---

## Select

Native `<select>` from an `options` array, `forwardRef`, RHF-ready.

```tsx
// shared/ui/Select/Select.tsx
import { forwardRef, useId, type SelectHTMLAttributes } from 'react';
import { Field } from '../Field';
import styles from './Select.module.css';
import { clsx } from '../clsx';

export interface SelectOption { label: string; value: string }
export interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: SelectOption[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, hint, options, placeholder, required, id, className, ...rest }, ref,
) {
  const autoId = useId();
  const selectId = id ?? autoId;
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={selectId}>
      <select ref={ref} id={selectId} aria-invalid={!!error} required={required}
        className={clsx(styles.select, error && styles.invalid, className)} {...rest}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </Field>
  );
});
```

```css
/* shared/ui/Select/Select.module.css */
.select {
  width: 100%; background: var(--color-surface); color: var(--color-text);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  padding-block: var(--space-2); padding-inline: var(--space-3);
  font-family: var(--font-sans); font-size: var(--text-base); text-align: start;
  transition: border-color var(--transition-fast);
}
.select:focus-visible { outline: none; border-color: var(--color-primary-accent); box-shadow: 0 0 0 3px var(--color-focus); }
.invalid { border-color: var(--color-danger); }
```

```tsx
<Select label={t('owner.action')} placeholder={t('common.choose')}
  options={[{ label: t('owner.approve'), value: 'approve' }, { label: t('owner.reject'), value: 'reject' }]}
  error={errors.action?.message} {...register('action')} />
```

---

## Textarea

Same pattern as `Input`, multiline.

```tsx
// shared/ui/Textarea/Textarea.tsx
import { forwardRef, useId, type TextareaHTMLAttributes } from 'react';
import { Field } from '../Field';
import styles from './Textarea.module.css';
import { clsx } from '../clsx';

export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string; error?: string; hint?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, hint, required, id, className, rows = 4, ...rest }, ref,
) {
  const autoId = useId();
  const areaId = id ?? autoId;
  return (
    <Field label={label} error={error} hint={hint} required={required} htmlFor={areaId}>
      <textarea ref={ref} id={areaId} rows={rows} aria-invalid={!!error} required={required}
        className={clsx(styles.textarea, error && styles.invalid, className)} {...rest} />
    </Field>
  );
});
```

```css
/* shared/ui/Textarea/Textarea.module.css */
.textarea {
  width: 100%; resize: vertical; background: var(--color-surface); color: var(--color-text);
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  padding: var(--space-3); font-family: var(--font-sans); font-size: var(--text-base); text-align: start;
}
.textarea:focus-visible { outline: none; border-color: var(--color-primary-accent); box-shadow: 0 0 0 3px var(--color-focus); }
.invalid { border-color: var(--color-danger); }
```

---

## Modal

Portal + focus-trap + Esc-to-close + overlay-click-close + `role="dialog"` + `aria-modal` + `aria-labelledby`. Animated with framer-motion. This replaces every hand-rolled `<div className="overlay">` in the app.

```tsx
// shared/ui/Modal/Modal.tsx
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { IconButton } from '../IconButton';
import styles from './Modal.module.css';
import { clsx } from '../clsx';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: ReactNode;
  children: ReactNode;
}

const FOCUSABLE = 'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

export function Modal({ isOpen, onClose, title, description, size = 'md', footer, children }: ModalProps) {
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  useEffect(() => {
    if (!isOpen) return;
    const prevActive = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key !== 'Tab') return;
      const nodes = ref.current?.querySelectorAll<HTMLElement>(FOCUSABLE);
      if (!nodes || nodes.length === 0) return;
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
      prevActive?.focus();
    };
  }, [isOpen, onClose]);

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <motion.div className={styles.overlay} onMouseDown={onClose}
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div
            ref={ref} role="dialog" aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? descId : undefined}
            className={clsx(styles.dialog, styles[size])}
            onMouseDown={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18 }}
          >
            {(title || true) && (
              <header className={styles.header}>
                {title && <h2 id={titleId} className={styles.title}>{title}</h2>}
                <IconButton icon={<span aria-hidden>×</span>} label="Close" onClick={onClose} />
              </header>
            )}
            {description && <p id={descId} className={styles.desc}>{description}</p>}
            <div className={styles.body}>{children}</div>
            {footer && <footer className={styles.footer}>{footer}</footer>}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
```

```css
/* shared/ui/Modal/Modal.module.css */
.overlay {
  position: fixed; inset: 0; z-index: var(--z-modal);
  background: var(--color-overlay); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center; padding: var(--space-4);
}
.dialog {
  width: 100%; background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); box-shadow: var(--shadow-lg);
  display: flex; flex-direction: column; max-height: calc(100vh - var(--space-16));
}
.sm { max-width: 420px; } .md { max-width: 560px; } .lg { max-width: 800px; }
.header { display: flex; align-items: center; justify-content: space-between; gap: var(--space-4);
  padding: var(--space-5); border-bottom: 1px solid var(--color-border); }
.title { margin: 0; font-size: var(--text-xl); font-weight: 700; color: var(--color-text); text-align: start; }
.desc { margin: 0; padding-inline: var(--space-5); padding-top: var(--space-3); color: var(--color-text-muted); text-align: start; }
.body { padding: var(--space-5); overflow-y: auto; }
.footer { display: flex; justify-content: flex-end; gap: var(--space-3);
  padding: var(--space-5); border-top: 1px solid var(--color-border); }
```

**Rule:** Open/close state comes from `useDisclosure()` (see `shared/hooks`) or a feature Zustand slice — never a bare `useState` scattered across siblings when multiple components must observe it.

---

## ConfirmDialog

A `Modal` preset for confirm/destructive actions. Awaits async `onConfirm` and shows loading.

```tsx
// shared/ui/ConfirmDialog/ConfirmDialog.tsx
import { Modal } from '../Modal';
import { Button } from '../Button';

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'primary' | 'danger';
  isLoading?: boolean;
}

export function ConfirmDialog({
  isOpen, onClose, onConfirm, title, message,
  confirmText = 'Confirm', cancelText = 'Cancel', variant = 'primary', isLoading = false,
}: ConfirmDialogProps) {
  return (
    <Modal
      isOpen={isOpen} onClose={onClose} title={title} size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>{cancelText}</Button>
          <Button variant={variant} isLoading={isLoading} onClick={() => onConfirm()}>{confirmText}</Button>
        </>
      }
    >
      <p style={undefined}>{message}</p>
    </Modal>
  );
}
```

```tsx
<ConfirmDialog
  isOpen={confirm.isOpen} onClose={confirm.close}
  onConfirm={async () => { await deleteAdmin.mutateAsync(id); confirm.close(); }}
  title={t('admin.deleteTitle')} message={t('admin.deleteMsg', { name })}
  variant="danger" confirmText={t('common.delete')} isLoading={deleteAdmin.isPending}
/>
```

---

## DataTable&lt;T&gt;

Generic, typed table that handles **loading (skeleton), error (with retry), and empty** internally — so features never re-implement those three states. Horizontal scroll on small screens.

```tsx
// shared/ui/DataTable/DataTable.tsx
import { type ReactNode } from 'react';
import { Spinner } from '../Spinner';
import { ErrorState } from '../ErrorState';
import { EmptyState } from '../EmptyState';
import styles from './DataTable.module.css';
import { clsx } from '../clsx';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  align?: 'start' | 'center' | 'end';
  width?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  error?: string;
  onRetry?: () => void;
  emptyState?: ReactNode;
  getRowId: (row: T) => string;
  rowActions?: (row: T) => ReactNode;
}

export function DataTable<T>({
  columns, data, isLoading, error, onRetry, emptyState, getRowId, rowActions,
}: DataTableProps<T>) {
  if (isLoading) return <div className={styles.center}><Spinner size="lg" label="Loading" /></div>;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (data.length === 0) return <>{emptyState ?? <EmptyState title="No records" />}</>;

  return (
    <div className={styles.scroll}>
      <table className={styles.table}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} style={{ width: c.width }}
                className={clsx(styles.th, c.align && styles[`al-${c.align}`])}>
                {c.header}
              </th>
            ))}
            {rowActions && <th className={styles.th} aria-label="actions" />}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr key={getRowId(row)} className={styles.tr} data-testid={`row-${getRowId(row)}`}>
              {columns.map((c) => (
                <td key={c.key} className={clsx(styles.td, c.align && styles[`al-${c.align}`])}>
                  {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '')}
                </td>
              ))}
              {rowActions && <td className={clsx(styles.td, styles['al-end'])}>{rowActions(row)}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

> Note: `width` is a runtime-derived column dimension (not styling), so a per-cell `style={{ width }}` is the accepted exception to the no-inline-style rule. Everything else is tokens/CSS Modules.

```css
/* shared/ui/DataTable/DataTable.module.css */
.scroll { overflow-x: auto; border: 1px solid var(--color-border); border-radius: var(--radius-lg); }
.table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
.th { text-align: start; padding: var(--space-3) var(--space-4); color: var(--color-text-muted);
  font-weight: 600; background: var(--color-surface-2); border-bottom: 1px solid var(--color-border); white-space: nowrap; }
.tr { transition: background var(--transition-fast); }
.tr:hover { background: var(--color-surface-2); }
.td { padding: var(--space-3) var(--space-4); color: var(--color-text);
  border-bottom: 1px solid var(--color-border); text-align: start; }
.al-start { text-align: start; } .al-center { text-align: center; } .al-end { text-align: end; }
.center { display: flex; justify-content: center; padding: var(--space-12); }
```

```tsx
const columns: Column<Admin>[] = [
  { key: 'name', header: t('admin.name'), render: (r) => r.fullName },
  { key: 'email', header: t('admin.email'), render: (r) => r.email },
  { key: 'status', header: t('admin.status'),
    render: (r) => <Badge variant={r.isActive ? 'success' : 'neutral'}>{r.isActive ? t('admin.active') : t('admin.disabled')}</Badge> },
];

<DataTable
  columns={columns} data={admins} isLoading={query.isLoading}
  error={query.isError ? query.error.message : undefined} onRetry={query.refetch}
  getRowId={(a) => a.id}
  emptyState={<EmptyState title={t('admin.empty')} action={<Button onClick={open}>{t('admin.invite')}</Button>} />}
  rowActions={(a) => <IconButton icon={<TrashIcon />} label={t('common.delete')} onClick={() => askDelete(a)} />}
/>
```

---

## Badge

Maps each `variant` to a semantic status token pair (text/bg).

```tsx
// shared/ui/Badge/Badge.tsx
import { type ReactNode } from 'react';
import styles from './Badge.module.css';
import { clsx } from '../clsx';

export interface BadgeProps {
  variant: 'success' | 'danger' | 'warning' | 'neutral' | 'info';
  size?: 'sm' | 'md';
  children: ReactNode;
}

export function Badge({ variant, size = 'md', children }: BadgeProps) {
  return <span className={clsx(styles.badge, styles[variant], styles[size])}>{children}</span>;
}
```

```css
/* shared/ui/Badge/Badge.module.css */
.badge { display: inline-flex; align-items: center; gap: var(--space-1);
  border-radius: var(--radius-full); font-weight: 600; line-height: 1; white-space: nowrap; }
.sm { padding: var(--space-1) var(--space-2); font-size: var(--text-xs); }
.md { padding: var(--space-1) var(--space-3); font-size: var(--text-sm); }
.success { color: var(--status-success-text); background: var(--status-success-bg); }
.danger  { color: var(--status-danger-text);  background: var(--status-danger-bg); }
.warning { color: var(--status-warning-text); background: var(--status-warning-bg); }
.neutral { color: var(--status-neutral-text); background: var(--status-neutral-bg); }
.info    { color: var(--status-info-text);    background: var(--status-info-bg); }
```

```tsx
<Badge variant="success">{t('owner.approved')}</Badge>
<Badge variant="warning" size="sm">{t('owner.pending')}</Badge>
```

---

## Card

Surface container with a padding scale. Polymorphic via `as`.

```tsx
// shared/ui/Card/Card.tsx
import { type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import styles from './Card.module.css';
import { clsx } from '../clsx';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: ElementType;
  padding?: 'sm' | 'md' | 'lg';
  children: ReactNode;
}

export function Card({ as: Tag = 'div', padding = 'md', className, children, ...rest }: CardProps) {
  return <Tag className={clsx(styles.card, styles[padding], className)} {...rest}>{children}</Tag>;
}
```

```css
/* shared/ui/Card/Card.module.css */
.card { background: var(--color-surface); border: 1px solid var(--color-border);
  border-radius: var(--radius-xl); box-shadow: var(--shadow-sm); }
.sm { padding: var(--space-4); } .md { padding: var(--space-6); } .lg { padding: var(--space-8); }
```

---

## Alert

Inline banner, `role="alert"`, optional dismiss.

```tsx
// shared/ui/Alert/Alert.tsx
import { type ReactNode } from 'react';
import { IconButton } from '../IconButton';
import styles from './Alert.module.css';
import { clsx } from '../clsx';

export interface AlertProps {
  variant: 'error' | 'success' | 'warning' | 'info';
  title?: string;
  children: ReactNode;
  onClose?: () => void;
}

export function Alert({ variant, title, children, onClose }: AlertProps) {
  return (
    <div className={clsx(styles.alert, styles[variant])} role="alert">
      <div className={styles.content}>
        {title && <p className={styles.title}>{title}</p>}
        <div className={styles.body}>{children}</div>
      </div>
      {onClose && <IconButton icon={<span aria-hidden>×</span>} label="Dismiss" size="sm" onClick={onClose} />}
    </div>
  );
}
```

```css
/* shared/ui/Alert/Alert.module.css */
.alert { display: flex; gap: var(--space-3); align-items: flex-start;
  border: 1px solid var(--color-border); border-radius: var(--radius-md);
  padding: var(--space-3) var(--space-4); }
.content { flex: 1; }
.title { margin: 0 0 var(--space-1); font-weight: 600; text-align: start; }
.body { font-size: var(--text-sm); color: var(--color-text-subtle); text-align: start; }
.error   { border-color: var(--status-danger-border);  background: var(--status-danger-bg);  color: var(--status-danger-text); }
.success { border-color: var(--status-success-border); background: var(--status-success-bg); color: var(--status-success-text); }
.warning { border-color: var(--status-warning-border); background: var(--status-warning-bg); color: var(--status-warning-text); }
.info    { border-color: var(--status-info-border);    background: var(--status-info-bg);    color: var(--status-info-text); }
```

```tsx
{form.serverError && <Alert variant="error" onClose={clearError}>{form.serverError}</Alert>}
```

---

## Spinner

Accessible loading indicator.

```tsx
// shared/ui/Spinner/Spinner.tsx
import styles from './Spinner.module.css';
import { clsx } from '../clsx';

export interface SpinnerProps { size?: 'sm' | 'md' | 'lg'; label?: string }

export function Spinner({ size = 'md', label = 'Loading' }: SpinnerProps) {
  return <span className={clsx(styles.spinner, styles[size])} role="status" aria-label={label} />;
}
```

```css
/* shared/ui/Spinner/Spinner.module.css */
.spinner { display: inline-block; border-radius: var(--radius-full);
  border: 2px solid var(--color-border-strong); border-top-color: var(--color-primary-accent);
  animation: spin 0.7s linear infinite; }
.sm { width: 16px; height: 16px; } .md { width: 24px; height: 24px; } .lg { width: 40px; height: 40px; }
@keyframes spin { to { transform: rotate(360deg); } }
```

---

## EmptyState

```tsx
// shared/ui/EmptyState/EmptyState.tsx
import { type ReactNode } from 'react';
import styles from './EmptyState.module.css';

export interface EmptyStateProps {
  icon?: ReactNode; title: string; description?: string; action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className={styles.wrap}>
      {icon && <div className={styles.icon} aria-hidden>{icon}</div>}
      <p className={styles.title}>{title}</p>
      {description && <p className={styles.desc}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
}
```

```css
/* shared/ui/EmptyState/EmptyState.module.css */
.wrap { display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
  padding: var(--space-12) var(--space-6); text-align: center; }
.icon { color: var(--color-text-muted); }
.title { margin: 0; font-size: var(--text-lg); font-weight: 600; color: var(--color-text); }
.desc { margin: 0; color: var(--color-text-muted); font-size: var(--text-sm); }
.action { margin-top: var(--space-2); }
```

---

## ErrorState

```tsx
// shared/ui/ErrorState/ErrorState.tsx
import { Button } from '../Button';
import styles from './ErrorState.module.css';

export interface ErrorStateProps { title?: string; message?: string; onRetry?: () => void }

export function ErrorState({ title = 'Something went wrong', message, onRetry }: ErrorStateProps) {
  return (
    <div className={styles.wrap} role="alert">
      <p className={styles.title}>{title}</p>
      {message && <p className={styles.msg}>{message}</p>}
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Retry</Button>}
    </div>
  );
}
```

```css
/* shared/ui/ErrorState/ErrorState.module.css */
.wrap { display: flex; flex-direction: column; align-items: center; gap: var(--space-3);
  padding: var(--space-10) var(--space-6); text-align: center; }
.title { margin: 0; font-weight: 600; color: var(--color-danger); }
.msg { margin: 0; color: var(--color-text-muted); font-size: var(--text-sm); }
```

---

## Pagination

```tsx
// shared/ui/Pagination/Pagination.tsx
import { IconButton } from '../IconButton';
import styles from './Pagination.module.css';
import { clsx } from '../clsx';

export interface PaginationProps { page: number; pageCount: number; onPageChange: (p: number) => void }

export function Pagination({ page, pageCount, onPageChange }: PaginationProps) {
  if (pageCount <= 1) return null;
  const pages = Array.from({ length: pageCount }, (_, i) => i + 1);
  return (
    <nav className={styles.nav} aria-label="Pagination">
      <IconButton icon={<span aria-hidden>‹</span>} label="Previous" size="sm"
        disabled={page <= 1} onClick={() => onPageChange(page - 1)} />
      {pages.map((p) => (
        <button key={p} className={clsx(styles.page, p === page && styles.active)}
          aria-current={p === page ? 'page' : undefined} onClick={() => onPageChange(p)}>{p}</button>
      ))}
      <IconButton icon={<span aria-hidden>›</span>} label="Next" size="sm"
        disabled={page >= pageCount} onClick={() => onPageChange(page + 1)} />
    </nav>
  );
}
```

```css
/* shared/ui/Pagination/Pagination.module.css */
.nav { display: flex; align-items: center; gap: var(--space-1); }
.page { min-width: 32px; height: 32px; border: 1px solid var(--color-border);
  border-radius: var(--radius-md); background: transparent; color: var(--color-text-subtle);
  cursor: pointer; font-size: var(--text-sm); }
.page:hover { background: var(--color-surface-2); }
.active { background: var(--color-primary); color: var(--color-on-primary); border-color: transparent; }
```

> Directional glyphs `‹`/`›` flip automatically under `dir="rtl"` since the whole `nav` is laid out with logical flow.

---

## SearchInput

Debounced controlled search. Wraps `Input`, uses the shared `useDebounce`.

```tsx
// shared/ui/SearchInput/SearchInput.tsx
import { useEffect, useState } from 'react';
import { Input } from '../Input';
import { useDebounce } from '@/shared/hooks/useDebounce';

export interface SearchInputProps {
  value: string; onChange: (v: string) => void; placeholder?: string; debounceMs?: number;
}

export function SearchInput({ value, onChange, placeholder, debounceMs = 300 }: SearchInputProps) {
  const [local, setLocal] = useState(value);
  const debounced = useDebounce(local, debounceMs);
  useEffect(() => { if (debounced !== value) onChange(debounced); }, [debounced]); // eslint-disable-line
  useEffect(() => { setLocal(value); }, [value]);
  return (
    <Input type="search" role="searchbox" placeholder={placeholder}
      value={local} onChange={(e) => setLocal(e.target.value)} />
  );
}
```

```tsx
<SearchInput value={filters.q} onChange={(q) => setFilter({ q })} placeholder={t('admin.search')} />
```

---

## Toast / useToast

Provider mounted once at the app root (see 01-architecture.md — `ToastProvider`). Anywhere: `const toast = useToast(); toast.success(msg)`. Mutations call it from `onSuccess`/`onError` (see 04-data-layer.md).

```tsx
// shared/ui/Toast/ToastProvider.tsx
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import styles from './Toast.module.css';
import { clsx } from '../clsx';

type ToastVariant = 'success' | 'error' | 'info' | 'warning';
interface ToastItem { id: string; variant: ToastVariant; message: string }
interface ToastApi { success: (m: string) => void; error: (m: string) => void; info: (m: string) => void; warning: (m: string) => void }

const ToastCtx = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const push = useCallback((variant: ToastVariant, message: string) => {
    const id = crypto.randomUUID();
    setItems((s) => [...s, { id, variant, message }]);
    setTimeout(() => setItems((s) => s.filter((t) => t.id !== id)), 4000);
  }, []);
  const api = useMemo<ToastApi>(() => ({
    success: (m) => push('success', m), error: (m) => push('error', m),
    info: (m) => push('info', m), warning: (m) => push('warning', m),
  }), [push]);

  return (
    <ToastCtx.Provider value={api}>
      {children}
      {createPortal(
        <div className={styles.stack} aria-live="polite" aria-atomic="false">
          <AnimatePresence>
            {items.map((t) => (
              <motion.div key={t.id} role="status"
                className={clsx(styles.toast, styles[t.variant])}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}>
                {t.message}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>, document.body)}
    </ToastCtx.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
```

```css
/* shared/ui/Toast/Toast.module.css */
.stack { position: fixed; inset-block-end: var(--space-6); inset-inline-end: var(--space-6);
  z-index: var(--z-toast); display: flex; flex-direction: column; gap: var(--space-2); }
.toast { min-width: 240px; max-width: 380px; padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-md); font-size: var(--text-sm); box-shadow: var(--shadow-md);
  border: 1px solid var(--color-border); background: var(--color-surface-2); color: var(--color-text); text-align: start; }
.success { border-inline-start: 3px solid var(--color-success); }
.error   { border-inline-start: 3px solid var(--color-danger); }
.warning { border-inline-start: 3px solid var(--color-warning); }
.info    { border-inline-start: 3px solid var(--color-primary-accent); }
```

```tsx
const toast = useToast();
// in a mutation:
onSuccess: () => toast.success(t('admin.created'));
onError: (e) => toast.error(e.message);
```

---

## The `clsx` helper

A 5-line dependency-free class joiner used by every primitive (avoids pulling a lib).

```ts
// shared/ui/clsx.ts
export function clsx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
```

---

## Composing a feature from primitives

An `InviteAdminModal` built entirely from kit primitives + RHF/Zod (see 05-state-i18n-forms.md) — ~30 lines, no bespoke markup, fully accessible:

```tsx
// features/admin-management/components/InviteAdminModal.tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal, Field, Input, Select, Button, useToast } from '@ui';
import { createAdminSchema, type CreateAdminInput } from '../api/admin.schema';
import { useCreateAdminMutation } from '../hooks/useCreateAdminMutation';

export function InviteAdminModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const toast = useToast();
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } =
    useForm<CreateAdminInput>({ resolver: zodResolver(createAdminSchema) });
  const createAdmin = useCreateAdminMutation();

  const submit = handleSubmit(async (values) => {
    await createAdmin.mutateAsync(values);
    toast.success(t('admin.created'));
    reset(); onClose();
  });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('admin.inviteTitle')}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button form="invite-admin" type="submit" isLoading={isSubmitting}>{t('admin.invite')}</Button>
        </>
      }>
      <form id="invite-admin" onSubmit={submit} style={undefined}>
        <Input label={t('admin.fullName')} error={errors.fullName?.message} {...register('fullName')} />
        <Input label={t('admin.email')} type="email" error={errors.email?.message} {...register('email')} />
        <Select label={t('admin.role')} error={errors.role?.message}
          options={[{ label: t('admin.roleAdmin'), value: 'admin' }]} {...register('role')} />
      </form>
    </Modal>
  );
}
```

Notice: no hex, no inline styles, no `err?.response?.data?.message`, no hand-rolled overlay — every concern is a primitive or a hook.

---

## Do / Never recap

**Do**
- Import primitives from `@ui`; build every screen out of them.
- Extend a primitive by adding an **optional prop** in `shared/ui`, then use it everywhere.
- Style only with tokens (`var(--...)`) inside `*.module.css`.
- Use logical properties (`margin-inline`, `inset-inline`, `text-align: start`) so RTL is free.
- `forwardRef` every control that wraps a native `<input>/<select>/<textarea>` so RHF `register()` works.
- Put `data-testid` on interactive/row nodes; give every icon-only control an aria `label`.
- Let `DataTable` own loading/error/empty; feed it `query.isLoading` / `query.error` / `query.refetch`.

**Never**
- Hand-roll a modal, table, or button inside a feature (the current app's core defect).
- Write a raw hex/rgba or `style={{...}}` in a component or feature CSS (documented exceptions: `DataTable` column `width`, a bare form element's zero-config `style={undefined}` placeholder — replace with a `styles.form` grid class in real code).
- Use `left`/`right` in CSS — logical properties only.
- Fork a private copy of a primitive; evolve centrally instead.
- Read server loading/error into local `useState` — that belongs to TanStack Query (see 04-data-layer.md).
- Ship an icon-only button without an aria `label`, or a modal without focus-trap + Esc.
```
