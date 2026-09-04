import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './feedback.api';
import * as mock from './feedback.api.mock';

const impl = USE_MOCKS ? mock : real;

export const getFeedbackList = impl.getFeedbackList;
export const getFeedbackStats = impl.getFeedbackStats;
export const getFeedbackById = impl.getFeedbackById;
export const replyToFeedback = impl.replyToFeedback;
export const closeFeedback = impl.closeFeedback;
export const reopenFeedback = impl.reopenFeedback;
