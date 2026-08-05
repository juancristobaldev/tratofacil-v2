import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { TOKENS } from '../../../theme';
import { Icon, Avatar } from '../../../components/ui';

interface FocusChatOverlayProps {
  chatUser: any;
  activeOrder: any;
  realtime: any;
  role: 'client' | 'provider';
  onClose: () => void;
}

export const FocusChatOverlay: React.FC<FocusChatOverlayProps> = React.memo(({ chatUser, activeOrder, realtime, role, onClose }) => {
  const [chatMessages, setChatMessages] = useState<any[]>([]);
  const [typedMessage, setTypedMessage] = useState('');
  const chatScrollRef = useRef<ScrollView | null>(null);

  useEffect(() => {
    const orderId = activeOrder?.id;
    if (!orderId) return;
    const socket = (realtime as any).socketRef?.current;
    if (!socket) return;

    const handler = (msg: any) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, {
          id: msg.id || Date.now().toString(),
          sender: msg.senderId === realtime.clientId ? role : (role === 'client' ? 'provider' : 'client'),
          text: msg.message || '',
          time: new Date(msg.createdAt || Date.now()).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
        }];
      });
    };
    socket.on('chat:received', handler);
    return () => { socket.off('chat:received', handler); };
  }, [activeOrder?.id, realtime.clientId]);

  const handleSendMessage = () => {
    if (!typedMessage.trim() || !activeOrder?.id) return;
    const text = typedMessage;
    setTypedMessage('');
    setChatMessages((prev) => [...prev, {
      id: Date.now().toString(), sender: role, text,
      time: new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }),
    }]);
    realtime.sendMessage(activeOrder.id, text).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.chatOverlay}>
      <View style={styles.chatHeader}>
        <TouchableOpacity onPress={onClose} style={styles.chatBackBtn}>
          <Icon name="ArrowLeft" size={24} color={TOKENS.colors.textMain} />
        </TouchableOpacity>
        <Avatar uri={chatUser?.avatar} name={chatUser?.name || chatUser?.displayName} size={36} />
        <Text style={styles.chatHeaderTitle}>{chatUser?.name || chatUser?.displayName}</Text>
      </View>

      <ScrollView
        ref={chatScrollRef}
        contentContainerStyle={styles.chatScroll}
        onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
      >
        {chatMessages.map((msg) => {
          const isMe = msg.sender === role;
          return (
            <View
              key={msg.id}
              style={[
                styles.chatBubbleContainer,
                isMe ? styles.chatBubbleContainerMe : styles.chatBubbleContainerThem,
              ]}
            >
              <View
                style={[
                  styles.chatBubble,
                  isMe ? styles.chatBubbleMe : styles.chatBubbleThem,
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

      <View style={styles.chatInputBar}>
        <TextInput
          placeholder="Escribe un mensaje aquí..."
          placeholderTextColor={TOKENS.colors.textMuted}
          value={typedMessage}
          onChangeText={setTypedMessage}
          style={styles.chatInput}
        />
        <TouchableOpacity onPress={handleSendMessage} style={styles.chatSendBtn}>
          <Icon name="Send" size={18} color={TOKENS.colors.white} />
        </TouchableOpacity>
      </View>
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
});
