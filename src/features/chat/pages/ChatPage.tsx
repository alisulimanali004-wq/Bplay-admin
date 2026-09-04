import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Button,
  EmptyState,
  MessageCircleIcon,
  PageHeader,
  PlusIcon,
  Spinner,
  clsx,
} from '@ui';
import { useDisclosure } from '@shared/hooks/useDisclosure';
import { isNotFoundError } from '@shared/lib/errors';
import { useAuthRole, useAuthUser } from '@shared/stores/authStore';
import { PATHS } from '@app/router/paths';
import { CONVERSATION_PAGE_SIZE } from '../api/chat.filter';
import { ChatComposer } from '../components/ChatComposer';
import { ChatThread } from '../components/ChatThread';
import { ConversationRail } from '../components/ConversationRail';
import { NewConversationModal } from '../components/NewConversationModal';
import { ThreadHeader } from '../components/ThreadHeader';
import {
  useChatStats,
  useConversationQuery,
  useConversationsQuery,
  useMessagesQuery,
} from '../hooks/useChatQueries';
import { useMarkConversationRead, useSendMessage, useStartConversation } from '../hooks/useChatMutations';
import { useChatStream } from '../hooks/useChatStream';
import type {
  ChatMessage,
  Conversation,
  ConversationListParams,
  StartConversationInput,
} from '../api/chat.types';
import styles from './ChatPage.module.css';

const INITIAL: ConversationListParams = {
  q: '',
  category: 'all',
  readState: 'all',
  regionId: 'all',
  page: 1,
  pageSize: CONVERSATION_PAGE_SIZE,
};

/**
 * CHAT (SRS module 15) — the administration ↔ facility-owner channel.
 *
 * A MASTER–DETAIL messenger, not a table with a detail route: a conversation
 * list is only useful next to the thread it selects, and an admin working
 * through a morning's messages should never lose the list to open one.
 *
 * The layout is one component at both sizes. Above 1024px the rail and the
 * thread sit side by side; below it exactly one pane is visible and the URL
 * decides which — `/app/chat` is the list, `/app/chat/:id` is the thread. That
 * keeps the browser Back button meaningful on a phone (FR: predictable back)
 * without a second route component or a duplicated page.
 */
export default function ChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { conversationId } = useParams<{ conversationId: string }>();
  const user = useAuthUser();
  const role = useAuthRole();

  const [params, setParams] = useState<ConversationListParams>(INITIAL);
  const newConversation = useDisclosure();

  const listQuery = useConversationsQuery(params);
  const statsQuery = useChatStats();
  const conversationQuery = useConversationQuery(conversationId);
  const messagesQuery = useMessagesQuery(conversationId);

  // One connection for the page — see the note on useChatStream.
  const { typingIn } = useChatStream(conversationId);

  const sendMessage = useSendMessage();
  const markRead = useMarkConversationRead();
  const startConversation = useStartConversation();

  const conversation = conversationQuery.data;
  const messages = useMemo(() => messagesQuery.data?.messages ?? [], [messagesQuery.data]);

  /**
   * FR-ADM-CHAT-002 — "تعليم الرسائل كمقروءة عند الفتح".
   *
   * Keyed on the conversation id AND its unread count so an arriving message in
   * the OPEN thread is acknowledged too, but a thread already at zero never
   * fires a pointless write.
   */
  const lastAckRef = useRef<string | null>(null);
  useEffect(() => {
    if (!conversation || conversation.unreadCount === 0) return;
    const stamp = `${conversation.id}:${conversation.lastMessageAt}`;
    if (lastAckRef.current === stamp) return;
    lastAckRef.current = stamp;
    markRead(conversation.id);
  }, [conversation, markRead]);

  const openConversation = useCallback(
    (next: Conversation) => {
      navigate(`${PATHS.chat}/${next.id}`);
    },
    [navigate],
  );

  const backToList = useCallback(() => {
    navigate(PATHS.chat);
  }, [navigate]);

  const author = useMemo(
    () => ({
      senderId: user?.email ?? 'admin',
      senderName: user?.name ?? user?.email?.split('@')[0] ?? t('chat.thread.administration'),
      senderRole: role ?? undefined,
    }),
    [user, role, t],
  );

  const handleSend = useCallback(
    (body: string) => {
      if (!conversationId) return;
      sendMessage.mutate({ conversationId, body, author });
    },
    [conversationId, sendMessage, author],
  );

  /** Re-send a bubble that failed, replacing it rather than adding a second one. */
  const handleRetryMessage = useCallback(
    (message: ChatMessage) => {
      if (!conversationId) return;
      sendMessage.mutate({
        conversationId,
        body: message.body,
        replaceId: message.id,
        author,
      });
    },
    [conversationId, sendMessage, author],
  );

  const handleStart = useCallback(
    (input: StartConversationInput) => {
      startConversation.mutate(input, {
        onSuccess: (created) => {
          newConversation.close();
          navigate(`${PATHS.chat}/${created.id}`);
        },
      });
    },
    [startConversation, navigate, newConversation],
  );

  const patchParams = useCallback((next: Partial<ConversationListParams>) => {
    setParams((previous) => ({ ...previous, ...next, page: 1 }));
  }, []);

  const isTypingHere = conversationId ? typingIn.has(conversationId) : false;
  // A thread the scope gate refuses comes back as "not found", never as a 403 —
  // an id must not be confirmed by the shape of the error.
  const isMissing = conversationQuery.isError && isNotFoundError(conversationQuery.error);

  return (
    <div className={styles.page}>
      <PageHeader title={t('chat.title')} subtitle={t('chat.subtitle')} />

      <div
        className={clsx(styles.shell, conversationId ? styles.threadOpen : styles.listOpen)}
        data-testid="chat-shell"
      >
        <ConversationRail
          params={params}
          onParamsChange={patchParams}
          onPageChange={(page) => setParams((previous) => ({ ...previous, page }))}
          data={listQuery.data}
          stats={statsQuery.data}
          isLoading={listQuery.isLoading}
          isError={listQuery.isError}
          onRetry={() => void listQuery.refetch()}
          activeId={conversationId}
          onSelect={openConversation}
          typingIn={typingIn}
          onStartConversation={newConversation.open}
        />

        <section className={styles.pane} aria-label={t('chat.thread.paneLabel')}>
          {!conversationId && (
            <div className={styles.placeholder}>
              <EmptyState
                icon={<MessageCircleIcon />}
                title={t('chat.placeholder.title')}
                description={t('chat.placeholder.description')}
                action={
                  <Button leftIcon={<PlusIcon />} onClick={newConversation.open}>
                    {t('chat.actions.new')}
                  </Button>
                }
              />
            </div>
          )}

          {conversationId && conversationQuery.isLoading && (
            <div className={styles.placeholder} aria-busy>
              <Spinner size="lg" />
            </div>
          )}

          {conversationId && isMissing && (
            <div className={styles.placeholder}>
              <EmptyState
                icon={<MessageCircleIcon />}
                title={t('chat.errors.notFoundTitle')}
                description={t('chat.errors.notFoundHint')}
                action={
                  <Button variant="secondary" onClick={backToList}>
                    {t('chat.actions.backToList')}
                  </Button>
                }
              />
            </div>
          )}

          {conversation && (
            <>
              <ThreadHeader
                conversation={conversation}
                isTyping={isTypingHere}
                onBack={backToList}
              />
              <ChatThread
                conversation={conversation}
                messages={messages}
                isLoading={messagesQuery.isLoading}
                isError={messagesQuery.isError}
                onRetry={() => void messagesQuery.refetch()}
                onRetryMessage={handleRetryMessage}
                isTyping={isTypingHere}
              />
              <ChatComposer
                conversation={conversation}
                onSend={handleSend}
                isSending={sendMessage.isPending}
              />
            </>
          )}
        </section>
      </div>

      <NewConversationModal
        isOpen={newConversation.isOpen}
        onClose={newConversation.close}
        onSubmit={handleStart}
        isSubmitting={startConversation.isPending}
      />
    </div>
  );
}
