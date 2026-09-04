import { USE_MOCKS } from '@shared/lib/mock';
import * as real from './chat.api';
import * as mock from './chat.api.mock';

const impl = USE_MOCKS ? mock : real;

export const getConversations = impl.getConversations;
export const getChatStats = impl.getChatStats;
export const getConversationById = impl.getConversationById;
export const getMessages = impl.getMessages;
export const sendMessage = impl.sendMessage;
export const markConversationRead = impl.markConversationRead;
export const startConversation = impl.startConversation;
export const getChatOwnerOptions = impl.getChatOwnerOptions;
/** The live transport: SSE against the real backend, an in-memory emitter in mocks. */
export const subscribeToChat = impl.subscribeToChat;
