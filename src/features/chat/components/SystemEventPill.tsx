import { useTranslation } from 'react-i18next';
import {
  AlertCircleIcon,
  CheckIcon,
  ClockIcon,
  DocumentIcon,
  InfoIcon,
  XIcon,
  clsx,
} from '@ui';
import { useChatFormat } from '../hooks/useChatFormat';
import type { ChatMessage, SystemEventType } from '../api/chat.types';
import styles from './systemEventPill.module.css';

const EVENT_ICON: Record<SystemEventType, typeof InfoIcon> = {
  request_submitted: InfoIcon,
  review_started: ClockIcon,
  document_requested: DocumentIcon,
  approved: CheckIcon,
  rejected: XIcon,
  status_changed: AlertCircleIcon,
};

/**
 * CH6 / FR-ADM-FAC-002 — an automatic event in a facility-review thread, emitted
 * by the backend when the facility is submitted, picked up, approved or
 * rejected. It is deliberately NOT a bubble: it belongs to neither party, so it
 * runs centred across the thread as a timeline marker.
 *
 * Colour never carries the meaning on its own: every event has a distinct glyph
 * and a spelled-out label.
 */
export function SystemEventPill({ message }: { message: ChatMessage }) {
  const { t } = useTranslation();
  const fmt = useChatFormat();
  const event = message.systemEventType ?? 'status_changed';
  const Glyph = EVENT_ICON[event];

  return (
    <li className={styles.row} data-testid={`chat-system-${message.id}`}>
      <span className={clsx(styles.pill, styles[event])}>
        <Glyph className={styles.icon} />
        <span className={styles.label}>{t(`chat.systemEvent.${event}`)}</span>
        {message.systemEventDetail && (
          <span className={styles.detail} dir="auto">
            {message.systemEventDetail}
          </span>
        )}
        <time className={styles.time} dateTime={message.createdAt}>
          {fmt.time(message.createdAt)}
        </time>
      </span>
    </li>
  );
}

/** The hairline divider that opens each calendar day inside a thread. */
export function DaySeparator({ iso }: { iso: string }) {
  const fmt = useChatFormat();
  return (
    <li className={styles.dayRow} aria-hidden={false}>
      <span className={styles.day}>{fmt.daySeparator(iso)}</span>
    </li>
  );
}
