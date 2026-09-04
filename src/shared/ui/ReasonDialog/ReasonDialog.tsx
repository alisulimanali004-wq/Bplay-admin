import { useEffect, useId, useState } from 'react';
import { Modal } from '../Modal/Modal';
import { Button } from '../Button/Button';
import { Field } from '../Field/Field';
import { Textarea } from '../Textarea/Textarea';
import styles from './ReasonDialog.module.css';

export interface ReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  title: string;
  description?: string;
  reasonLabel: string;
  reasonPlaceholder?: string;
  confirmText: string;
  cancelText?: string;
  variant?: 'primary' | 'danger' | 'caution';
  minLength?: number;
  isLoading?: boolean;
}

/**
 * ConfirmDialog's sibling for destructive-with-reason flows (reject/suspend).
 * Composes Modal (sm) + Field/Textarea; the confirm button stays disabled until
 * the trimmed reason reaches `minLength`. Enter inserts a newline (never
 * submits); Esc closes via Modal; the textarea resets on every open.
 */
export function ReasonDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  reasonLabel,
  reasonPlaceholder,
  confirmText,
  cancelText = 'Cancel',
  variant = 'danger',
  minLength = 10,
  isLoading = false,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const textareaId = useId();

  useEffect(() => {
    if (isOpen) setReason('');
  }, [isOpen]);

  const trimmedLength = reason.trim().length;
  const canConfirm = trimmedLength >= minLength;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      description={description}
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={isLoading}>
            {cancelText}
          </Button>
          <Button
            variant={variant}
            isLoading={isLoading}
            disabled={!canConfirm}
            onClick={() => onConfirm(reason.trim())}
            data-testid="reason-confirm"
          >
            {confirmText}
          </Button>
        </>
      }
    >
      <Field label={reasonLabel} htmlFor={textareaId} required>
        <Textarea
          id={textareaId}
          value={reason}
          placeholder={reasonPlaceholder}
          onChange={(event) => setReason(event.target.value)}
          disabled={isLoading}
          data-testid="reason-textarea"
        />
      </Field>
      <p className={styles.counter} role="status">
        {trimmedLength}/{minLength}
      </p>
    </Modal>
  );
}
