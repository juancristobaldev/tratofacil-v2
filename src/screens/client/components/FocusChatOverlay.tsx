import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@apollo/client/react';
import { TOKENS } from '../../../theme';
import { Icon, Avatar, IconButton } from '../../../components/ui';
import { containsContactInfo, maskContactInfo } from '../../../utils/sanitizer';
import { GET_MESSAGES } from '../../../graphql/operations/realtime';

interface FocusChatOverlayProps {
  chatUser: any;
  activeOrder: any;
  realtime: any;
  role: 'client' | 'provider';
  onClose: () => void;
}

interface ChatMessageItem {
  id: string | number;
  sender: 'client' | 'provider';
  text: string;
  time: string;
  isPending?: boolean;
}

export const CHAT_KEYBOARD_VERTICAL_OFFSET = 0;

export const FocusChatOverlay: React.FC<FocusChatOverlayProps> = React.memo(({ chatUser, activeOrder, realtime, role, onClose }) => {
  const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const [contactWarning, setContactWarning] = useState(false);
  const chatScrollRef = useRef<ScrollView | null>(null);

  const orderId = activeOrder?.id ? Number(activeOrder.id) : null;

  const { data: messagesData } = useQuery(GET_MESSAGES, {
    variables: { orderRealtimeId: orderId! },
    skip: !orderId,
    fetchPolicy: 'cache-and-network',
  });

  // Populate or merge history when query loads
  useEffect(() => {
    const rawMsgs = (messagesData as any)?.messages;
    if (rawMsgs && Array.isArray(rawMsgs)) {
      setChatMessages((prev) => {
        const serverMsgs: ChatMessageItem[] = rawMsgs.map((msg: any) => ({
          id: msg.id,
          sender: Number(msg.senderId) === Number(realtime?.clientId) ? role : (role === 'client' ? 'provider' : 'client'),
          text: msg.message || '',
          time: new Date(msg.createdAt || Date.now()).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
          isPending: false,
        }));

        const pendingMsgs = prev.filter((m) => m.isPending || (typeof m.id === 'string' && m.id.startsWith('temp-')));
        const existingIds = new Set(serverMsgs.map((m) => String(m.id)));
        const merged = [...serverMsgs];
        for (const pending of pendingMsgs) {
          if (!existingIds.has(String(pending.id))) {
            merged.push(pending);
          }
        }
        return merged;
      });
    }
  }, [messagesData, realtime?.clientId, role]);

  useEffect(() => {
    if (!orderId || !realtime?.subscribe) return;

    if (realtime.joinChat) {
      realtime.joinChat(orderId);
    }

    const handler = (msg: any) => {
      if (msg?.orderRealtimeId && Number(msg.orderRealtimeId) !== orderId) return;

      setChatMessages((prev) => {
        // 1. If message with this exact server ID already exists, do nothing
        if (prev.some((m) => String(m.id) === String(msg.id))) {
          return prev;
        }

        const isMe = Number(msg.senderId) === Number(realtime?.clientId);

        // 2. If it's my message, find the oldest pending optimistic message and reconcile it
        if (isMe) {
          const pendingIdx = prev.findIndex(
            (m) => m.isPending || (typeof m.id === 'string' && m.id.startsWith('temp-'))
          );
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = {
              id: msg.id,
              sender: role,
              text: msg.message || next[pendingIdx].text,
              time: new Date(msg.createdAt || Date.now()).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
              isPending: false,
            };
            return next;
          }
        }

        // 3. Otherwise append new message
        return [
          ...prev,
          {
            id: msg.id || Date.now().toString(),
            sender: isMe ? role : (role === 'client' ? 'provider' : 'client'),
            text: msg.message || '',
            time: new Date(msg.createdAt || Date.now()).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
            isPending: false,
          },
        ];
      });
    };

    const unsubscribe = realtime.subscribe('chat:received', handler);

    return () => {
      unsubscribe();
      if (realtime.leaveChat) {
        realtime.leaveChat(orderId);
      }
    };
  }, [orderId, realtime, role]);

  // Chat sólo disponible entre estados Pagado (ACCEPTED / EN_CAMINO / ARRIVED) e Iniciado (IN_PROGRESS)
  const isChatAvailable = ['ACCEPTED', 'PAID', 'EN_CAMINO', 'ARRIVED', 'IN_PROGRESS'].includes(activeOrder?.status);
  const isNotYetPaid = ['PENDING', 'QUOTED', 'WAITING_CLIENT_RESPONSE', 'WAITING_PROVIDER_RESPONSE'].includes(activeOrder?.status);
  const isTerminal = ['COMPLETED', 'CANCELLED', 'REJECTED', 'EXPIRED'].includes(activeOrder?.status);

  const handleSendMessage = async () => {
    if (!isChatAvailable || !typedMessage.trim() || !activeOrder?.id) return;

    let text = typedMessage.trim();
    if (containsContactInfo(text)) {
      text = maskContactInfo(text);
      setContactWarning(true);
      setTimeout(() => setContactWarning(false), 4000);
    }

    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    setTypedMessage('');

    setChatMessages((prev) => [
      ...prev,
      {
        id: tempId,
        sender: role,
        text,
        time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        isPending: true,
      },
    ]);

    try {
      const result = await realtime.sendMessage(activeOrder.id, text);
      if (result?.id) {
        setChatMessages((prev) => {
          const pendingIdx = prev.findIndex((m) => m.id === tempId);
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = {
              id: result.id,
              sender: role,
              text: result.message || text,
              time: new Date(result.createdAt || Date.now()).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
              isPending: false,
            };
            return next;
          }
          return prev;
        });
      }
    } catch {
      // Revert optimistic message if send completely fails
      setChatMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  return (
    <SafeAreaView style={styles.chatOverlay}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={CHAT_KEYBOARD_VERTICAL_OFFSET}
      >
        <View style={styles.chatHeader}>
          <IconButton
            icon="ArrowLeft"
            size="md"
            variant="ghost"
            accessibilityLabel="Volver"
            onPress={onClose}
            style={styles.chatBackBtn}
          />
          <Avatar uri={chatUser?.avatar} name={chatUser?.name || chatUser?.displayName} size={36} />
          <Text style={styles.chatHeaderTitle}>{chatUser?.name || chatUser?.displayName}</Text>
        </View>

        <ScrollView
          ref={chatScrollRef}
          contentContainerStyle={styles.chatScroll}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
        >
          {chatMessages.map((msg) => {
            const isMe = msg.sender === role;
            return (
              <View
                key={String(msg.id)}
                style={[
                  styles.chatBubbleContainer,
                  isMe ? styles.chatBubbleContainerMe : styles.chatBubbleContainerThem,
                ]}
              >
                <View
                  style={[
                    styles.chatBubble,
                    isMe ? styles.chatBubbleMe : styles.chatBubbleThem,
                    msg.isPending && styles.chatBubblePending,
                  ]}
                >
                  <Text style={isMe ? styles.chatBubbleTextMe : styles.chatBubbleTextThem}>
                    {msg.text}
                  </Text>
                  <Text style={isMe ? styles.chatBubbleTimeMe : styles.chatBubbleTimeThem}>
                    {msg.time}
                  </Text>
                </View>
              </View>
            );
          })}
        </ScrollView>

        {contactWarning && (
          <View style={styles.warningBanner}>
            <Icon name="ShieldAlert" size={14} color={TOKENS.colors.warning600} />
            <Text style={styles.warningBannerText}>
              Por seguridad y protección de garantía, la información de contacto externa es protegida.
            </Text>
          </View>
        )}

        {isTerminal ? (
          <View style={styles.chatClosedBar}>
            <Icon name="Lock" size={16} color={TOKENS.colors.textSubtle} />
            <Text style={styles.chatClosedText}>Servicio finalizado • Chat cerrado</Text>
          </View>
        ) : isNotYetPaid ? (
          <View style={styles.chatClosedBar}>
            <Icon name="Info" size={16} color={TOKENS.colors.brand600} />
            <Text style={styles.chatClosedText}>
              El chat se habilita una vez pagado el servicio y mientras esté en curso.
            </Text>
          </View>
        ) : (
          <View style={styles.chatInputBar}>
            <TextInput
              placeholder="Escribe un mensaje aquí..."
              placeholderTextColor={TOKENS.colors.textMuted}
              value={typedMessage}
              onChangeText={setTypedMessage}
              onFocus={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
              returnKeyType="send"
              onSubmitEditing={handleSendMessage}
              style={styles.chatInput}
            />
            <IconButton
              icon="Send"
              size="md"
              variant="primary"
              accessibilityLabel="Enviar mensaje"
              onPress={handleSendMessage}
              style={styles.chatSendBtn}
            />
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
});

const styles = StyleSheet.create({
  chatOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: TOKENS.colors.white,
    zIndex: 100,
  },
  chatHeader: {
    height: 56,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    gap: 8,
  },
  chatBackBtn: {
    padding: TOKENS.spacing.xs,
    marginRight: 4,
  },
  chatHeaderTitle: {
    fontSize: TOKENS.typography.sizes.md,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.textMain,
  },
  chatScroll: {
    padding: TOKENS.spacing.md,
    gap: 12,
  },
  chatBubbleContainer: {
    width: '100%',
    flexDirection: 'row',
  },
  chatBubbleContainerMe: {
    justifyContent: 'flex-end',
  },
  chatBubbleContainerThem: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '75%',
    padding: 12,
    borderRadius: 16,
  },
  chatBubbleMe: {
    backgroundColor: TOKENS.colors.brand500,
    borderTopRightRadius: 4,
  },
  chatBubbleThem: {
    backgroundColor: TOKENS.colors.surface100,
    borderTopLeftRadius: 4,
  },
  chatBubblePending: {
    opacity: 0.85,
  },
  chatBubbleTextMe: {
    color: TOKENS.colors.white,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
  },
  chatBubbleTextThem: {
    color: TOKENS.colors.textMain,
    fontSize: TOKENS.typography.sizes.sm,
    fontWeight: TOKENS.typography.weights.medium,
  },
  chatBubbleTimeMe: {
    fontSize: 9,
    color: 'rgba(255, 255, 255, 0.7)',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: 'bold',
  },
  chatBubbleTimeThem: {
    fontSize: 9,
    color: TOKENS.colors.textMuted,
    alignSelf: 'flex-end',
    marginTop: 4,
    fontWeight: 'bold',
  },
  chatInputBar: {
    height: 60,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: TOKENS.spacing.md,
    paddingBottom: 10,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    height: 40,
    backgroundColor: TOKENS.colors.surface100,
    borderRadius: 20,
    paddingHorizontal: 16,
    color: TOKENS.colors.textMain,
    fontSize: TOKENS.typography.sizes.sm,
  },
  chatSendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: TOKENS.colors.brand700,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatClosedBar: {
    height: 56,
    borderTopWidth: 1,
    borderTopColor: TOKENS.colors.surface200,
    backgroundColor: TOKENS.colors.surface50,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: TOKENS.spacing.md,
  },
  chatClosedText: {
    fontSize: TOKENS.typography.sizes.xs,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.bold,
  },
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: TOKENS.colors.warning50,
    borderTopWidth: 1,
    borderColor: TOKENS.colors.warning200,
    paddingHorizontal: TOKENS.spacing.md,
    paddingVertical: 6,
    gap: 6,
  },
  warningBannerText: {
    flex: 1,
    fontSize: 10,
    color: TOKENS.colors.warning700,
    fontWeight: '500',
  },
});
