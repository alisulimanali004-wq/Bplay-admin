import { z } from 'zod';
import { MESSAGE_MAX_LENGTH, MESSAGE_MIN_LENGTH } from './chat.types';

/**
 * FR-ADM-CHAT-003 — the admin's outgoing message. TEXT ONLY (CH3): there is no
 * attachment field here, and adding one is FR-ADM-CHAT-005 (V2) work that has to
 * land on the backend first.
 *
 * Bounds are enforced here AND must be enforced by the backend — a client schema
 * stops typos, not a crafted request. The body is stored and rendered as plain
 * text (never HTML), so trimming is all the normalisation it needs.
 */
export const sendMessageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(MESSAGE_MIN_LENGTH, 'chat.errors.messageRequired')
    .max(MESSAGE_MAX_LENGTH, 'chat.errors.messageLong'),
});

export type SendMessageFormValues = z.infer<typeof sendMessageSchema>;

/**
 * FR-ADM-CHAT-003 — opening a thread. A `facility_review` thread is ABOUT a
 * facility, so it cannot be opened without naming one; a `general_support`
 * thread is per owner and takes none.
 */
export const startConversationSchema = z
  .object({
    ownerId: z.string().min(1, 'chat.errors.ownerRequired'),
    category: z.enum(['facility_review', 'general_support']),
    facilityId: z.string().optional(),
  })
  .refine((value) => value.category !== 'facility_review' || Boolean(value.facilityId), {
    message: 'chat.errors.facilityRequired',
    path: ['facilityId'],
  });

export type StartConversationFormValues = z.infer<typeof startConversationSchema>;
