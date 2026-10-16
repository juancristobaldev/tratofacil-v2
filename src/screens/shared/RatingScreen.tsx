import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  Image,
  Pressable,
  TouchableOpacity,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Rating } from '../../components/ui';
import { useRole } from '../../context/RoleContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useJobs } from '../../hooks/useJobs';
import { containsContactInfo, maskContactInfo } from '../../utils/sanitizer';
import { getKeyboardVerticalOffset } from '../../utils/layoutMetrics';

export const RatingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { role: userRole } = useRole();
  const {
    createProviderReview,
    createClientReview,
    markOrderReviewed,
    resetOrderSession,
    clientOrders,
    providerOrders,
    localActiveOrder,
    activeOrder,
  } = useRealtime();
  const { reviewJob } = useJobs();

  const {
    role = 'client',
    targetUser = {},
    serviceDetails = '',
    amount = 0,
    address = '',
    paymentMethod = '-',
    orderRealtimeId,
    providerId,
    clientId,
    orderJobId: rawOrderJobId,
    jobId,
    workerId,
  } = route.params || {};

  const orderJobId = rawOrderJobId ?? jobId;
  const effectiveOrderRealtimeId = orderRealtimeId ? Number(orderRealtimeId) : undefined;

  const effectiveProviderId = React.useMemo(() => {
    if (providerId) return Number(providerId);
    if (route.params?.providerId) return Number(route.params.providerId);
    if (route.params?.targetUser?.id) return Number(route.params.targetUser.id);
    if (effectiveOrderRealtimeId && clientOrders?.length) {
      const matched = clientOrders.find((o: any) => o.id === effectiveOrderRealtimeId);
      if (matched?.provider?.id) return Number(matched.provider.id);
      if (matched?.providerId) return Number(matched.providerId);
    }
    if (localActiveOrder) {
      if (localActiveOrder.provider?.id) return Number(localActiveOrder.provider.id);
      if (localActiveOrder.providerId) return Number(localActiveOrder.providerId);
    }
    if (activeOrder) {
      if (activeOrder.provider?.id) return Number(activeOrder.provider.id);
      if (activeOrder.providerId) return Number(activeOrder.providerId);
    }
    return undefined;
  }, [providerId, route.params, effectiveOrderRealtimeId, clientOrders, localActiveOrder, activeOrder]);

  const effectiveClientId = React.useMemo(() => {
    if (clientId) return Number(clientId);
    if (route.params?.clientId) return Number(route.params.clientId);
    if (route.params?.targetUser?.id) return Number(route.params.targetUser.id);
    if (effectiveOrderRealtimeId && providerOrders?.length) {
      const matched = providerOrders.find((o: any) => o.id === effectiveOrderRealtimeId);
      if (matched?.client?.id) return Number(matched.client.id);
      if (matched?.clientId) return Number(matched.clientId);
    }
    return undefined;
  }, [clientId, route.params, effectiveOrderRealtimeId, providerOrders]);

  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleDismissOrSkip = React.useCallback(() => {
    if (effectiveOrderRealtimeId) {
      markOrderReviewed?.(effectiveOrderRealtimeId);
      resetOrderSession?.(effectiveOrderRealtimeId);
    } else {
      resetOrderSession?.();
    }
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
    }
  }, [effectiveOrderRealtimeId, markOrderReviewed, resetOrderSession, navigation]);

  useEffect(() => {
    const backAction = () => {
      handleDismissOrSkip();
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [handleDismissOrSkip]);

  const isFormValid = reviewComment.trim().length > 0;

  const handleSubmit = async () => {
    if (submitting || isSubmittingRef.current || !isFormValid) return;
    isSubmittingRef.current = true;
    setSubmitting(true);
    let comment = reviewComment.trim();
    if (containsContactInfo(comment)) {
      comment = maskContactInfo(comment);
    }

    try {
      if (role === 'client' && effectiveOrderRealtimeId && effectiveProviderId) {
        await createProviderReview({
          rating: selectedRating,
          comment,
          orderRealtimeId: effectiveOrderRealtimeId,
          providerId: effectiveProviderId,
        });
      } else if (role === 'provider' && effectiveOrderRealtimeId && effectiveClientId) {
        await createClientReview({
          rating: selectedRating,
          comment,
          orderRealtimeId: effectiveOrderRealtimeId,
          clientId: effectiveClientId,
        });
      } else if (role === 'client' && orderJobId && workerId) {
        await reviewJob({
          rating: selectedRating,
          comment,
          orderJobId,
          workerId,
        });
      }
    } catch (_err) {
      // Best-effort submission
    } finally {
      if (effectiveOrderRealtimeId) {
        markOrderReviewed?.(effectiveOrderRealtimeId);
        resetOrderSession?.(effectiveOrderRealtimeId);
      }
      setSubmitting(false);
    }
    if (orderJobId) {
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
      return;
    }
    navigation.replace('ServiceSuccess');
  };

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={getKeyboardVerticalOffset(false, insets.top)}
      >
        <ScrollView
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 24) + 80 }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Top Success Hero */}
          <View style={styles.heroBox}>
            <View style={styles.heroIconCircle}>
              <Icon name="CheckCircle" size={32} color={TOKENS.colors.brand500} />
            </View>
            <Text style={styles.heroTitle}>¡Servicio Finalizado!</Text>
            <Text style={styles.heroSub}>Tu opinión es importante para la comunidad</Text>
          </View>

          {/* Rating & Mandatory Review Form Card (Fondo Negro Exclusivo) */}
          <View style={styles.reviewCard}>
            {targetUser.avatar ? (
              <View style={styles.targetUserRow}>
                <Image source={{ uri: targetUser.avatar }} style={styles.targetAvatar} />
                <View style={styles.targetUserInfo}>
                  <Text style={styles.targetUserName}>{targetUser.name}</Text>
                  {targetUser.subtext ? (
                    <Text style={styles.targetUserSub}>{targetUser.subtext}</Text>
                  ) : null}
                </View>
              </View>
            ) : (
              <Text style={styles.reviewCardTitle}>
                Califica a {targetUser.name || (role === 'client' ? 'Profesional' : 'Cliente')}
              </Text>
            )}

            <View style={styles.starRatingGroup}>
              <Rating
                rating={selectedRating}
                onRatingChange={setSelectedRating}
                size={38}
              />
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                placeholder="Escribe tu reseña sobre el servicio aquí (obligatorio)..."
                placeholderTextColor={TOKENS.colors.textSubtle}
                value={reviewComment}
                onChangeText={setReviewComment}
                multiline
                numberOfLines={4}
                style={styles.reviewTextarea}
              />
              <View style={styles.helperRow}>
                {reviewComment.trim().length === 0 ? (
                  <Text style={styles.requiredHelperText}>* La reseña escrita es obligatoria</Text>
                ) : (
                  <Text style={styles.charCountText}>{reviewComment.trim().length} caracteres</Text>
                )}
              </View>
            </View>
          </View>

          {/* Submit Button (Punto 8: sólo se habilita con reseña escrita) */}
          <View style={styles.actionStack}>
            <Button
              title={submitting ? 'Enviando...' : 'Enviar reseña'}
              icon={submitting ? undefined : 'Send'}
              onPress={handleSubmit}
              disabled={submitting || !isFormValid}
              size="lg"
              style={[
                styles.submitBtn,
                isFormValid && styles.submitBtnActive,
              ]}
            />
            {!isFormValid && (
              <Text style={styles.disabledActionHint}>
                Escribe un breve comentario para habilitar el envío
              </Text>
            )}
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Calificar más tarde"
              onPress={handleDismissOrSkip}
              disabled={submitting}
              style={styles.skipBtn}
            >
              <Text style={styles.skipBtnText}>Calificar más tarde</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: TOKENS.spacing.lg,
    gap: TOKENS.spacing.lg,
  },

  // Hero
  heroBox: {
    alignItems: 'center',
    paddingVertical: TOKENS.spacing.md,
  },
  heroIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: TOKENS.colors.brand100,
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.medium,
    color: TOKENS.colors.textSubtle,
    marginTop: 4,
    textAlign: 'center',
  },

  // Review Form Card (Fondo Dark Surface)
  reviewCard: {
    backgroundColor: TOKENS.colors.dark900,
    borderRadius: 24,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: TOKENS.colors.dark800,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 4,
  },
  targetUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.dark800,
  },
  targetAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: TOKENS.colors.dark800,
  },
  targetUserInfo: {
    flex: 1,
  },
  targetUserName: {
    fontSize: 16,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.white,
  },
  targetUserSub: {
    fontSize: 12,
    color: '#9E9FA8',
    marginTop: 2,
  },
  reviewCardTitle: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#FFFFFF',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  starRatingGroup: {
    alignSelf: 'center',
    marginVertical: 16,
  },
  inputWrap: {
    gap: 6,
  },
  reviewTextarea: {
    backgroundColor: '#1A1C26',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2D3042',
    padding: 14,
    fontSize: 14,
    color: '#FFFFFF',
    height: 110,
    textAlignVertical: 'top',
  },
  helperRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 2,
  },
  requiredHelperText: {
    fontSize: 11,
    color: TOKENS.colors.brand400,
    fontWeight: TOKENS.typography.weights.medium,
  },
  charCountText: {
    fontSize: 11,
    color: '#8A8D9E',
    fontWeight: TOKENS.typography.weights.medium,
  },

  // Action Stack
  actionStack: {
    marginTop: 4,
    width: '100%',
    alignItems: 'center',
  },
  submitBtn: {
    width: '100%',
    minHeight: 56,
    borderRadius: 20,
  },
  submitBtnActive: {
    shadowColor: TOKENS.colors.brand500,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 6,
  },
  disabledActionHint: {
    fontSize: 12,
    color: TOKENS.colors.textMuted,
    fontWeight: TOKENS.typography.weights.medium,
    marginTop: 8,
    textAlign: 'center',
  },
  skipBtn: {
    marginTop: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipBtnText: {
    fontSize: 14,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
});
