import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { TOKENS } from '../../theme';
import { Icon, Button, Rating } from '../../components/ui';
import { useRole } from '../../context/RoleContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useJobs } from '../../hooks/useJobs';
import { containsContactInfo, maskContactInfo } from '../../utils/sanitizer';

export const RatingScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { role: userRole } = useRole();
  const { createProviderReview, createClientReview } = useRealtime();
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
    jobId,
    workerId,
  } = route.params || {};

  const [selectedRating, setSelectedRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const backAction = () => true;
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const isFormValid = reviewComment.trim().length > 0;

  const handleSubmit = async () => {
    if (submitting || !isFormValid) return;
    setSubmitting(true);
    let comment = reviewComment.trim();
    if (containsContactInfo(comment)) {
      comment = maskContactInfo(comment);
    }

    try {
      if (role === 'client' && orderRealtimeId && providerId) {
        await createProviderReview({
          rating: selectedRating,
          comment,
          orderRealtimeId,
          providerId,
        });
      } else if (role === 'provider' && orderRealtimeId && clientId) {
        await createClientReview({
          rating: selectedRating,
          comment,
          orderRealtimeId,
          clientId,
        });
      } else if (role === 'client' && jobId && workerId) {
        await reviewJob({
          rating: selectedRating,
          comment,
          jobId,
          workerId,
        });
      }
    } catch (_err) {
      // Best-effort submission
    } finally {
      setSubmitting(false);
    }
    if (jobId) {
      navigation.reset({ index: 0, routes: [{ name: 'MainApp' }] });
      return;
    }
    navigation.navigate('ServiceSuccess');
  };

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
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
              placeholderTextColor="#6E7187"
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
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: TOKENS.colors.surface50,
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

  // Review Form Card (Fondo Negro / Dark Surface Exclusivo)
  reviewCard: {
    backgroundColor: '#111218',
    borderRadius: 24,
    padding: TOKENS.spacing.lg,
    borderWidth: 1,
    borderColor: '#252838',
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
    borderBottomColor: '#222533',
  },
  targetAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#262938',
  },
  targetUserInfo: {
    flex: 1,
  },
  targetUserName: {
    fontSize: 16,
    fontWeight: TOKENS.typography.weights.bold,
    color: '#FFFFFF',
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
});
