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
import { Icon, Button, Card, Rating } from '../../components/ui';
import { useRole } from '../../context/RoleContext';
import { useRealtime } from '../../realtime/RealtimeContext';
import { useJobs } from '../../hooks/useJobs';

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
    const backAction = () => {
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      if (role === 'client' && orderRealtimeId && providerId) {
        await createProviderReview({
          rating: selectedRating,
          comment: reviewComment || undefined,
          orderRealtimeId,
          providerId,
        });
      } else if (role === 'provider' && orderRealtimeId && clientId) {
        await createClientReview({
          rating: selectedRating,
          comment: reviewComment || undefined,
          orderRealtimeId,
          clientId,
        });
      } else if (role === 'client' && jobId && workerId) {
        await reviewJob({
          rating: selectedRating,
          comment: reviewComment || undefined,
          jobId,
          workerId,
        });
      }
    } catch (_err) {
      // Review submission is best-effort, don't block the flow
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
    <View style={[styles.container, { paddingBottom: insets.bottom + 16 }]}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Top Success Hero */}
        <View style={styles.heroBox}>
          <View style={styles.heroIconCircle}>
            <Icon name="CheckCircle" size={32} color={TOKENS.colors.brand500} />
          </View>
          <Text style={styles.heroTitle}>¡Trabajo Terminado!</Text>
          <Text style={styles.heroSub}>Servicio completado con éxito</Text>
        </View>

        {/* Rating & Review Card */}
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
              Califica a {targetUser.name || 'Profesional'}
            </Text>
          )}

          <View style={styles.starRatingGroup}>
            <Rating
              rating={selectedRating}
              onRatingChange={setSelectedRating}
              size={38}
            />
          </View>

          <TextInput
            placeholder="Cuéntanos tu experiencia..."
            placeholderTextColor={TOKENS.colors.textMuted}
            value={reviewComment}
            onChangeText={setReviewComment}
            multiline
            numberOfLines={3}
            style={styles.reviewTextarea}
          />
        </View>

        {/* Service & Payment Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryHeader}>
            <View style={styles.summaryHeaderLeft}>
              <Text style={styles.summaryAddress} numberOfLines={1}>
                {address || 'Dirección acordada'}
              </Text>
              {serviceDetails ? (
                <Text style={styles.summaryService} numberOfLines={2}>
                  {serviceDetails}
                </Text>
              ) : null}
            </View>
            <View style={styles.summaryIconWrap}>
              <Icon name="MapPin" size={18} color={TOKENS.colors.brand500} />
            </View>
          </View>

          <View style={styles.summaryFooter}>
            <View>
              <Text style={styles.summaryTotalLabel}>Total pagado</Text>
              <Text style={styles.summaryPaymentMethod}>
                {paymentMethod !== '-' ? `Método: ${paymentMethod}` : 'En efectivo / acordado'}
              </Text>
            </View>
            <Text style={styles.summaryTotalPrice}>
              ${amount > 0 ? amount.toLocaleString('es-CL') : '0'}
            </Text>
          </View>
        </View>

        {/* Action Buttons Stack */}
        <View style={styles.actionStack}>
          <Button
            title={submitting ? 'Enviando...' : 'Enviar calificación'}
            onPress={handleSubmit}
            disabled={submitting}
            size="lg"
            style={styles.submitBtn}
          />

          <Button
            title="¿Necesitas ayuda con este servicio?"
            variant="ghost"
            size="sm"
            icon="HelpCircle"
            onPress={() => navigation.navigate('Support')}
            textStyle={styles.supportBtnText}
          />
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
    padding: TOKENS.spacing.md,
    gap: TOKENS.spacing.md,
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
    backgroundColor: TOKENS.colors.brand100,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.dark900,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontSize: 13,
    fontWeight: '500',
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },

  // Review Card
  reviewCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    padding: TOKENS.spacing.md,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    ...TOKENS.shadows.soft,
  },
  targetUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  targetAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: TOKENS.colors.surface100,
  },
  targetUserInfo: {
    flex: 1,
  },
  targetUserName: {
    fontSize: 15,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
  },
  targetUserSub: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    marginTop: 1,
  },
  reviewCardTitle: {
    fontSize: 14,
    fontWeight: TOKENS.typography.weights.bold,
    color: TOKENS.colors.dark900,
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  starRatingGroup: {
    alignSelf: 'center',
    marginVertical: 12,
  },
  reviewTextarea: {
    backgroundColor: TOKENS.colors.surface50,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    padding: 12,
    fontSize: 13,
    color: TOKENS.colors.textMain,
    height: 84,
    textAlignVertical: 'top',
  },

  // Summary Card
  summaryCard: {
    backgroundColor: TOKENS.colors.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: TOKENS.colors.surface200,
    overflow: 'hidden',
    ...TOKENS.shadows.soft,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: TOKENS.colors.surface100,
  },
  summaryHeaderLeft: {
    flex: 1,
    paddingRight: 8,
  },
  summaryAddress: {
    fontSize: 13,
    fontWeight: '700',
    color: TOKENS.colors.dark900,
  },
  summaryService: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  summaryIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: TOKENS.colors.brand50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  summaryFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: TOKENS.colors.surface50,
  },
  summaryTotalLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: TOKENS.colors.dark900,
  },
  summaryPaymentMethod: {
    fontSize: 11,
    color: TOKENS.colors.textSubtle,
    marginTop: 2,
  },
  summaryTotalPrice: {
    fontSize: 22,
    fontWeight: TOKENS.typography.weights.black,
    color: TOKENS.colors.brand600,
    letterSpacing: -0.5,
  },

  // Action Stack
  actionStack: {
    gap: 8,
    marginTop: 6,
    width: '100%',
  },
  submitBtn: {
    width: '100%',
  },
  supportBtnText: {
    fontSize: 12,
    color: TOKENS.colors.textSubtle,
    fontWeight: TOKENS.typography.weights.medium,
  },
});
