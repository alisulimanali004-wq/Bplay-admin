import { z } from 'zod';
import { REPLY_MAX_LENGTH, REPLY_MIN_LENGTH } from './feedback.types';

/**
 * The admin's answer. Bounds are enforced here AND must be enforced by the
 * backend — a client schema stops typos, not a crafted request.
 *
 * The body is stored and rendered as plain text (never HTML), so there is no
 * markup to strip; trimming is all the normalisation it needs.
 */
export const replyFeedbackSchema = z.object({
  body: z
    .string()
    .trim()
    .min(REPLY_MIN_LENGTH, 'feedback.errors.replyRequired')
    .max(REPLY_MAX_LENGTH, 'feedback.errors.replyLong'),
});

export type ReplyFormValues = z.infer<typeof replyFeedbackSchema>;
